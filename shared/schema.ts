// @shared/schema.ts
import { sql } from "drizzle-orm";
import {
  pgSchema,
  text,
  timestamp,
  integer,
  boolean,
  serial,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

/** <<< USAR EL SCHEMA 'consulta' >>> */
const consulta = pgSchema("consulta");

/* ============ USERS ============ */
export const usuarios = consulta.table("usuarios", {
  id: serial("id").primaryKey(),
  nombre: text("nombre"),
  email: text("email").notNull(),
  rol: text("rol").notNull().default("ciudadano"),
  username: text("username").notNull(),
  password: text("password"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type DbUser  = typeof usuarios.$inferSelect;   // incluye password
export type NewUser = typeof usuarios.$inferInsert;   // input para insert
export type PublicUser = Omit<DbUser, "password">;

/* ============ DEPARTMENTS ============ */
export const departments = consulta.table("departments", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  geocode: text("geocode").notNull(),
  latitude: text("latitude"),
  longitude: text("longitude"),
});

/* ============ MUNICIPALITIES ============ */
export const municipalities = consulta.table("municipalities", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  departmentId: integer("department_id").notNull().references(() => departments.id),
  geocode: text("geocode").notNull(),
  latitude: text("latitude"),
  longitude: text("longitude"),
});

/* ============ LOCALITIES ============ */
export const localities = consulta.table("localities", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  municipalityId: integer("municipality_id").notNull().references(() => municipalities.id),
  area: text("area").notNull(), // 'urbano' | 'rural'
  geocode: text("geocode").notNull().unique(),
  latitude: text("latitude"),
  longitude: text("longitude"),
});

/* ============ SECTORS ============ */
export const sectors = consulta.table("sectors", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  active: boolean("active").default(true).notNull(),
});

/* ============ CONSULTATIONS ============ */
export const consultations = consulta.table("consultations", {
  id: serial("id").primaryKey(),

  personType: text("person_type").notNull(), // 'natural' | 'juridica' | 'anonimo'

  // Persona natural
  firstName: text("first_name"),
  lastName: text("last_name"),
  identity: text("identity"),
  email: text("email"),

  // Coordenadas (guardadas como texto)
  latitude: text("latitude"),
  longitude: text("longitude"),

  // Persona jurídica
  companyName: text("company_name"),
  rtn: text("rtn"),
  legalRepresentative: text("legal_representative"),
  companyContact: text("company_contact"),

  // Contacto opcional
  mobile: text("mobile"),
  phone: text("phone"),
  altEmail: text("alt_email"),

  // Ubicación
  departmentId: integer("department_id").notNull().references(() => departments.id),
  municipalityId: integer("municipality_id").notNull().references(() => municipalities.id),
  zone: text("zone").notNull(), // 'urbano' | 'rural'
  localityId: integer("locality_id").references(() => localities.id),
  customLocalityName: text("custom_locality_name"),
  geocode: text("geocode").notNull(),

  // Mensaje y sectores
  message: text("message").notNull(),
  images: text("images").array().default([]),                  // text[]
  selectedSectors: text("selected_sectors").array().notNull(), // text[]

  // Estado y tiempos
  status: text("status").default("active").notNull(),          // 'active' | 'archived'
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/* ============ RELATIONS ============ */
export const departmentsRelations = relations(departments, ({ many }) => ({
  municipalities: many(municipalities),
}));

export const municipalitiesRelations = relations(municipalities, ({ one, many }) => ({
  department: one(departments, {
    fields: [municipalities.departmentId],
    references: [departments.id],
  }),
  localities: many(localities),
}));

export const localitiesRelations = relations(localities, ({ one }) => ({
  municipality: one(municipalities, {
    fields: [localities.municipalityId],
    references: [municipalities.id],
  }),
}));

export const consultationsRelations = relations(consultations, ({ one }) => ({
  department: one(departments, {
    fields: [consultations.departmentId],
    references: [departments.id],
  }),
  municipality: one(municipalities, {
    fields: [consultations.municipalityId],
    references: [municipalities.id],
  }),
  locality: one(localities, {
    fields: [consultations.localityId],
    references: [localities.id],
  }),
}));

/* ============ INSERT SCHEMAS (Zod) ============ */

// Usuarios (crear desde admin)
export const insertUserSchema = z.object({
  nombre: z.string().optional(),
  email: z.string().email(),
  username: z.string().min(3),
  password: z.string().min(6),
  rol: z.enum(["ciudadano", "admin", "super_admin", "planificador"]).optional(),
  active: z.boolean().optional(),
});

export type InsertUserInput  = z.input<typeof insertUserSchema>;
export type InsertUserOutput = z.output<typeof insertUserSchema>;

// Base para inserción simple de consulta (endpoint /api/consultations)
const baseInsertConsultation = createInsertSchema(consultations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  geocode: true, // calculado en backend
});

// localityId puede venir number o string ("otro", "123"). Se normaliza a number | undefined.
export const insertConsultationSchema = z.object({
  personType: z.enum(["natural", "juridica", "anonimo"]),

  // Natural (opcionales)
  firstName: z.string().trim().optional(),
  lastName: z.string().trim().optional(),
  identity: z.string().trim().optional(),
  email: z.string().email().optional(),

  // Jurídica (opcionales)
  companyName: z.string().trim().optional(),
  rtn: z.string().trim().optional(),
  legalRepresentative: z.string().trim().optional(),
  companyContact: z.string().trim().optional(),

  // Contacto opcional
  mobile: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  altEmail: z.string().email().optional(),

  // Ubicación
  departmentId: z.number().int().positive(),
  municipalityId: z.number().int().positive(),
  zone: z.enum(["urbano", "rural"]),
  localityId: z.number().int().positive().optional(),  // en la fila real será numérica o null
  customLocalityName: z.string().trim().optional(),

  // Coordenadas (opcionales salvo “otro” en el flujo multi)
  latitude: z.string().trim().optional(),
  longitude: z.string().trim().optional(),

  // Contenido de la consulta
  message: z.string().trim().min(1),
  images: z.array(z.string()).default([]),

  // sectores marcados en la fila (en el multi la armamos por cada item)
  selectedSectors: z.array(z.string()).min(1),

  status: z.enum(["active", "archived"]).default("active"),

  // campos de auditoría si las tablas los exponen (opcional en zod)
  // createdAt/updatedAt los maneja la BD
});
export type InsertConsultation = z.infer<typeof insertConsultationSchema>;

/** ===== Esquema para el envío MULTI =====
 * header = datos comunes SIN message/imagenes/selectedSectors
 * items  = [{sector, message, images[]}, ...]
 */
const multiHeaderBase = insertConsultationSchema
  .omit({ message: true, images: true, selectedSectors: true })
  .extend({
    // en el flujo multi permitimos "otro"
    localityId: z.union([z.number().int().positive(), z.literal("otro")]).optional(),
    customLocalityName: z.string().trim().optional(),
    latitude: z.string().trim().optional(),
    longitude: z.string().trim().optional(),
  });

export const multiConsultationSchema = z
  .object({
    header: insertConsultationSchema
      .omit({ message: true, images: true, selectedSectors: true })
      .extend({
        // permitir "otro" para localidad en el envío del formulario
        localityId: z.union([z.number().int().positive(), z.literal("otro")]).optional(),
        customLocalityName: z.string().trim().optional(),
        latitude: z.string().trim().optional(),
        longitude: z.string().trim().optional(),
      }),
    items: z
      .array(
        z.object({
          sector: z.string().trim().min(1),
          message: z.string().trim().min(1),
          images: z.array(z.string()).min(1),
        })
      )
      .min(1),
  })
  .superRefine((data, ctx) => {
    const h = data.header;

    if (!h.departmentId) ctx.addIssue({ code: "custom", path: ["header","departmentId"], message: "Departamento requerido" });
    if (!h.municipalityId) ctx.addIssue({ code: "custom", path: ["header","municipalityId"], message: "Municipio requerido" });
    if (!h.zone) ctx.addIssue({ code: "custom", path: ["header","zone"], message: "Zona requerida" });

    const isOtro = h.localityId === "otro";
    if (h.zone === "urbano") {
      if (!isOtro && (typeof h.localityId !== "number" || h.localityId <= 0)) {
        ctx.addIssue({ code: "custom", path: ["header","localityId"], message: "Seleccione su colonia/barrio" });
      }
    } else if (h.zone === "rural") {
      if (!isOtro && (typeof h.localityId !== "number" || h.localityId <= 0)) {
        ctx.addIssue({ code: "custom", path: ["header","localityId"], message: "Seleccione su aldea/caserío" });
      }
    }

    if (isOtro) {
      if (!h.customLocalityName?.trim()) {
        ctx.addIssue({ code: "custom", path: ["header","customLocalityName"], message: "Escriba el nombre de la localidad" });
      }
      if (!h.latitude || !h.longitude) {
        ctx.addIssue({ code: "custom", path: ["header","latitude"], message: "Fije las coordenadas en el mapa" });
      }
    }

    if (h.personType === "anonimo") {
      if (!h.email && !h.altEmail) {
        ctx.addIssue({ code: "custom", path: ["header","altEmail"], message: "Correo requerido para anónimo" });
      }
      if (!h.mobile && !h.phone) {
        ctx.addIssue({ code: "custom", path: ["header","mobile"], message: "Teléfono/celular requerido para anónimo" });
      }
    }
  });



/* ============ TYPES ============ */
export type User         = typeof usuarios.$inferSelect;
export type Department   = typeof departments.$inferSelect;
export type Municipality = typeof municipalities.$inferSelect;
export type Locality     = typeof localities.$inferSelect;
export type Sector       = typeof sectors.$inferSelect;
export type Consultation = typeof consultations.$inferSelect;



// Multi (header+items) usando el esquema ya definido arriba
export type MultiConsultation = z.infer<typeof multiConsultationSchema>;