import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("ciudadano"), // ciudadano, admin, super_admin, planificador
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const departments = pgTable("departments", {
  id: varchar("id", { length: 2 }).primaryKey(),
  name: text("name").notNull(),
  geocode: text("geocode").notNull(),
});

export const municipalities = pgTable("municipalities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  departmentId: varchar("department_id", { length: 2 }).notNull(),
  geocode: text("geocode").notNull(),
});

export const localities = pgTable("localities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  municipalityId: varchar("municipality_id").notNull(),
  area: text("area").notNull(), // rural, urbano
  geocode: text("geocode").notNull(),
});

export const sectors = pgTable("sectors", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  description: text("description"),
  active: boolean("active").default(true).notNull(),
});

export const consultations = pgTable("consultations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  personType: text("person_type").notNull(), // natural, juridica, anonimo
  
  // Natural person fields
  firstName: text("first_name"),
  lastName: text("last_name"),
  identity: text("identity"),
  email: text("email"),
  
  // Juridica person fields
  companyName: text("company_name"),
  rtn: text("rtn"),
  legalRepresentative: text("legal_representative"),
  companyContact: text("company_contact"),
  
  // Optional contact info
  mobile: text("mobile"),
  phone: text("phone"),
  altEmail: text("alt_email"),
  
  // Location
  departmentId: varchar("department_id", { length: 2 }).notNull(),
  municipalityId: varchar("municipality_id").notNull(),
  localityId: varchar("locality_id").notNull(),
  geocode: text("geocode").notNull(),
  
  // Message and sectors
  message: text("message").notNull(),
  selectedSectors: text("selected_sectors").array().notNull(),
  
  // Status and timestamps
  status: text("status").default("active").notNull(), // active, archived
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Relations
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

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  role: true,
});

export const insertConsultationSchema = createInsertSchema(consultations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  geocode: true,
});

export const insertDepartmentSchema = createInsertSchema(departments);
export const insertMunicipalitySchema = createInsertSchema(municipalities).omit({ id: true });
export const insertLocalitySchema = createInsertSchema(localities).omit({ id: true });
export const insertSectorSchema = createInsertSchema(sectors).omit({ id: true });

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Department = typeof departments.$inferSelect;
export type Municipality = typeof municipalities.$inferSelect;
export type Locality = typeof localities.$inferSelect;
export type Sector = typeof sectors.$inferSelect;
export type Consultation = typeof consultations.$inferSelect;
export type InsertConsultation = z.infer<typeof insertConsultationSchema>;
export type InsertDepartment = z.infer<typeof insertDepartmentSchema>;
export type InsertMunicipality = z.infer<typeof insertMunicipalitySchema>;
export type InsertLocality = z.infer<typeof insertLocalitySchema>;
export type InsertSector = z.infer<typeof insertSectorSchema>;
