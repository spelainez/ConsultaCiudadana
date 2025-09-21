import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth, requireAuth, requireRole } from "./auth";
import { storage } from "./storage";
import { insertConsultationSchema, insertSectorSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication
  setupAuth(app);

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

  app.get("/api/consultations", requireRole(["admin", "super_admin"]), async (req, res) => {
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

  app.get("/api/consultations/:id", requireRole(["admin", "super_admin"]), async (req, res) => {
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
  app.get("/api/dashboard/stats", requireRole(["admin", "super_admin"]), async (req, res) => {
    try {
      const stats = await storage.getConsultationStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ error: "Failed to fetch dashboard stats" });
    }
  });

  app.get("/api/dashboard/consultations-by-date", requireRole(["admin", "super_admin"]), async (req, res) => {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const data = await storage.getConsultationsByDate(days);
      res.json(data);
    } catch (error) {
      console.error("Error fetching consultations by date:", error);
      res.status(500).json({ error: "Failed to fetch consultations by date" });
    }
  });

  app.get("/api/dashboard/consultations-by-sector", requireRole(["admin", "super_admin"]), async (req, res) => {
    try {
      const data = await storage.getConsultationsBySector();
      res.json(data);
    } catch (error) {
      console.error("Error fetching consultations by sector:", error);
      res.status(500).json({ error: "Failed to fetch consultations by sector" });
    }
  });

  // Admin-only endpoints
  app.post("/api/sectors", requireRole(["super_admin"]), async (req, res) => {
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
