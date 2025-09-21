import type { Express } from "express";
import { createServer, type Server } from "http";
import rateLimit from "express-rate-limit";
import { setupAuth, requireAuth, requireRole, hashPassword } from "./auth";
import { storage } from "./storage";
import { insertConsultationSchema, insertSectorSchema, insertUserSchema } from "@shared/schema";
import * as XLSX from 'xlsx';

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication
  setupAuth(app);

  // Rate limiting for user creation
  const userCreationLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 3, // 3 user creation attempts per window
    message: {
      error: "Demasiados intentos de creación de usuarios. Intente nuevamente en 15 minutos."
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
  });

  // Location endpoints
  app.get("/api/departments", async (req, res) => {
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
      const municipalities = await storage.getMunicipalitiesByDepartment(req.params.departmentId);
      res.json(municipalities);
    } catch (error) {
      console.error("Error fetching municipalities:", error);
      res.status(500).json({ error: "Failed to fetch municipalities" });
    }
  });

  app.get("/api/localities/:municipalityId", async (req, res) => {
    try {
      const localities = await storage.getLocalitiesByMunicipality(req.params.municipalityId);
      res.json(localities);
    } catch (error) {
      console.error("Error fetching localities:", error);
      res.status(500).json({ error: "Failed to fetch localities" });
    }
  });

  // Sector endpoints
  app.get("/api/sectors", async (req, res) => {
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
      if (!query) {
        return res.json([]);
      }
      const sectors = await storage.searchSectors(query);
      res.json(sectors);
    } catch (error) {
      console.error("Error searching sectors:", error);
      res.status(500).json({ error: "Failed to search sectors" });
    }
  });

  // Consultation endpoints
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

  app.get("/api/consultations", requireAuth, requireRole(["admin", "super_admin"]), async (req, res) => {
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
  });

  app.get("/api/consultations/:id", requireAuth, requireRole(["admin", "super_admin"]), async (req, res) => {
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
  });

  // Dashboard endpoints
  app.get("/api/dashboard/stats", requireAuth, requireRole(["admin", "super_admin"]), async (req, res) => {
    try {
      const stats = await storage.getConsultationStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ error: "Failed to fetch dashboard stats" });
    }
  });

  app.get("/api/dashboard/consultations-by-date", requireAuth, requireRole(["admin", "super_admin"]), async (req, res) => {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const data = await storage.getConsultationsByDate(days);
      res.json(data);
    } catch (error) {
      console.error("Error fetching consultations by date:", error);
      res.status(500).json({ error: "Failed to fetch consultations by date" });
    }
  });

  app.get("/api/dashboard/consultations-by-sector", requireAuth, requireRole(["admin", "super_admin"]), async (req, res) => {
    try {
      const data = await storage.getConsultationsBySector();
      res.json(data);
    } catch (error) {
      console.error("Error fetching consultations by sector:", error);
      res.status(500).json({ error: "Failed to fetch consultations by sector" });
    }
  });

  // Export endpoints
  app.get("/api/export/consultations/csv", requireAuth, requireRole(["admin", "super_admin"]), async (req, res) => {
    try {
      const filters = {
        dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
        dateTo: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined,
        departmentId: req.query.departmentId as string,
        sector: req.query.sector as string,
      };

      const result = await storage.getConsultations({ ...filters, limit: 10000 }); // Get all for export
      const consultations = result.consultations;

      // Helper function to sanitize CSV fields and prevent injection
      const sanitizeCSVField = (field: string | undefined | null): string => {
        if (!field) return '';
        
        let sanitized = String(field);
        
        // Prevent CSV injection by sanitizing dangerous characters at start
        if (/^[=+\-@]/.test(sanitized)) {
          sanitized = "'" + sanitized; // Prefix with single quote to neutralize
        }
        
        // Replace newlines with spaces
        sanitized = sanitized.replace(/[\r\n]/g, ' ');
        
        // Escape quotes and wrap in quotes
        sanitized = '"' + sanitized.replace(/"/g, '""') + '"';
        
        return sanitized;
      };

      // Generate CSV content with proper escaping
      const csvHeaders = [
        'ID',
        'Fecha',
        'Tipo de Persona',
        'Nombre/Empresa',
        'Departamento',
        'Municipio',
        'Colonia/Aldea',
        'Geocódigo',
        'Sectores',
        'Mensaje',
        'Estado'
      ].map(h => sanitizeCSVField(h)).join(',');

      const csvRows = consultations.map(consultation => [
        sanitizeCSVField(consultation.id),
        sanitizeCSVField(new Date(consultation.createdAt).toLocaleDateString('es-HN')),
        sanitizeCSVField(consultation.personType === 'natural' ? 'Natural' : 
          consultation.personType === 'juridica' ? 'Jurídica' : 'Anónimo'),
        sanitizeCSVField(consultation.firstName ? `${consultation.firstName} ${consultation.lastName}` : 
          consultation.companyName || 'Anónimo'),
        sanitizeCSVField(consultation.departmentId),
        sanitizeCSVField(consultation.municipalityId),
        sanitizeCSVField(consultation.localityId),
        sanitizeCSVField(consultation.geocode),
        sanitizeCSVField(consultation.selectedSectors.join('; ')),
        sanitizeCSVField(consultation.message),
        sanitizeCSVField(consultation.status === 'active' ? 'Activa' : 'Archivada')
      ].join(','));

      const csvContent = [csvHeaders, ...csvRows].join('\n');

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="consultas_${new Date().toISOString().split('T')[0]}.csv"`);
      res.send('\uFEFF' + csvContent); // Add BOM for proper UTF-8 encoding
    } catch (error) {
      console.error("Error exporting CSV:", error);
      res.status(500).json({ error: "Failed to export CSV" });
    }
  });

  app.get("/api/export/consultations/excel", requireAuth, requireRole(["admin", "super_admin"]), async (req, res) => {
    try {
      const filters = {
        dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
        dateTo: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined,
        departmentId: req.query.departmentId as string,
        sector: req.query.sector as string,
      };

      const result = await storage.getConsultations({ ...filters, limit: 10000 });
      const consultations = result.consultations;

      // Helper function to sanitize Excel fields and prevent injection
      const sanitizeExcelField = (field: string | undefined | null): string => {
        if (!field) return '';
        
        let sanitized = String(field);
        
        // Prevent Excel formula injection by sanitizing dangerous characters at start
        if (/^[=+\-@]/.test(sanitized)) {
          sanitized = "'" + sanitized; // Prefix with single quote to neutralize
        }
        
        // Replace newlines with spaces
        sanitized = sanitized.replace(/[\r\n]/g, ' ');
        
        return sanitized;
      };

      // Create workbook and worksheet
      const workbook = XLSX.utils.book_new();
      
      const worksheetData = [
        ['ID', 'Fecha', 'Tipo de Persona', 'Nombre/Empresa', 'Departamento', 'Municipio', 'Colonia/Aldea', 'Geocódigo', 'Sectores', 'Mensaje', 'Estado'],
        ...consultations.map(consultation => [
          sanitizeExcelField(consultation.id),
          sanitizeExcelField(new Date(consultation.createdAt).toLocaleDateString('es-HN')),
          sanitizeExcelField(consultation.personType === 'natural' ? 'Natural' : 
            consultation.personType === 'juridica' ? 'Jurídica' : 'Anónimo'),
          sanitizeExcelField(consultation.firstName ? `${consultation.firstName} ${consultation.lastName}` : 
            consultation.companyName || 'Anónimo'),
          sanitizeExcelField(consultation.departmentId),
          sanitizeExcelField(consultation.municipalityId),
          sanitizeExcelField(consultation.localityId),
          sanitizeExcelField(consultation.geocode),
          sanitizeExcelField(consultation.selectedSectors.join(', ')),
          sanitizeExcelField(consultation.message),
          sanitizeExcelField(consultation.status === 'active' ? 'Activa' : 'Archivada')
        ])
      ];

      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
      
      // Set column widths
      worksheet['!cols'] = [
        { width: 10 }, // ID
        { width: 12 }, // Fecha
        { width: 15 }, // Tipo
        { width: 20 }, // Nombre
        { width: 15 }, // Departamento
        { width: 15 }, // Municipio
        { width: 15 }, // Colonia
        { width: 15 }, // Geocódigo
        { width: 25 }, // Sectores
        { width: 50 }, // Mensaje
        { width: 10 }, // Estado
      ];

      XLSX.utils.book_append_sheet(workbook, worksheet, 'Consultas');

      // Generate Excel buffer
      const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="consultas_${new Date().toISOString().split('T')[0]}.xlsx"`);
      res.send(excelBuffer);
    } catch (error) {
      console.error("Error exporting Excel:", error);
      res.status(500).json({ error: "Failed to export Excel" });
    }
  });

  app.get("/api/export/consultations/pdf", requireAuth, requireRole(["admin", "super_admin"]), async (req, res) => {
    try {
      const filters = {
        dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
        dateTo: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined,
        departmentId: req.query.departmentId as string,
        sector: req.query.sector as string,
      };

      const result = await storage.getConsultations({ ...filters, limit: 10000 });
      const consultations = result.consultations;

      // Import jsPDF and autoTable properly for ESM
      const { jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');

      const doc = new jsPDF();
      
      // Add title
      doc.setFontSize(16);
      doc.text('Reporte de Consultas Ciudadanas', 14, 22);
      
      // Add subtitle with date range
      doc.setFontSize(10);
      const dateRange = filters.dateFrom && filters.dateTo 
        ? `${filters.dateFrom.toLocaleDateString('es-HN')} - ${filters.dateTo.toLocaleDateString('es-HN')}`
        : 'Todas las fechas';
      doc.text(`Período: ${dateRange}`, 14, 30);
      doc.text(`Total de consultas: ${consultations.length}`, 14, 36);
      
      // Prepare table data
      const tableColumns = [
        'Fecha',
        'Tipo',
        'Nombre/Empresa',
        'Ubicación',
        'Sectores',
        'Estado'
      ];

      const tableRows = consultations.map(consultation => [
        new Date(consultation.createdAt).toLocaleDateString('es-HN'),
        consultation.personType === 'natural' ? 'Natural' : 
        consultation.personType === 'juridica' ? 'Jurídica' : 'Anónimo',
        consultation.firstName ? `${consultation.firstName} ${consultation.lastName}` : 
        consultation.companyName || 'Anónimo',
        `${consultation.departmentId}-${consultation.municipalityId}`,
        consultation.selectedSectors.slice(0, 2).join(', ') + 
        (consultation.selectedSectors.length > 2 ? '...' : ''),
        consultation.status === 'active' ? 'Activa' : 'Archivada'
      ]);

      // Add table using autoTable
      autoTable(doc, {
        head: [tableColumns],
        body: tableRows,
        startY: 45,
        styles: {
          fontSize: 8,
          cellPadding: 2,
        },
        headStyles: {
          fillColor: [27, 209, 232], // Honduras theme color
          textColor: [255, 255, 255],
          fontStyle: 'bold'
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245]
        },
        margin: { top: 45, left: 14, right: 14 },
        columnStyles: {
          0: { cellWidth: 25 }, // Fecha
          1: { cellWidth: 20 }, // Tipo
          2: { cellWidth: 35 }, // Nombre
          3: { cellWidth: 25 }, // Ubicación
          4: { cellWidth: 35 }, // Sectores
          5: { cellWidth: 20 }, // Estado
        }
      });

      // Add footer
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.text(
          `Página ${i} de ${pageCount} - Generado el ${new Date().toLocaleDateString('es-HN')}`,
          14,
          doc.internal.pageSize.height - 10
        );
      }

      const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="consultas_${new Date().toISOString().split('T')[0]}.pdf"`);
      res.send(pdfBuffer);
    } catch (error) {
      console.error("Error exporting PDF:", error);
      res.status(500).json({ error: "Failed to export PDF" });
    }
  });

  // User management endpoints (super_admin only)
  app.get("/api/users", requireAuth, requireRole(["super_admin"]), async (req, res) => {
    try {
      const users = await storage.getUsers();
      // Remove password hashes from response for security
      const sanitizedUsers = users.map(({ password, ...userWithoutPassword }) => userWithoutPassword);
      res.json(sanitizedUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.post("/api/users", requireAuth, requireRole(["super_admin"]), userCreationLimiter, async (req, res) => {
    try {
      const validatedData = insertUserSchema.parse(req.body);
      
      // Hash password before storing
      const hashedPassword = await hashPassword(validatedData.password);
      const userData = {
        ...validatedData,
        password: hashedPassword
      };
      
      const user = await storage.createUser(userData);
      
      // Return user without password
      const { password, ...userWithoutPassword } = user;
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      console.error("Error creating user:", error);
      if (error instanceof Error && error.message.includes('duplicate key')) {
        res.status(400).json({ error: "El nombre de usuario ya existe" });
      } else {
        res.status(400).json({ error: "Datos de usuario inválidos" });
      }
    }
  });

  app.delete("/api/users/:id", requireAuth, requireRole(["super_admin"]), async (req, res) => {
    try {
      const { id } = req.params;
      
      // Prevent deleting own account
      if (req.user?.id === id) {
        return res.status(400).json({ error: "No puede eliminar su propia cuenta" });
      }
      
      // Get user data to check username before deletion
      const userToDelete = await storage.getUser(id);
      if (!userToDelete) {
        return res.status(404).json({ error: "Usuario no encontrado" });
      }
      
      // Prevent deleting the protected SPE account
      if (userToDelete.username === "SPE") {
        return res.status(403).json({ error: "La cuenta SPE está protegida y no puede ser eliminada" });
      }
      
      const deleted = await storage.deleteUser(id);
      if (!deleted) {
        return res.status(404).json({ error: "Usuario no encontrado" });
      }
      
      res.json({ message: "Usuario eliminado exitosamente" });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ error: "Failed to delete user" });
    }
  });

  // Change user password
  app.put("/api/users/:id/password", requireAuth, requireRole(["super_admin"]), async (req, res) => {
    try {
      const { id } = req.params;
      const { password } = req.body;
      
      if (!password || password.length < 6) {
        return res.status(400).json({ error: "La contraseña debe tener al menos 6 caracteres" });
      }
      
      // Get user data to check if user exists
      const userToUpdate = await storage.getUser(id);
      if (!userToUpdate) {
        return res.status(404).json({ error: "Usuario no encontrado" });
      }
      
      // Hash the new password
      const hashedPassword = await hashPassword(password);
      const updated = await storage.updateUserPassword(id, hashedPassword);
      
      if (!updated) {
        return res.status(404).json({ error: "Usuario no encontrado" });
      }
      
      res.json({ message: "Contraseña actualizada exitosamente" });
    } catch (error) {
      console.error("Error updating user password:", error);
      res.status(500).json({ error: "Error al actualizar la contraseña" });
    }
  });

  // Change user status (active/inactive)
  app.put("/api/users/:id/status", requireAuth, requireRole(["super_admin"]), async (req, res) => {
    try {
      const { id } = req.params;
      const { active } = req.body;
      
      if (typeof active !== 'boolean') {
        return res.status(400).json({ error: "El estado debe ser true o false" });
      }
      
      // Get user data to check username before status change
      const userToUpdate = await storage.getUser(id);
      if (!userToUpdate) {
        return res.status(404).json({ error: "Usuario no encontrado" });
      }
      
      // Prevent changing status of the protected SPE account
      if (userToUpdate.username === "SPE") {
        return res.status(403).json({ error: "La cuenta SPE está protegida y no puede ser modificada" });
      }
      
      // Prevent changing own status
      if (req.user?.id === id) {
        return res.status(400).json({ error: "No puede cambiar su propio estado" });
      }
      
      const updated = await storage.updateUserStatus(id, active);
      
      if (!updated) {
        return res.status(404).json({ error: "Usuario no encontrado" });
      }
      
      res.json({ 
        message: `Usuario ${active ? 'activado' : 'suspendido'} exitosamente`,
        active
      });
    } catch (error) {
      console.error("Error updating user status:", error);
      res.status(500).json({ error: "Error al actualizar el estado del usuario" });
    }
  });

  // Admin-only endpoints
  app.post("/api/sectors", requireAuth, requireRole(["super_admin"]), async (req, res) => {
    try {
      const validatedData = insertSectorSchema.parse(req.body);
      // Note: Would need to add createSector method to storage
      res.status(501).json({ error: "Not implemented yet" });
    } catch (error) {
      console.error("Error creating sector:", error);
      res.status(400).json({ error: "Invalid sector data" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
