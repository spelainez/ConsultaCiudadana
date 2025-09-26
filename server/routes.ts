import type { Express } from "express";
import { createServer, type Server } from "http";
import rateLimit from "express-rate-limit";
import {
  setupAuth,
  requireAuth,
  requireRole,
  hashPassword,
  comparePasswords,
} from "./auth";
import { storage } from "./storage";
import {
  insertConsultationSchema,
  insertSectorSchema,
  insertUserSchema,
} from "@shared/schema";
import * as XLSX from "xlsx";
import multer from "multer";
import fs from "fs";
import path from "path";
import { fileTypeFromBuffer } from "file-type";
import sharp from "sharp";

export async function registerRoutes(app: Express): Promise<Server> {
  // Autenticación base (para endpoints protegidos)
  setupAuth(app);

  // Rate limiting general para subida de imágenes
  const imageUploadLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: "Demasiadas subidas de imágenes. Inténtalo más tarde.",
  });

  // Multer en memoria + validaciones
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 15 * 1024 * 1024, // 15MB por archivo
      files: 3, // máximo 3 archivos
    },
    fileFilter: (req, file, cb) => {
      const allowedMimes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
      if (allowedMimes.includes(file.mimetype.toLowerCase())) {
        cb(null, true);
      } else {
        cb(new Error("Solo se permiten imágenes JPEG, PNG o WebP"));
      }
    },
  });

  // Rate limit para creación de usuarios
  const userCreationLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 3,
    message: {
      error: "Demasiados intentos de creación de usuarios. Intente nuevamente en 15 minutos.",
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
  });

  // ===================== Ubicación =====================
  app.get("/api/departments", async (_req, res) => {
    try {
      const departments = await storage.getDepartments();
      res.json(departments);
    } catch (error) {
      console.error("Error fetching departments:", error);
      res.status(500).json({ error: "Failed to fetch departments" });
    }
  });

  app.get("/api/municipalities/:departmentId", async (req, res) => {
    try {
      const municipalities = await storage.getMunicipalitiesByDepartment(
        req.params.departmentId
      );
      res.json(municipalities);
    } catch (error) {
      console.error("Error fetching municipalities:", error);
      res.status(500).json({ error: "Failed to fetch municipalities" });
    }
  });

  app.get("/api/localities/:municipalityId", async (req, res) => {
    try {
      const localities = await storage.getLocalitiesByMunicipality(
        req.params.municipalityId
      );
      res.json(localities);
    } catch (error) {
      console.error("Error fetching localities:", error);
      res.status(500).json({ error: "Failed to fetch localities" });
    }
  });

  // ===================== Sectores =====================
  app.get("/api/sectors", async (_req, res) => {
    try {
      const sectors = await storage.getSectors();
      res.json(sectors);
    } catch (error) {
      console.error("Error fetching sectors:", error);
      res.status(500).json({ error: "Failed to fetch sectors" });
    }
  });

  app.get("/api/sectors/search", async (req, res) => {
    try {
      const query = req.query.q as string;
      if (!query) return res.json([]);
      const sectors = await storage.searchSectors(query);
      res.json(sectors);
    } catch (error) {
      console.error("Error searching sectors:", error);
      res.status(500).json({ error: "Failed to search sectors" });
    }
  });

  // ===================== Subida de imágenes (PÚBLICO) =====================
  app.post(
    "/api/upload-images",
    imageUploadLimiter,
    // handler de errores de multer para devolver 4xx legible
    (req, res, next) => {
      upload.array("images", 3)(req, res, (err: any) => {
        if (err) {
          if (err.code === "LIMIT_FILE_SIZE") {
            return res.status(400).json({ error: "El archivo excede el límite de 15 MB" });
          }
          if (err.code === "LIMIT_UNEXPECTED_FILE") {
            return res.status(400).json({ error: "Se excedió el máximo de 3 imágenes" });
          }
          return res.status(400).json({ error: err.message || "Archivo inválido" });
        }
        next();
      });
    },
    async (req, res) => {
      try {
        if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
          return res.status(400).json({ error: "No se proporcionaron imágenes" });
        }

        const privateDir = process.env.PRIVATE_OBJECT_DIR;
        if (!privateDir) {
          return res
            .status(500)
            .json({ error: "Configuración de almacenamiento no disponible" });
        }

        const imageUrls: string[] = [];
        const timestamp = Date.now();

        for (const file of req.files as Express.Multer.File[]) {
          const fileType = await fileTypeFromBuffer(file.buffer);
          const allowedTypes = ["jpg", "jpeg", "png", "webp"];
          if (!fileType || !allowedTypes.includes(fileType.ext)) {
            return res
              .status(400)
              .json({ error: "Tipo de archivo inválido. Solo JPEG, PNG o WebP permitidos." });
          }

          // Validar que realmente se puede decodificar
          await sharp(file.buffer).metadata();

          // Guardamos SIEMPRE como JPG optimizado
          const uniqueFilename = `consultation-${timestamp}-${Math.random()
            .toString(36)
            .slice(2)}.jpg`;
          const filePath = path.join(privateDir, "images", uniqueFilename);
          await fs.promises.mkdir(path.dirname(filePath), { recursive: true });

          const optimizedBuffer = await sharp(file.buffer)
            .resize(1920, 1080, { fit: "inside", withoutEnlargement: true })
            .jpeg({ quality: 85 })
            .toBuffer();

          await fs.promises.writeFile(filePath, optimizedBuffer);
          imageUrls.push(`/api/images/${uniqueFilename}`);
        }

        res.status(201).json({ success: true, imageUrls });
      } catch (error) {
        console.error("Error uploading images:", error);
        res.status(500).json({ error: "Error al subir las imágenes" });
      }
    }
  );

  // Servir imágenes guardadas
  app.get("/api/images/:filename", async (req, res) => {
    try {
      const filename = req.params.filename;
      // solo .jpg porque guardamos en .jpg
      const filenamePattern = /^consultation-\d+-[a-z0-9]+\.jpg$/i;
      if (!filenamePattern.test(filename)) {
        return res.status(400).json({ error: "Nombre de archivo inválido" });
      }

      const privateDir = process.env.PRIVATE_OBJECT_DIR;
      if (!privateDir) {
        return res
          .status(500)
          .json({ error: "Configuración de almacenamiento no disponible" });
      }

      const filePath = path.join(privateDir, "images", filename);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: "Imagen no encontrada" });
      }

      res.set({
        "Content-Type": "image/jpeg",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "public, max-age=31536000",
      });
      res.sendFile(path.resolve(filePath));
    } catch (error) {
      console.error("Error serving image:", error);
      res.status(500).json({ error: "Error al servir la imagen" });
    }
  });

  // ===================== Consultas =====================
  app.post("/api/consultations", async (req, res) => {
    try {
      const validatedData = insertConsultationSchema.parse(req.body);
      const consultation = await storage.createConsultation(validatedData);
      res.status(201).json(consultation);
    } catch (error) {
      console.error("Error creating consultation:", error);
      res.status(400).json({ error: "Invalid consultation data" });
    }
  });

  app.get(
    "/api/consultations",
    requireAuth,
    requireRole(["admin", "super_admin"]),
    async (req, res) => {
      try {
        const filters = {
          dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
          dateTo: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined,
          departmentId: req.query.departmentId as string,
          sector: req.query.sector as string,
          offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
          limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
        };

        const result = await storage.getConsultations(filters);
        res.json(result);
      } catch (error) {
        console.error("Error fetching consultations:", error);
        res.status(500).json({ error: "Failed to fetch consultations" });
      }
    }
  );

  app.get(
    "/api/consultations/:id",
    requireAuth,
    requireRole(["admin", "super_admin"]),
    async (req, res) => {
      try {
        const consultation = await storage.getConsultationById(req.params.id);
        if (!consultation) {
          return res.status(404).json({ error: "Consultation not found" });
        }
        res.json(consultation);
      } catch (error) {
        console.error("Error fetching consultation:", error);
        res.status(500).json({ error: "Failed to fetch consultation" });
      }
    }
  );

  // ===================== Dashboard =====================
  app.get(
    "/api/dashboard/stats",
    requireAuth,
    requireRole(["admin", "super_admin"]),
    async (_req, res) => {
      try {
        const stats = await storage.getConsultationStats();
        res.json(stats);
      } catch (error) {
        console.error("Error fetching dashboard stats:", error);
        res.status(500).json({ error: "Failed to fetch dashboard stats" });
      }
    }
  );

  app.get(
    "/api/dashboard/consultations-by-date",
    requireAuth,
    requireRole(["admin", "super_admin"]),
    async (req, res) => {
      try {
        const days = parseInt(req.query.days as string) || 30;
        const data = await storage.getConsultationsByDate(days);
        res.json(data);
      } catch (error) {
        console.error("Error fetching consultations by date:", error);
        res.status(500).json({ error: "Failed to fetch consultations by date" });
      }
    }
  );

  app.get(
    "/api/dashboard/consultations-by-sector",
    requireAuth,
    requireRole(["admin", "super_admin"]),
    async (_req, res) => {
      try {
        const data = await storage.getConsultationsBySector();
        res.json(data);
      } catch (error) {
        console.error("Error fetching consultations by sector:", error);
        res.status(500).json({ error: "Failed to fetch consultations by sector" });
      }
    }
  );

  // ===================== Exportaciones =====================
  app.get(
    "/api/export/consultations/csv",
    requireAuth,
    requireRole(["admin", "super_admin"]),
    async (req, res) => {
      try {
        const filters = {
          dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
          dateTo: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined,
          departmentId: req.query.departmentId as string,
          sector: req.query.sector as string,
        };

        const result = await storage.getConsultations({ ...filters, limit: 10000 });
        const consultations = result.consultations;

        const sanitizeCSVField = (field: string | undefined | null): string => {
          if (!field) return "";
          let sanitized = String(field);
          if (/^[=+\-@]/.test(sanitized)) sanitized = "'" + sanitized;
          sanitized = sanitized.replace(/[\r\n]/g, " ");
          sanitized = '"' + sanitized.replace(/"/g, '""') + '"';
          return sanitized;
        };

        const csvHeaders = [
          "ID",
          "Fecha",
          "Tipo de Persona",
          "Nombre/Empresa",
          "Departamento",
          "Municipio",
          "Colonia/Aldea",
          "Geocódigo",
          "Sectores",
          "Mensaje",
          "Estado",
        ]
          .map((h) => sanitizeCSVField(h))
          .join(",");

        const csvRows = consultations.map((c) =>
          [
            sanitizeCSVField(c.id),
            sanitizeCSVField(new Date(c.createdAt).toLocaleDateString("es-HN")),
            sanitizeCSVField(c.personType === "natural" ? "Natural" : c.personType === "juridica" ? "Jurídica" : "Anónimo"),
            sanitizeCSVField(c.firstName ? `${c.firstName} ${c.lastName}` : c.companyName || "Anónimo"),
            sanitizeCSVField(c.departmentId),
            sanitizeCSVField(c.municipalityId),
            sanitizeCSVField(c.localityId),
            sanitizeCSVField(c.geocode),
            sanitizeCSVField(c.selectedSectors.join("; ")),
            sanitizeCSVField(c.message),
            sanitizeCSVField(c.status === "active" ? "Activa" : "Archivada"),
          ].join(",")
        );

        const csvContent = [csvHeaders, ...csvRows].join("\n");
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="consultas_${new Date().toISOString().split("T")[0]}.csv"`
        );
        res.send("\uFEFF" + csvContent);
      } catch (error) {
        console.error("Error exporting CSV:", error);
        res.status(500).json({ error: "Failed to export CSV" });
      }
    }
  );

  app.get(
    "/api/export/consultations/excel",
    requireAuth,
    requireRole(["admin", "super_admin"]),
    async (req, res) => {
      try {
        const filters = {
          dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
          dateTo: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined,
          departmentId: req.query.departmentId as string,
          sector: req.query.sector as string,
        };

        const result = await storage.getConsultations({ ...filters, limit: 10000 });
        const consultations = result.consultations;

        const sanitizeExcelField = (field: string | undefined | null): string => {
          if (!field) return "";
          let sanitized = String(field);
          if (/^[=+\-@]/.test(sanitized)) sanitized = "'" + sanitized;
          sanitized = sanitized.replace(/[\r\n]/g, " ");
          return sanitized;
        };

        const workbook = XLSX.utils.book_new();
        const worksheetData = [
          [
            "ID",
            "Fecha",
            "Tipo de Persona",
            "Nombre/Empresa",
            "Departamento",
            "Municipio",
            "Colonia/Aldea",
            "Geocódigo",
            "Sectores",
            "Mensaje",
            "Estado",
          ],
          ...consultations.map((c) => [
            sanitizeExcelField(c.id),
            sanitizeExcelField(new Date(c.createdAt).toLocaleDateString("es-HN")),
            sanitizeExcelField(c.personType === "natural" ? "Natural" : c.personType === "juridica" ? "Jurídica" : "Anónimo"),
            sanitizeExcelField(c.firstName ? `${c.firstName} ${c.lastName}` : c.companyName || "Anónimo"),
            sanitizeExcelField(c.departmentId),
            sanitizeExcelField(c.municipalityId),
            sanitizeExcelField(c.localityId),
            sanitizeExcelField(c.geocode),
            sanitizeExcelField(c.selectedSectors.join(", ")),
            sanitizeExcelField(c.message),
            sanitizeExcelField(c.status === "active" ? "Activa" : "Archivada"),
          ]),
        ];

        const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
        worksheet["!cols"] = [
          { width: 10 },
          { width: 12 },
          { width: 15 },
          { width: 20 },
          { width: 15 },
          { width: 15 },
          { width: 15 },
          { width: 15 },
          { width: 25 },
          { width: 50 },
          { width: 10 },
        ];
        XLSX.utils.book_append_sheet(workbook, worksheet, "Consultas");

        const excelBuffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
        res.setHeader(
          "Content-Type",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="consultas_${new Date().toISOString().split("T")[0]}.xlsx"`
        );
        res.send(excelBuffer);
      } catch (error) {
        console.error("Error exporting Excel:", error);
        res.status(500).json({ error: "Failed to export Excel" });
      }
    }
  );

  app.get(
    "/api/export/consultations/pdf",
    requireAuth,
    requireRole(["admin", "super_admin"]),
    async (req, res) => {
      try {
        const filters = {
          dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
          dateTo: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined,
          departmentId: req.query.departmentId as string,
          sector: req.query.sector as string,
        };

        const result = await storage.getConsultations({ ...filters, limit: 10000 });
        const consultations = result.consultations;

        const { jsPDF } = await import("jspdf");
        const { default: autoTable } = await import("jspdf-autotable");

        const doc = new jsPDF();
        doc.setFontSize(16);
        doc.text("Reporte de Consultas Ciudadanas", 14, 22);

        doc.setFontSize(10);
        const dateRange =
          filters.dateFrom && filters.dateTo
            ? `${filters.dateFrom.toLocaleDateString("es-HN")} - ${filters.dateTo.toLocaleDateString("es-HN")}`
            : "Todas las fechas";
        doc.text(`Período: ${dateRange}`, 14, 30);
        doc.text(`Total de consultas: ${consultations.length}`, 14, 36);

        const tableColumns = ["Fecha", "Tipo", "Nombre/Empresa", "Ubicación", "Sectores", "Estado"];
        const tableRows = consultations.map((c) => [
          new Date(c.createdAt).toLocaleDateString("es-HN"),
          c.personType === "natural" ? "Natural" : c.personType === "juridica" ? "Jurídica" : "Anónimo",
          c.firstName ? `${c.firstName} ${c.lastName}` : c.companyName || "Anónimo",
          `${c.departmentId}-${c.municipalityId}`,
          c.selectedSectors.slice(0, 2).join(", ") + (c.selectedSectors.length > 2 ? "..." : ""),
          c.status === "active" ? "Activa" : "Archivada",
        ]);

        autoTable(doc, {
          head: [tableColumns],
          body: tableRows,
          startY: 45,
          styles: { fontSize: 8, cellPadding: 2 },
          headStyles: { fillColor: [27, 209, 232], textColor: [255, 255, 255], fontStyle: "bold" },
          alternateRowStyles: { fillColor: [245, 245, 245] },
          margin: { top: 45, left: 14, right: 14 },
          columnStyles: {
            0: { cellWidth: 25 },
            1: { cellWidth: 20 },
            2: { cellWidth: 35 },
            3: { cellWidth: 25 },
            4: { cellWidth: 35 },
            5: { cellWidth: 20 },
          },
        });

        const pageCount = doc.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
          doc.setPage(i);
          doc.setFontSize(8);
          doc.text(
            `Página ${i} de ${pageCount} - Generado el ${new Date().toLocaleDateString("es-HN")}`,
            14,
            doc.internal.pageSize.height - 10
          );
        }

        const pdfBuffer = Buffer.from(doc.output("arraybuffer"));
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="consultas_${new Date().toISOString().split("T")[0]}.pdf"`
        );
        res.send(pdfBuffer);
      } catch (error) {
        console.error("Error exporting PDF:", error);
        res.status(500).json({ error: "Failed to export PDF" });
      }
    }
  );

  // ===================== Usuarios (solo super_admin) =====================
  app.get("/api/users", requireAuth, requireRole(["super_admin"]), async (_req, res) => {
    try {
      const users = await storage.getUsers();
      const sanitizedUsers = users.map(({ password, ...u }) => u);
      res.json(sanitizedUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.post(
    "/api/users",
    requireAuth,
    requireRole(["super_admin"]),
    userCreationLimiter,
    async (req, res) => {
      try {
        const validatedData = insertUserSchema.parse(req.body);
        const hashedPassword = await hashPassword(validatedData.password);
        const userData = { ...validatedData, password: hashedPassword };
        const user = await storage.createUser(userData);
        const { password, ...userWithoutPassword } = user;
        res.status(201).json(userWithoutPassword);
      } catch (error) {
        console.error("Error creating user:", error);
        if (error instanceof Error && error.message.includes("duplicate key")) {
          res.status(400).json({ error: "El nombre de usuario ya existe" });
        } else {
          res.status(400).json({ error: "Datos de usuario inválidos" });
        }
      }
    }
  );

  app.delete("/api/users/:id", requireAuth, requireRole(["super_admin"]), async (req, res) => {
    try {
      const { id } = req.params;

      if (req.user?.id === id) {
        return res.status(400).json({ error: "No puede eliminar su propia cuenta" });
      }

      const userToDelete = await storage.getUser(id);
      if (!userToDelete) return res.status(404).json({ error: "Usuario no encontrado" });
      if (userToDelete.username === "SPE") {
        return res.status(403).json({ error: "La cuenta SPE está protegida y no puede ser eliminada" });
      }

      const deleted = await storage.deleteUser(id);
      if (!deleted) return res.status(404).json({ error: "Usuario no encontrado" });

      res.json({ message: "Usuario eliminado exitosamente" });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ error: "Failed to delete user" });
    }
  });

  app.put("/api/users/:id/password", requireAuth, requireRole(["super_admin"]), async (req, res) => {
    try {
      const { id } = req.params;
      const { password } = req.body;

      if (!password || password.length < 6) {
        return res.status(400).json({ error: "La contraseña debe tener al menos 6 caracteres" });
      }

      const userToUpdate = await storage.getUser(id);
      if (!userToUpdate) return res.status(404).json({ error: "Usuario no encontrado" });
      if (userToUpdate.username === "SPE") {
        return res.status(403).json({ error: "La cuenta SPE está protegida y no puede ser modificada" });
      }

      const hashedPassword = await hashPassword(password);
      const updated = await storage.updateUserPassword(id, hashedPassword);
      if (!updated) return res.status(404).json({ error: "Usuario no encontrado" });

      res.json({ message: "Contraseña actualizada exitosamente" });
    } catch (error) {
      console.error("Error updating user password:", error);
      res.status(500).json({ error: "Error al actualizar la contraseña" });
    }
  });

  app.put("/api/users/:id/status", requireAuth, requireRole(["super_admin"]), async (req, res) => {
    try {
      const { id } = req.params;
      const { active } = req.body;

      if (typeof active !== "boolean") {
        return res.status(400).json({ error: "El estado debe ser true o false" });
      }

      const userToUpdate = await storage.getUser(id);
      if (!userToUpdate) return res.status(404).json({ error: "Usuario no encontrado" });
      if (userToUpdate.username === "SPE") {
        return res.status(403).json({ error: "La cuenta SPE está protegida y no puede ser modificada" });
      }
      if (req.user?.id === id) {
        return res.status(400).json({ error: "No puede cambiar su propio estado" });
      }

      const updated = await storage.updateUserStatus(id, active);
      if (!updated) return res.status(404).json({ error: "Usuario no encontrado" });

      res.json({ message: `Usuario ${active ? "activado" : "suspendido"} exitosamente`, active });
    } catch (error) {
      console.error("Error updating user status:", error);
      res.status(500).json({ error: "Error al actualizar el estado del usuario" });
    }
  });

  // Cambiar la propia contraseña
  app.put("/api/profile/password", requireAuth, async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: "Se requiere contraseña actual y nueva contraseña" });
      }
      if (newPassword.length < 6) {
        return res
          .status(400)
          .json({ error: "La nueva contraseña debe tener al menos 6 caracteres" });
      }

      const currentUser = await storage.getUser(req.user!.id);
      if (!currentUser) return res.status(404).json({ error: "Usuario no encontrado" });

      const isValidCurrentPassword = await comparePasswords(
        currentPassword,
        currentUser.password
      );
      if (!isValidCurrentPassword) {
        return res.status(401).json({ error: "La contraseña actual es incorrecta" });
      }

      const hashedNewPassword = await hashPassword(newPassword);
      const updated = await storage.updateUserPassword(req.user!.id, hashedNewPassword);
      if (!updated) return res.status(500).json({ error: "Error al actualizar la contraseña" });

      req.session.destroy((err) => {
        if (err) {
          console.error("Error destroying session after password change:", err);
          return res.status(500).json({ error: "Contraseña actualizada pero error en sesión" });
        }
        res.json({ message: "Contraseña actualizada exitosamente", requiresReauth: true });
      });
    } catch (error) {
      console.error("Error updating own password:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  // Admin-only (placeholder)
  app.post("/api/sectors", requireAuth, requireRole(["super_admin"]), async (req, res) => {
    try {
      const validatedData = insertSectorSchema.parse(req.body);
      res.status(501).json({ error: "Not implemented yet" });
    } catch (error) {
      console.error("Error creating sector:", error);
      res.status(400).json({ error: "Invalid sector data" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
