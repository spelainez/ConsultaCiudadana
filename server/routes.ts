// server/routes.ts
import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import rateLimit from "express-rate-limit";
// import PDFDocument from "pdfkit"; // (opcional: remover si no se usa)
import {
  setupAuth,
  requireAuth,
  requireRole,
  comparePasswords,
} from "./auth";
import { storage } from "./storage";
import {
  insertConsultationSchema,
  insertUserSchema,
  departments,
  municipalities,
  localities,
  consultations,
  multiConsultationSchema,
} from "@shared/schema";
import * as XLSX from "xlsx";
import multer from "multer";
import fs from "fs";
import path from "path";
import { fileTypeFromBuffer } from "file-type";
import sharp from "sharp";
import { pgPool as pool/*, db*/ } from "./db";
import { Router } from "express";
import { customAlphabet } from "nanoid";
import express from "express";

/* =====================================================
   AUTH TOGGLES
===================================================== */
const noAuth: any = (_req: Request, _res: Response, next: any) => next();
const useAuth = process.env.AUTH_DISABLED === "true" ? noAuth : requireAuth;
const useRole = (roles: string[]) =>
  process.env.AUTH_DISABLED === "true" ? noAuth : requireRole(roles);

/* =====================================================
   HELPERS
===================================================== */
const nanoid = customAlphabet("1234567890abcdefghijklmnopqrstuvwxyz", 10);

// Convierte selected_sectors (text[]) a jsonb seguro para jsonb_array_elements_text
const JSON_SECTORS = `COALESCE(to_jsonb(c.selected_sectors), '[]'::jsonb)`;

function normalizeStringArray(maybeArray: unknown): string[] {
  if (Array.isArray(maybeArray)) return maybeArray.map(String).filter(Boolean);
  if (maybeArray == null) return [];
  try {
    const parsed = JSON.parse(String(maybeArray));
    if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
  } catch {
    // si viene como "A;B" o "A,B"
  }
  return String(maybeArray)
    .split(/[;,]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseIntStrict(val: unknown, name = "id") {
  const s = typeof val === "string" ? val : "";
  const n = parseInt(s, 10);
  if (!Number.isInteger(n)) {
    const err: any = new Error(`Parámetro ${name} inválido`);
    err.status = 400;
    throw err;
  }
  return n;
}

function parseDate(val?: string) {
  if (!val) return undefined;
  const d = new Date(val);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

/* =====================================================
   UPLOADS (disco público)
===================================================== */
const UPLOAD_DIR = path.resolve(process.cwd(), "server", "uploadps");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const multerDisk = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${nanoid()}${ext}`);
  },
});
const uploader = multer({
  storage: multerDisk,
  limits: { fileSize: 8 * 1024 * 1024, files: 10 },
});
export const uploadsRouter = Router();

uploadsRouter.post("/image", uploader.single("image"), (req, res) => {
  const f = req.file!;
  const base = `${req.protocol}://${req.get("host")}`;
  return res.json({
    filename: f.filename,
    url: `${base}/uploadps/${f.filename}`,
    mimetype: f.mimetype,
  });
});

uploadsRouter.post("/", uploader.array("files", 10), (req, res) => {
  const base = `${req.protocol}://${req.get("host")}`;
  const files = (req.files as Express.Multer.File[]) ?? [];
  return res.json(
    files.map((f) => ({
      filename: f.filename,
      url: `${base}/uploadps/${f.filename}`,
      size: f.size,
      mimetype: f.mimetype,
    }))
  );
});

/* =====================================================
   TIPOS PARA FILTROS
===================================================== */
type PersonType = "natural" | "juridica" | "anonimo";
type StatusType = "active" | "archived";

function getConsultationFilters(req: Request): {
  dateFrom?: Date;
  dateTo?: Date;
  departmentId?: number;
  municipalityId?: number;
  localityId?: number;
  sector?: string;
  personType?: PersonType;
  status?: StatusType;
} {
  const df = typeof req.query.dateFrom === "string" ? req.query.dateFrom : undefined;
  const dt = typeof req.query.dateTo === "string" ? req.query.dateTo : undefined;
  const dateFrom = parseDate(df);
  const rawDateTo = parseDate(dt);
  const dateTo = rawDateTo
    ? new Date(new Date(rawDateTo).setDate(rawDateTo.getDate() + 1))
    : undefined;

  const toInt = (v: unknown) => {
    if (typeof v !== "string" || !v.trim()) return undefined;
    const n = parseInt(v, 10);
    return Number.isInteger(n) ? n : undefined;
  };

  const departmentId = toInt(req.query.departmentId);
  const municipalityId = toInt(req.query.municipalityId);
  const localityId = toInt(req.query.localityId);

  const sector =
    typeof req.query.sector === "string" && req.query.sector !== "all"
      ? req.query.sector.trim()
      : undefined;

  const ptRaw = typeof req.query.personType === "string" ? req.query.personType.trim() : undefined;
  const personType: PersonType | undefined =
    ptRaw && (["natural", "juridica", "anonimo"] as const).includes(ptRaw as PersonType)
      ? (ptRaw as PersonType)
      : undefined;

  const stRaw = typeof req.query.status === "string" ? req.query.status.trim() : undefined;
  const status: StatusType | undefined =
    stRaw && (["active", "archived"] as const).includes(stRaw as StatusType)
      ? (stRaw as StatusType)
      : undefined;

  return { dateFrom, dateTo, departmentId, municipalityId, localityId, sector, personType, status };
}

/* =====================================================
   WHERE BUILDERS PARA DASHBOARD
===================================================== */
function buildWhereFromFilters(q: any) {
  const conds: string[] = [];
  const params: any[] = [];
  let i = 1;

  if (q.dateFrom) { conds.push(`c.created_at >= $${i++}`); params.push(q.dateFrom); }
  if (q.dateTo)   { conds.push(`c.created_at < $${i++}::date + INTERVAL '1 day'`); params.push(q.dateTo); }
  if (q.departmentId)   { conds.push(`c.department_id = $${i++}`); params.push(q.departmentId); }
  if (q.municipalityId) { conds.push(`c.municipality_id = $${i++}`); params.push(q.municipalityId); }
  if (q.localityId)     { conds.push(`c.locality_id = $${i++}`); params.push(q.localityId); }
  if (q.personType)     { conds.push(`c.person_type = $${i++}`); params.push(q.personType); }
  if (q.status)         { conds.push(`c.status = $${i++}`); params.push(q.status); }

  if (q.sector) {
    // filtro por un sector puntual dentro del arreglo text[] (vía jsonb)
    conds.push(`EXISTS (
      SELECT 1
      FROM jsonb_array_elements_text(${JSON_SECTORS}) s(x)
      WHERE s.x = $${i++}
    )`);
    params.push(q.sector);
  }

  const where = conds.length ? `WHERE ${conds.join(" AND ")}` : "";
  return { where, params };
}

function buildWhereNoSector(q: any) {
  const conds: string[] = [];
  const params: any[] = [];
  let i = 1;

  if (q.dateFrom)        { conds.push(`c.created_at >= $${i++}`); params.push(q.dateFrom); }
  if (q.dateTo)          { conds.push(`c.created_at <  $${i++}`); params.push(q.dateTo); }
  if (q.departmentId)    { conds.push(`c.department_id = $${i++}`); params.push(q.departmentId); }
  if (q.municipalityId)  { conds.push(`c.municipality_id = $${i++}`); params.push(q.municipalityId); }
  if (q.localityId)      { conds.push(`c.locality_id = $${i++}`); params.push(q.localityId); }
  if (q.personType)      { conds.push(`c.person_type = $${i++}`); params.push(q.personType); }
  if (q.status)          { conds.push(`c.status = $${i++}`); params.push(q.status); }

  const where = conds.length ? `WHERE ${conds.join(" AND ")}` : "";
  return { where, params, nextIndex: i };
}

/* =====================================================
   REGISTRO DE RUTAS
===================================================== */
export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);
  app.use("/uploadps", express.static(UPLOAD_DIR));
  app.use("/api/uploads", uploadsRouter);

  /* ------------------------ Ubicación ------------------------ */
  app.get("/api/departments", async (_req: Request, res: Response) => {
    try {
      const departments = await storage.getDepartments();
      res.json(departments);
    } catch (error) {
      console.error("Error fetching departments via storage:", error);
      try {
        const { rows } = await pool.query(
          `SELECT id, name, geocode, latitude, longitude
             FROM consulta.departments
            ORDER BY name`
        );
        res.json(rows);
      } catch (e2: any) {
        console.error("Fallback SQL consulta.departments falló:", e2);
        res.status(500).json({ error: "Failed to fetch departments" });
      }
    }
  });

  app.get("/api/municipalities/:departmentId", async (req: Request, res: Response) => {
    try {
      const departmentId = parseIntStrict(req.params.departmentId, "departmentId");
      const municipalities = await storage.getMunicipalitiesByDepartment(departmentId);
      res.json(municipalities);
    } catch (error: any) {
      console.error("Error fetching municipalities:", error);
      res.status(error?.status || 500).json({ error: error?.message || "Failed to fetch municipalities" });
    }
  });

  app.get("/api/localities/:municipalityId", async (req: Request, res: Response) => {
    try {
      const municipalityId = parseIntStrict(req.params.municipalityId, "municipalityId");
      const localities = await storage.getLocalitiesByMunicipality(municipalityId);
      res.json(localities);
    } catch (error: any) {
      console.error("Error fetching localities:", error);
      res.status(error?.status || 500).json({ error: error?.message || "Failed to fetch localities" });
    }
  });

  /* ------------------------ Sectores ------------------------ */
  app.get("/api/sectors", async (_req: Request, res: Response) => {
    try {
      const sectors = await storage.getSectors();
      res.json(sectors);
    } catch (error) {
      console.error("Error fetching sectors:", error);
      res.status(500).json({ error: "Failed to fetch sectors" });
    }
  });

  app.get("/api/sectors/search", async (req: Request, res: Response) => {
    try {
      const qRaw = req.query.q;
      const query = typeof qRaw === "string" ? qRaw : "";
      if (!query) return res.json([]);
      const sectors = await storage.searchSectors(query);
      res.json(sectors);
    } catch (error) {
      console.error("Error searching sectors:", error);
      res.status(500).json({ error: "Failed to search sectors" });
    }
  });

  /* ------------------------ Upload imágenes (público) ------------------------ */
  const imageUploadLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: "Demasiadas subidas de imágenes. Inténtalo más tarde.",
  });

  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 15 * 1024 * 1024, files: 3 },
    fileFilter: (_req, file, cb) => {
      const allowedMimes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
      if (allowedMimes.includes(file.mimetype.toLowerCase())) cb(null, true);
      else cb(new Error("Solo se permiten imágenes JPEG, PNG o WebP"));
    },
  });

  app.post(
    "/api/upload-images",
    imageUploadLimiter,
    (req: Request, res: Response, next) => {
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
    async (req: Request, res: Response) => {
      try {
        if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
          return res.status(400).json({ error: "No se proporcionaron imágenes" });
        }

        const envDir = process.env.PRIVATE_OBJECT_DIR;
        if (!envDir) return res.status(500).json({ error: "Configuración de almacenamiento no disponible" });
        const privateDir: string = envDir;

        const imageUrls: string[] = [];
        const timestamp = Date.now();

        for (const file of req.files as Express.Multer.File[]) {
          const ft = await fileTypeFromBuffer(file.buffer);
          const allowedTypes = ["jpg", "jpeg", "png", "webp"];
          if (!ft || !allowedTypes.includes(ft.ext)) {
            return res.status(400).json({ error: "Tipo de archivo inválido. Solo JPEG, PNG o WebP permitidos." });
          }
          await sharp(file.buffer).metadata();

          const uniqueFilename = `consultation-${timestamp}-${Math.random().toString(36).slice(2)}.jpg`;
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

  app.get("/api/images/:filename", async (req: Request, res: Response) => {
    try {
      const filename = req.params.filename;
      if (typeof filename !== "string") {
        return res.status(400).json({ error: "Nombre de archivo inválido" });
      }

      const filenamePattern = /^consultation-\d+-[a-z0-9]+\.jpg$/i;
      if (!filenamePattern.test(filename)) {
        return res.status(400).json({ error: "Nombre de archivo inválido" });
      }

      const envDir = process.env.PRIVATE_OBJECT_DIR;
      if (!envDir) return res.status(500).json({ error: "Configuración de almacenamiento no disponible" });
      const privateDir: string = envDir;

      const filePath = path.join(privateDir, "images", filename);
      if (!fs.existsSync(filePath)) return res.status(404).json({ error: "Imagen no encontrada" });

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

  /* ------------------------ Consultas ------------------------ */
  app.post("/api/consultations", async (req: Request, res: Response) => {
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
    useAuth,
    useRole(["admin", "super_admin"]),
    async (req: Request, res: Response) => {
      try {
        const offset = (() => {
          try { return Math.max(parseIntStrict(req.query.offset, "offset"), 0); }
          catch { return 0; }
        })();

        const limit = (() => {
          try {
            const l = parseIntStrict(req.query.limit, "limit");
            return Math.min(Math.max(l, 1), 1000);
          } catch { return 50; }
        })();

        const {
          dateFrom, dateTo, departmentId, municipalityId, localityId, sector, personType, status,
        } = getConsultationFilters(req);

        const result = await storage.getConsultations({
          dateFrom,
          dateTo,
          departmentId,
          municipalityId,
          localityId,
          sector,
          personType: personType as "natural" | "juridica" | "anonimo" | undefined,
          status: status as "active" | "archived" | undefined,
          offset,
          limit,
        });

        res.json(result);
      } catch (error) {
        console.error("Error fetching consultations:", error);
        res.status(500).json({ error: "Failed to fetch consultations" });
      }
    }
  );

  app.get(
    "/api/consultations/:id",
    useAuth,
    useRole(["admin", "super_admin"]),
    async (req: Request, res: Response) => {
      try {
        const id = parseIntStrict(req.params.id, "id");
        const consultation = await storage.getConsultationById(id);
        if (!consultation) return res.status(404).json({ error: "Consultation not found" });
        res.json(consultation);
      } catch (error: any) {
        console.error("Error fetching consultation:", error);
        res.status(error?.status || 500).json({ error: error?.message || "Failed to fetch consultation" });
      }
    }
  );

  app.post("/api/consultations/multi", async (req: Request, res: Response) => {
    try {
      const payload = multiConsultationSchema.parse(req.body);
      const result = await storage.createConsultationsForSectors(payload);
      return res.status(201).json(result); // { createdIds: number[] }
    } catch (err: any) {
      console.error("Error creating multi consultations:", err);
      const msg =
        err?.errors?.[0]?.message || err?.message || "Datos inválidos para multi-consulta";
      return res.status(400).json({ error: msg });
    }
  });

  /* ------------------------ Dashboard simples ------------------------ */
  app.get(
    "/api/dashboard/stats",
    useAuth,
    useRole(["admin", "super_admin"]),
    async (_req: Request, res: Response) => {
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
    useAuth,
    useRole(["admin", "super_admin"]),
    async (req: Request, res: Response) => {
      try {
        const days = (() => {
          try { return parseIntStrict(req.query.days, "days"); }
          catch { return 30; }
        })();
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
    useAuth,
    useRole(["admin", "super_admin"]),
    async (_req: Request, res: Response) => {
      try {
        const data = await storage.getConsultationsBySector();
        res.json(data);
      } catch (error) {
        console.error("Error fetching consultations by sector:", error);
        res.status(500).json({ error: "Failed to fetch consultations by sector" });
      }
    }
  );

  /* ------------------------ Dashboard avanzados ------------------------ */
  app.get(
    "/api/dashboard/by-department",
    useAuth,
    useRole(["admin", "super_admin"]),
    async (req, res) => {
      try {
        const q = {
          dateFrom: typeof req.query.dateFrom === "string" ? req.query.dateFrom : undefined,
          dateTo:   typeof req.query.dateTo   === "string" ? req.query.dateTo   : undefined,
          sector:   typeof req.query.sector   === "string" && req.query.sector !== "all" ? req.query.sector : undefined,
          status:   typeof req.query.status   === "string" && req.query.status !== "all" ? req.query.status : undefined,
        };
        const { where, params } = buildWhereFromFilters(q);
        const { rows } = await pool.query(
          `
          SELECT COALESCE(d.name,'Sin departamento') AS department, COUNT(*)::int AS count
          FROM consulta.consultations c
          LEFT JOIN consulta.departments d ON d.id = c.department_id
          ${where}
          GROUP BY COALESCE(d.name,'Sin departamento')
          ORDER BY count DESC, department ASC
          `,
          params
        );
        res.json(rows);
      } catch (e:any) {
        console.error(e); res.status(500).json({ error: "Failed department chart" });
      }
    }
  );

  app.get(
    "/api/dashboard/by-sector",
    useAuth,
    useRole(["admin", "super_admin"]),
    async (req, res) => {
      try {
        const q = {
          dateFrom: typeof req.query.dateFrom === "string" ? req.query.dateFrom : undefined,
          dateTo:   typeof req.query.dateTo   === "string" ? req.query.dateTo   : undefined,
          departmentId: typeof req.query.departmentId === "string" && req.query.departmentId !== "all" ? Number(req.query.departmentId) : undefined,
          status:   typeof req.query.status   === "string" && req.query.status !== "all" ? req.query.status : undefined,
        };
        const { where, params } = buildWhereFromFilters(q);
        const { rows } = await pool.query(
          `
          SELECT s.sector, COUNT(*)::int AS count
          FROM consulta.consultations c
          CROSS JOIN LATERAL (
            SELECT x AS sector
            FROM jsonb_array_elements_text(${JSON_SECTORS}) t(x)
          ) s
          ${where}
          GROUP BY s.sector
          ORDER BY count DESC, s.sector ASC
          `,
          params
        );
        res.json(rows);
      } catch (e:any) {
        console.error(e); res.status(500).json({ error: "Failed sector chart" });
      }
    }
  );

  app.get(
    "/api/dashboard/by-locality",
    useAuth,
    useRole(["admin", "super_admin"]),
    async (req, res) => {
      try {
        const departmentId =
          typeof req.query.departmentId === "string" && req.query.departmentId !== "all"
            ? Number(req.query.departmentId) : undefined;

        if (!departmentId) return res.json([]);

        const q = {
          dateFrom: typeof req.query.dateFrom === "string" ? req.query.dateFrom : undefined,
          dateTo:   typeof req.query.dateTo   === "string" ? req.query.dateTo   : undefined,
          status:   typeof req.query.status   === "string" && req.query.status !== "all" ? req.query.status : undefined,
          departmentId
        };
        const { where, params } = buildWhereFromFilters(q);

        const { rows } = await pool.query(
          `
          SELECT COALESCE(l.name, c.custom_locality_name, 'Sin localidad') AS locality,
                 COUNT(*)::int AS count
          FROM consulta.consultations c
          LEFT JOIN consulta.localities l ON l.id = c.locality_id
          ${where}
          GROUP BY COALESCE(l.name, c.custom_locality_name, 'Sin localidad')
          ORDER BY count DESC, locality ASC
          LIMIT 20
          `,
          params
        );
        res.json(rows);
      } catch (e:any) {
        console.error(e); res.status(500).json({ error: "Failed locality chart" });
      }
    }
  );

  app.get(
    "/api/dashboard/sectors-by-department",
    useAuth,
    useRole(["admin", "super_admin"]),
    async (req, res) => {
      try {
        const q = {
          dateFrom: typeof req.query.dateFrom === "string" ? req.query.dateFrom : undefined,
          dateTo:   typeof req.query.dateTo   === "string" ? req.query.dateTo   : undefined,
          status:   typeof req.query.status   === "string" && req.query.status !== "all" ? req.query.status : undefined,
        };
        const { where, params } = buildWhereFromFilters(q);

        const { rows } = await pool.query(
          `
          SELECT COALESCE(d.name,'Sin departamento') AS region,
                 s.sector,
                 COUNT(*)::int                         AS count
          FROM consulta.consultations c
          LEFT JOIN consulta.departments d ON d.id = c.department_id
          CROSS JOIN LATERAL (
            SELECT x AS sector
            FROM jsonb_array_elements_text(${JSON_SECTORS}) t(x)
          ) s
          ${where}
          GROUP BY region, s.sector
          ORDER BY region ASC, count DESC;
          `,
          params
        );
        res.json(rows);
      } catch (e:any) {
        console.error(e);
        res.status(500).json({ error: "Failed sectors by department" });
      }
    }
  );

  app.get(
    "/api/dashboard/sectors-by-municipality",
    useAuth,
    useRole(["admin", "super_admin"]),
    async (req, res) => {
      try {
        const departmentId =
          typeof req.query.departmentId === "string" && req.query.departmentId !== "all"
            ? Number(req.query.departmentId) : undefined;

        if (!departmentId) return res.json([]);

        const q = {
          dateFrom: typeof req.query.dateFrom === "string" ? req.query.dateFrom : undefined,
          dateTo:   typeof req.query.dateTo   === "string" ? req.query.dateTo   : undefined,
          status:   typeof req.query.status   === "string" && req.query.status !== "all" ? req.query.status : undefined,
          departmentId
        };
        const { where, params } = buildWhereFromFilters(q);

        const { rows } = await pool.query(
          `
          SELECT COALESCE(m.name,'Sin municipio') AS region,
                 s.sector,
                 COUNT(*)::int                    AS count
          FROM consulta.consultations c
          LEFT JOIN consulta.municipalities m ON m.id = c.municipality_id
          CROSS JOIN LATERAL (
            SELECT x AS sector
            FROM jsonb_array_elements_text(${JSON_SECTORS}) t(x)
          ) s
          ${where}
          GROUP BY region, s.sector
          ORDER BY region ASC, count DESC;
          `,
          params
        );
        res.json(rows);
      } catch (e:any) {
        console.error(e);
        res.status(500).json({ error: "Failed sectors by municipality" });
      }
    }
  );

  app.get(
    "/api/dashboard/sectors-by-locality",
    useAuth,
    useRole(["admin", "super_admin"]),
    async (req, res) => {
      try {
        const municipalityId =
          typeof req.query.municipalityId === "string" && req.query.municipalityId !== "all"
            ? Number(req.query.municipalityId) : undefined;

        if (!municipalityId) return res.json([]);

        const q = {
          dateFrom: typeof req.query.dateFrom === "string" ? req.query.dateFrom : undefined,
          dateTo:   typeof req.query.dateTo   === "string" ? req.query.dateTo   : undefined,
          status:   typeof req.query.status   === "string" && req.query.status !== "all" ? req.query.status : undefined,
        };
        const { where, params } = buildWhereFromFilters({ ...q, departmentId: undefined, sector: undefined });

        const { rows } = await pool.query(
          `
          SELECT COALESCE(l.name, c.custom_locality_name, 'Sin localidad') AS region,
                 s.sector,
                 COUNT(*)::int                                              AS count
          FROM consulta.consultations c
          LEFT JOIN consulta.localities l ON l.id = c.locality_id
          CROSS JOIN LATERAL (
            SELECT x AS sector
            FROM jsonb_array_elements_text(${JSON_SECTORS}) t(x)
          ) s
          WHERE c.municipality_id = $1
          ${where ? `AND ${where.replace(/^WHERE\\s+/, "")}` : ""}
          GROUP BY region, s.sector
          ORDER BY region ASC, count DESC;
          `,
          [municipalityId, ...params]
        );
        res.json(rows);
      } catch (e:any) {
        console.error(e);
        res.status(500).json({ error: "Failed sectors by locality" });
      }
    }
  );

  app.get(
    "/api/dashboard/sector-by-municipality",
    useAuth,
    useRole(["admin", "super_admin"]),
    async (req, res) => {
      try {
        const {
          dateFrom, dateTo, departmentId, municipalityId, localityId, personType, status, sector,
        } = getConsultationFilters(req);

        const q = { dateFrom, dateTo, departmentId, municipalityId, localityId, personType, status };
        const { where, params, nextIndex } = buildWhereNoSector(q);

        const extra = [];
        let idx = nextIndex;
        if (sector) { extra.push(`s.sector = $${idx++}`); params.push(sector); }
        const whereFinal = [where, extra.length ? `AND ${extra.join(" AND ")}` : ""].join(" ");

        const { rows } = await pool.query(
          `
          SELECT
            m.id AS municipality_id,
            COALESCE(m.name, 'Sin municipio') AS municipality,
            d.id AS department_id,
            COALESCE(d.name, 'Sin departamento') AS department,
            s.sector,
            COUNT(*)::int AS count
          FROM consulta.consultations c
          LEFT JOIN consulta.municipalities m ON m.id = c.municipality_id
          LEFT JOIN consulta.departments d    ON d.id = c.department_id
          CROSS JOIN LATERAL (
            SELECT x AS sector
            FROM jsonb_array_elements_text(${JSON_SECTORS}) t(x)
          ) s
          ${whereFinal}
          GROUP BY m.id, COALESCE(m.name,'Sin municipio'),
                   d.id, COALESCE(d.name,'Sin departamento'),
                   s.sector
          ORDER BY department ASC, municipality ASC, count DESC, s.sector ASC
          `,
          params
        );
        res.json(rows);
      } catch (e:any) {
        console.error(e);
        res.status(500).json({ error: "Failed sector-by-municipality" });
      }
    }
  );

  app.get(
    "/api/dashboard/sector-by-locality",
    useAuth,
    useRole(["admin", "super_admin"]),
    async (req, res) => {
      try {
        const {
          dateFrom, dateTo, departmentId, municipalityId, localityId, personType, status, sector,
        } = getConsultationFilters(req);

        if (!municipalityId && !departmentId) {
          return res.json([]);
        }

        const q = { dateFrom, dateTo, departmentId, municipalityId, localityId, personType, status };
        const { where, params, nextIndex } = buildWhereNoSector(q);

        const extra = [];
        let idx = nextIndex;
        if (sector) { extra.push(`s.sector = $${idx++}`); params.push(sector); }
        const whereFinal = [where, extra.length ? `AND ${extra.join(" AND ")}` : ""].join(" ");

        const { rows } = await pool.query(
          `
          SELECT
            l.id AS locality_id,
            COALESCE(l.name, c.custom_locality_name, 'Sin localidad') AS locality,
            m.id AS municipality_id,
            COALESCE(m.name, 'Sin municipio') AS municipality,
            s.sector,
            COUNT(*)::int AS count
          FROM consulta.consultations c
          LEFT JOIN consulta.localities     l ON l.id = c.locality_id
          LEFT JOIN consulta.municipalities m ON m.id = c.municipality_id
          CROSS JOIN LATERAL (
            SELECT x AS sector
            FROM jsonb_array_elements_text(${JSON_SECTORS}) t(x)
          ) s
          ${whereFinal}
          GROUP BY l.id, COALESCE(l.name, c.custom_locality_name, 'Sin localidad'),
                   m.id, COALESCE(m.name,'Sin municipio'), s.sector
          ORDER BY municipality ASC, locality ASC, count DESC, s.sector ASC
          `,
          params
        );
        res.json(rows);
      } catch (e:any) {
        console.error(e);
        res.status(500).json({ error: "Failed sector-by-locality" });
      }
    }
  );

  app.get(
    "/api/dashboard/top-sector-by-department",
    useAuth,
    useRole(["admin", "super_admin"]),
    async (req, res) => {
      try {
        const { dateFrom, dateTo, departmentId, municipalityId, localityId, personType, status } =
          getConsultationFilters(req);

        const q = { dateFrom, dateTo, departmentId, municipalityId, localityId, personType, status };
        const { where, params } = buildWhereNoSector(q);

        const { rows } = await pool.query(
          `
          WITH agg AS (
            SELECT
              d.id AS department_id,
              COALESCE(d.name,'Sin departamento') AS department,
              s.sector,
              COUNT(*)::int AS count
            FROM consulta.consultations c
            LEFT JOIN consulta.departments d ON d.id = c.department_id
            CROSS JOIN LATERAL (
              SELECT x AS sector
              FROM jsonb_array_elements_text(${JSON_SECTORS}) t(x)
            ) s
            ${where}
            GROUP BY d.id, COALESCE(d.name,'Sin departamento'), s.sector
          ),
          ranked AS (
            SELECT
              *,
              SUM(count) OVER (PARTITION BY department_id) AS total_dept,
              ROW_NUMBER() OVER (PARTITION BY department_id ORDER BY count DESC) AS rn
            FROM agg
          )
          SELECT
            department_id, department, sector, count,
            total_dept,
            ROUND(count * 100.0 / NULLIF(total_dept,0), 1) AS pct
          FROM ranked
          WHERE rn = 1
          ORDER BY count DESC, department ASC
          `,
          params
        );
        res.json(rows);
      } catch (e:any) {
        console.error(e);
        res.status(500).json({ error: "Failed top-sector-by-department" });
      }
    }
  );

  /* ------------------------ Exportaciones ------------------------ */
  app.get(
    "/api/export/consultations/csv",
    useAuth,
    useRole(["admin", "super_admin"]),
    async (req: Request, res: Response) => {
      try {
        const {
          dateFrom, dateTo, departmentId, municipalityId, localityId, sector, personType, status,
        } = getConsultationFilters(req);

        const result = await storage.getConsultations({
          dateFrom, dateTo, departmentId, municipalityId, localityId, sector, personType, status, limit: 10000
        });
        const rows = result.consultations ?? [];

        const sanitizeCSVField = (field: string | number | undefined | null): string => {
          if (field === undefined || field === null) return "";
          let sanitized = String(field);
          if (/^[=+\-@]/.test(sanitized)) sanitized = "'" + sanitized;
          sanitized = sanitized.replace(/[\r\n]/g, " ");
          sanitized = '"' + sanitized.replace(/"/g, '""') + '"';
          return sanitized;
        };

        const header = [
          "ID","Fecha","Tipo de Persona","Nombre/Empresa","Departamento","Municipio",
          "Colonia/Aldea","Geocódigo","Sectores","Mensaje","Estado"
        ].map(sanitizeCSVField).join(",");

        const body = rows.map((c: any) => {
          const sectors = normalizeStringArray(c.selectedSectors).join("; ");
          const nombre =
            c.personType === "natural"
              ? (`${c.firstName || ""} ${c.lastName || ""}`.trim() || "Anónimo")
              : c.personType === "juridica"
                ? (c.companyName || c.rtn || "—")
                : "Anónimo";
          return [
            sanitizeCSVField(c.id),
            sanitizeCSVField(new Date(c.createdAt).toLocaleDateString("es-HN")),
            sanitizeCSVField(c.personType === "natural" ? "Natural" : c.personType === "juridica" ? "Jurídica" : "Anónimo"),
            sanitizeCSVField(nombre),
            sanitizeCSVField(c.department?.name ?? ""),
            sanitizeCSVField(c.municipality?.name ?? ""),
            sanitizeCSVField(c.locality?.name ?? c.customLocalityName ?? ""),
            sanitizeCSVField(c.geocode),
            sanitizeCSVField(sectors),
            sanitizeCSVField(c.message),
            sanitizeCSVField(c.status === "active" ? "Activa" : "Archivada"),
          ].join(",");
        });

        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="consultas_${new Date().toISOString().split("T")[0]}.csv"`
        );
        res.send("\uFEFF" + [header, ...body].join("\n"));
      } catch (error) {
        console.error("Error exporting CSV:", error);
        res.status(500).json({ error: "Failed to export CSV" });
      }
    }
  );

  app.get(
    "/api/export/consultations/excel",
    useAuth,
    useRole(["admin", "super_admin"]),
    async (req: Request, res: Response) => {
      try {
        const {
          dateFrom, dateTo, departmentId, municipalityId, localityId, sector, personType, status,
        } = getConsultationFilters(req);

        const result = await storage.getConsultations({
          dateFrom, dateTo, departmentId, municipalityId, localityId, sector, personType, status, limit: 10000
        });
        const rows = result.consultations ?? [];

        const sanitize = (v: any) => {
          if (v === undefined || v === null) return "";
          let s = String(v);
          if (/^[=+\-@]/.test(s)) s = "'" + s;
          return s.replace(/[\r\n]/g, " ");
        };

        const wb = XLSX.utils.book_new();
        const wsData = [
          ["ID","Fecha","Tipo de Persona","Nombre/Empresa","Departamento","Municipio","Colonia/Aldea","Geocódigo","Sectores","Mensaje","Estado"],
          ...rows.map((c:any)=>[
            sanitize(c.id),
            sanitize(new Date(c.createdAt).toLocaleDateString("es-HN")),
            sanitize(c.personType === "natural" ? "Natural" : c.personType === "juridica" ? "Jurídica" : "Anónimo"),
            sanitize(c.personType === "natural" ? (`${c.firstName || ""} ${c.lastName || ""}`.trim() || "Anónimo") : (c.companyName || c.rtn || "—")),
            sanitize(c.department?.name ?? ""),
            sanitize(c.municipality?.name ?? ""),
            sanitize(c.locality?.name ?? c.customLocalityName ?? ""),
            sanitize(c.geocode),
            sanitize(normalizeStringArray(c.selectedSectors).join(", ")),
            sanitize(c.message),
            sanitize(c.status === "active" ? "Activa" : "Archivada"),
          ])
        ];
        const ws = XLSX.utils.aoa_to_sheet(wsData);
        (ws as any)["!cols"] = [
          { width: 10 }, { width: 12 }, { width: 15 }, { width: 22 }, { width: 18 },
          { width: 18 }, { width: 18 }, { width: 14 }, { width: 26 }, { width: 60 }, { width: 12 },
        ];
        XLSX.utils.book_append_sheet(wb, ws, "Consultas");

        const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.setHeader("Content-Disposition", `attachment; filename="consultas_${new Date().toISOString().split("T")[0]}.xlsx"`);
        res.send(buf);
      } catch (error) {
        console.error("Error exporting Excel:", error);
        res.status(500).json({ error: "Failed to export Excel" });
      }
    }
  );

  app.get(
    "/api/export/consultations/pdf",
    useAuth,
    useRole(["admin", "super_admin"]),
    async (req: Request, res: Response) => {
      try {
        const {
          dateFrom, dateTo, departmentId, municipalityId, localityId, sector, personType, status,
        } = getConsultationFilters(req);

        const result = await storage.getConsultations({
          dateFrom, dateTo, departmentId, municipalityId, localityId, sector, personType, status, limit: 10000,
        });
        const consultations = result.consultations ?? [];

        const { jsPDF } = await import("jspdf");
        const autoTable = (await import("jspdf-autotable")).default;

        const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "landscape" });
        const pageWidth  = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();

        const MARGIN_LR = 18;
        const HEADER_H  = 64;
        const START_Y   = HEADER_H + 28;
        const availW    = pageWidth - MARGIN_LR * 2;

        const CYAN = [27, 209, 232] as const;

        const fmtHN = (d: string | Date) => new Date(d).toLocaleDateString("es-HN");
        const labelTipo = (t?: string) =>
          t === "natural" ? "Natural" : t === "juridica" ? "Jurídica" : "Anónimo";
        const rangeText =
          typeof req.query.dateFrom === "string" && typeof req.query.dateTo === "string"
            ? `${fmtHN(req.query.dateFrom)} - ${fmtHN(req.query.dateTo)}`
            : "Todas las fechas";

        const drawHeader = () => {
          doc.setFillColor(...CYAN);
          doc.rect(0, 0, pageWidth, HEADER_H, "F");

          doc.setFontSize(16);
          doc.setTextColor(255, 255, 255);
          doc.text("Reporte de Consultas Ciudadanas", 24, 38);

          doc.setFontSize(10);
          doc.text(`Período: ${rangeText}`, 24, 54);
        };
        drawHeader();

        const head: string[][] = [[
          "Fecha","Tipo","Nombre / Empresa","Ubicación","Sectores","Estado","Mensaje",
        ]];

        const body: string[][] = consultations.map((c: any) => {
          const nombre =
            c.personType === "natural"
              ? (`${c.firstName || ""} ${c.lastName || ""}`.trim() || "—")
              : c.personType === "juridica"
                ? (c.companyName || c.rtn || "—")
                : "Anónimo";

          const ubic = [
            c.department?.name || "",
            c.municipality?.name || "",
            c.locality?.name || c.customLocalityName || "",
          ].filter(Boolean).join(" / ") || "—";

          const sectores = normalizeStringArray(c.selectedSectors).join(", ");
          const estado = c.status === "active" ? "Activa" : "Archivada";

          return [
            c.createdAt ? fmtHN(c.createdAt) : "—",
            labelTipo(c.personType),
            nombre,
            ubic,
            sectores,
            estado,
            typeof c.message === "string" ? c.message : "",
          ];
        });

        const W = {
          fecha:    70,
          tipo:     70,
          nombre:   150,
          ubic:     190,
          sectores: 140,
          estado:   70,
        };
        const mensaje = Math.max(
          100,
          availW - (W.fecha + W.tipo + W.nombre + W.ubic + W.sectores + W.estado)
        );

        autoTable(doc, {
          head, body,
          startY: START_Y,
          margin: { left: MARGIN_LR, right: MARGIN_LR, top: START_Y },
          styles: { fontSize: 9, cellPadding: 6, valign: "top", overflow: "linebreak" },
          headStyles: { fillColor: CYAN as any, textColor: [255, 255, 255], fontStyle: "bold" },
          alternateRowStyles: { fillColor: [245, 247, 250] },
          tableWidth: availW,
          columnStyles: {
            0: { cellWidth: W.fecha },
            1: { cellWidth: W.tipo },
            2: { cellWidth: W.nombre },
            3: { cellWidth: W.ubic },
            4: { cellWidth: W.sectores },
            5: { cellWidth: W.estado },
            6: { cellWidth: mensaje },
          },
          didDrawPage: () => {
            doc.setFontSize(9);
            doc.setTextColor(120);
            const y = pageHeight - 16;
            doc.text(`Generado: ${fmtHN(new Date())}`, MARGIN_LR, y);
          },
        });

        const totalPages = doc.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
          doc.setPage(i);
          doc.setFontSize(9);
          doc.setTextColor(120);
          doc.text(
            `Página ${i} de ${totalPages}`,
            pageWidth - MARGIN_LR,
            pageHeight - 16,
            { align: "right" }
          );
        }

        const pdfArrayBuffer = doc.output("arraybuffer");
        const pdfBuffer = Buffer.from(pdfArrayBuffer);

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

  /* ------------------------ Usuarios (solo super_admin) ------------------------ */
  const userCreationLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 3,
    message: { error: "Demasiados intentos de creación de usuarios. Intente nuevamente en 15 minutos." },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
  });

  app.get("/api/users", useAuth, useRole(["super_admin"]), async (_req: Request, res: Response) => {
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
    useAuth,
    useRole(["super_admin"]),
    userCreationLimiter,
    async (req: Request, res: Response) => {
      try {
        const validatedData = insertUserSchema.parse(req.body);
        const { password: rawPassword, ...rest } = validatedData as { password: unknown };
        if (typeof rawPassword !== "string" || rawPassword.length < 6) {
          return res.status(400).json({ error: "La contraseña debe ser una cadena de al menos 6 caracteres" });
        }
        const user = await storage.createUser({ ...rest, password: rawPassword } as any);
        const { password, ...userWithoutPassword } = user as any;
        res.status(201).json(userWithoutPassword);
      } catch (error: any) {
        console.error("Error creating user:", error);
        if (error instanceof Error && error.message.includes("duplicate key")) {
          res.status(400).json({ error: "El nombre de usuario ya existe" });
        } else {
          res.status(400).json({ error: "Datos de usuario inválidos" });
        }
      }
    }
  );

  app.delete("/api/users/:id", useAuth, useRole(["super_admin"]), async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      if ((req as any).user?.id === id) {
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

  app.put("/api/users/:id/password", useAuth, useRole(["super_admin"]), async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { password } = req.body;
      if (!password || typeof password !== "string" || password.length < 6) {
        return res.status(400).json({ error: "La contraseña debe tener al menos 6 caracteres" });
      }
      const userToUpdate = await storage.getUser(id);
      if (!userToUpdate) return res.status(404).json({ error: "Usuario no encontrado" });
      if (userToUpdate.username === "SPE") {
        return res.status(403).json({ error: "La cuenta SPE está protegida y no puede ser modificada" });
      }
      const updated = await storage.updateUserPassword(id, password);
      if (!updated) return res.status(404).json({ error: "Usuario no encontrado" });
      res.json({ message: "Contraseña actualizada exitosamente" });
    } catch (error) {
      console.error("Error updating user password:", error);
      res.status(500).json({ error: "Error al actualizar la contraseña" });
    }
  });

  app.put("/api/users/:id/status", useAuth, useRole(["super_admin"]), async (req: Request, res: Response) => {
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
      if ((req as any).user?.id === id) {
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

  app.put("/api/profile/password", useAuth, async (req: Request, res: Response) => {
    try {
      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: "Se requiere contraseña actual y nueva contraseña" });
      }
      if (typeof newPassword !== "string" || newPassword.length < 6) {
        return res.status(400).json({ error: "La nueva contraseña debe tener al menos 6 caracteres" });
      }
      const currentUser = await storage.getUser((req as any).user!.id);
      if (!currentUser) return res.status(404).json({ error: "Usuario no encontrado" });
      if (typeof (currentUser as any).password !== "string" || (currentUser as any).password.length === 0) {
        return res.status(409).json({
          error: "Su cuenta no tiene una contraseña establecida. Solicite un restablecimiento al administrador.",
        });
      }
      const isValidCurrentPassword = await comparePasswords(currentPassword, (currentUser as any).password);
      if (!isValidCurrentPassword) {
        return res.status(401).json({ error: "La contraseña actual es incorrecta" });
      }
      const updated = await storage.updateUserPassword((req as any).user!.id, newPassword);
      if (!updated) return res.status(500).json({ error: "Error al actualizar la contraseña" });
      (req as any).session.destroy((err: any) => {
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

  /* ------------------------ UPDATE/STATUS/DELETE consulta ------------------------ */
  app.put(
    "/api/consultations/:id",
    useAuth,
    useRole(["admin", "super_admin"]),
    async (req: Request, res: Response) => {
      try {
        const id = parseIntStrict(req.params.id, "id");
        const data = req.body ?? {};

        const sets: string[] = [];
        const params: any[] = [];
        let idx = 1;

        // helper que permite castear
        const mapField = (col: string, val: any, cast?: string) => {
          sets.push(cast ? `${col} = $${idx++}::${cast}` : `${col} = $${idx++}`);
          params.push(val);
        };

        if (data.personType !== undefined) mapField("person_type", data.personType);
        if (data.firstName !== undefined) mapField("first_name", data.firstName);
        if (data.lastName !== undefined) mapField("last_name", data.lastName);
        if (data.identity !== undefined) mapField("identity", data.identity);
        if (data.email !== undefined) mapField("email", data.email);
        if (data.mobile !== undefined) mapField("mobile", data.mobile);
        if (data.companyName !== undefined) mapField("company_name", data.companyName);
        if (data.rtn !== undefined) mapField("rtn", data.rtn);
        if (data.legalRepresentative !== undefined) mapField("legal_representative", data.legalRepresentative);
        if (data.companyContact !== undefined) mapField("company_contact", data.companyContact);

        if (data.departmentId !== undefined) mapField("department_id", data.departmentId ? Number(data.departmentId) : null);
        if (data.municipalityId !== undefined) mapField("municipality_id", data.municipalityId ? Number(data.municipalityId) : null);
        if (data.localityId !== undefined) mapField("locality_id", data.localityId ? Number(data.localityId) : null);

        if (data.geocode !== undefined) mapField("geocode", data.geocode);
        if (data.message !== undefined) mapField("message", data.message);
        if (data.status !== undefined) mapField("status", data.status);

        // *** clave: guardar como text[] (NO jsonb) ***
        if (data.selectedSectors !== undefined) {
          const sectors = normalizeStringArray(data.selectedSectors);
          mapField("selected_sectors", sectors, "text[]");
        }

        sets.push(`updated_at = now()`);

        if (!sets.length) return res.status(400).json({ error: "Nada para actualizar" });

        params.push(id);
        const sql = `
          UPDATE consulta.consultations
             SET ${sets.join(", ")}
           WHERE id = $${idx}
        `;
        const result = await pool.query(sql, params);
        if (!result.rowCount) return res.status(404).json({ error: "Consulta no encontrada" });

        res.json({ ok: true, id });
      } catch (error: any) {
        console.error("Error updating consultation:", error);
        res.status(error?.status || 500).json({ error: error?.message || "Failed to update consultation" });
      }
    }
  );

  app.patch(
    "/api/consultations/:id/status",
    useAuth,
    useRole(["admin", "super_admin"]),
    async (req: Request, res: Response) => {
      try {
        const id = parseIntStrict(req.params.id, "id");
        const { status } = req.body as { status?: "active" | "archived" };
        if (status !== "active" && status !== "archived") {
          return res.status(400).json({ error: "status inválido" });
        }
        const { rowCount } = await pool.query(
          `UPDATE consulta.consultations SET status = $1, updated_at = now() WHERE id = $2`,
          [status, id]
        );
        if (!rowCount) return res.status(404).json({ error: "Consulta no encontrada" });
        res.json({ ok: true, id, status });
      } catch (error: any) {
        console.error("Error updating status:", error);
        res.status(error?.status || 500).json({ error: error?.message || "Failed to update status" });
      }
    }
  );

  app.delete(
    "/api/consultations/:id",
    useAuth,
    useRole(["admin", "super_admin"]),
    async (req: Request, res: Response) => {
      try {
        const id = parseIntStrict(req.params.id, "id");
        const { rowCount } = await pool.query(
          `DELETE FROM consulta.consultations WHERE id = $1`,
          [id]
        );
        if (!rowCount) return res.status(404).json({ error: "Consulta no encontrada" });
        res.json({ ok: true, id });
      } catch (error: any) {
        console.error("Error deleting consultation:", error);
        res.status(error?.status || 500).json({ error: error?.message || "Failed to delete consultation" });
      }
    }
  );

  /* ------------------------ HTTP SERVER ------------------------ */
  const httpServer = createServer(app);
  return httpServer;
}
