// server/storage.ts
import {
  usuarios,
  departments,
  municipalities,
  localities,
  sectors,
  consultations,
  type User,
  type Department,
  type Municipality,
  type Locality,
  type Sector,
  type Consultation,
  type InsertConsultation,
  insertConsultationSchema,
  type NewUser,
  type PublicUser,
  multiConsultationSchema,
} from "@shared/schema";
import PDFDocument from "pdfkit"; 

import { db, pgPool as pool } from "./db";
import { eq, and, gte, lte, sql, desc } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import bcrypt from "bcrypt";
import { z } from "zod";

const PostgresSessionStore = connectPg(session);

/* ------------------------------ Helpers ------------------------------ */

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((v) => String(v));
  if (value == null) return [];
  return String(value)
    .split(/[;,]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function toIntId(id: string | number, field = "id"): number {
  const n = typeof id === "number" ? id : Number(id);
  if (!Number.isInteger(n)) throw new Error(`Invalid ${field}`);
  return n;
}

function normalizeCoord(val: unknown): string | undefined {
  if (val == null) return undefined;
  if (typeof val === "number" && Number.isFinite(val)) return String(val);
  const s = String(val).trim();
  if (!s) return undefined;
  const n = Number(s.replace(",", "."));
  return Number.isFinite(n) ? String(n) : undefined;
}

// ↑ cerca de otros helpers
const BCRYPT_RE = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/;

async function safeHash(plain: string): Promise<string> {
  const pwd = String(plain); // ¡no trim, no lowercase!
  if (BCRYPT_RE.test(pwd)) {
    throw new Error("Password parece ya un hash bcrypt. Envía la contraseña en texto plano.");
  }
  const hash = await bcrypt.hash(pwd, 12);
  // sanity check
  if (!(await bcrypt.compare(pwd, hash))) {
    throw new Error("Hash mismatch inesperado al generar.");
  }
  return hash;
}


export type ConsultationsFilter = {
  dateFrom?: Date;
  dateTo?: Date;
  departmentId?: number;
  municipalityId?: number;
  localityId?: number;
  sector?: string;
  personType?: "natural" | "juridica" | "anonimo";
  status?: "active" | "archived" | "null";
  offset?: number;
  limit?: number;
};

async function buildGeo(params: {
  departmentId: number;
  municipalityId: number;
  localityId?: number | null;
  latitude?: unknown;
  longitude?: unknown;
}) {
  const [dep] = await db
    .select({
      id: departments.id,
      geocode: departments.geocode,
      latitude: departments.latitude,
      longitude: departments.longitude,
    })
    .from(departments)
    .where(eq(departments.id, params.departmentId));

  const [mun] = await db
    .select({
      id: municipalities.id,
      geocode: municipalities.geocode,
      departmentId: municipalities.departmentId,
      latitude: municipalities.latitude,
      longitude: municipalities.longitude,
    })
    .from(municipalities)
    .where(eq(municipalities.id, params.municipalityId));

  if (!dep || !mun) throw new Error("Departamento o municipio inválido");
  if (mun.departmentId !== params.departmentId) {
    throw new Error("El municipio no pertenece al departamento seleccionado");
  }

  let localityCode = "999";
  let locLat: string | undefined;
  let locLng: string | undefined;

  if (params.localityId != null) {
    const [loc] = await db
      .select({
        id: localities.id,
        geocode: localities.geocode,
        municipalityId: localities.municipalityId,
        latitude: localities.latitude,
        longitude: localities.longitude,
      })
      .from(localities)
      .where(eq(localities.id, params.localityId as number));
    if (!loc) throw new Error("Localidad inválida");
    if (loc.municipalityId !== params.municipalityId) {
      throw new Error("La localidad no pertenece al municipio seleccionado");
    }
    localityCode = loc.geocode;
    locLat = loc.latitude ?? undefined;
    locLng = loc.longitude ?? undefined;
  }

  const geocode = `${dep.geocode}-${mun.geocode}-${localityCode}`;

  const reqLat = normalizeCoord(params.latitude);
  const reqLng = normalizeCoord(params.longitude);

  const latitude =
    reqLat ??
    (locLat ? normalizeCoord(locLat) : undefined) ??
    (mun.latitude ? normalizeCoord(mun.latitude) : undefined) ??
    (dep.latitude ? normalizeCoord(dep.latitude) : undefined);

  const longitude =
    reqLng ??
    (locLng ? normalizeCoord(locLng) : undefined) ??
    (mun.longitude ? normalizeCoord(mun.longitude) : undefined) ??
    (dep.longitude ? normalizeCoord(dep.longitude) : undefined);

  return { geocode, latitude, longitude };
}

type MultiConsultation = z.infer<typeof multiConsultationSchema>;

/* ------------------------------ Interface ------------------------------ */

export interface IStorage {
  // Users
  getUser(id: string | number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: NewUser): Promise<PublicUser>;
  getUsers(): Promise<User[]>;
  deleteUser(id: string | number): Promise<boolean>;
  updateUserPassword(id: string | number, newPassword: string): Promise<boolean>;
  updateUserStatus(id: string | number, active: boolean): Promise<boolean>;
  userExists(id: string | number): Promise<boolean>;

  // Locations
  getDepartments(): Promise<Department[]>;
  getMunicipalitiesByDepartment(departmentId: number): Promise<Municipality[]>;
  getLocalitiesByMunicipality(municipalityId: number): Promise<Locality[]>;

  // Sectors
  getSectors(): Promise<Sector[]>;
  searchSectors(query: string): Promise<Sector[]>;

  // Consultations
  createConsultation(consultation: InsertConsultation): Promise<Consultation>;
  getConsultations(filters?: ConsultationsFilter): Promise<{ consultations: Consultation[]; total: number }>;
  getConsultationsByDate(days: number, filters?: ConsultationsFilter): Promise<{ date: string; count: number }[]>;
  getConsultationsBySector(filters?: ConsultationsFilter): Promise<{ sector: string; count: number }[]>;
  getConsultationById(id: number): Promise<Consultation | undefined>;

  // Dashboard
  getConsultationStats(): Promise<{
    total: number;
    thisWeek: number;
    departments: number;
    activeSectors: number;
  }>;

  // Breakdown por nivel territorial
  getSectorBreakdown(filters?: {
    dateFrom?: Date;
    dateTo?: Date;
    departmentId?: number;
    municipalityId?: number;
    localityId?: number;
    sector?: string;
    personType?: "natural" | "juridica" | "anonimo";
    status?: "active" | "archived";
  }): Promise<
    Array<{
      departmentId: number | null;
      department: string | null;
      municipalityId: number | null;
      municipality: string | null;
      localityId: number | null;
      locality: string | null;
      sector: string;
      count: number;
    }>
  >;

  // Batch
  createConsultationsForSectors(payload: MultiConsultation): Promise<{ createdIds: number[] }>;

  // Session store
  sessionStore: any;
}

/* ------------------------------ Storage ------------------------------ */

export class DatabaseStorage implements IStorage {
  sessionStore: any;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true,
    });
  }

  /* ------------------------------ Users ------------------------------ */

  async getUser(id: string | number): Promise<User | undefined> {
    const numId = toIntId(id);
    const [userRow] = await db.select().from(usuarios).where(eq(usuarios.id, numId));
    return userRow || undefined;
  }

  // Case-insensitive




async getUserByUsername(username: string): Promise<User | undefined> {
  const [userRow] = await db
    .select()
    .from(usuarios)
    //.where(sql`${usuarios.username} ILIKE ${username}`)
    .where(sql`${usuarios.username} ILIKE ${'%' + username + '%'}`)

    .limit(1);
  return userRow || undefined;
}



  async createUser(insertUser: NewUser): Promise<PublicUser> {
    const plain = insertUser.password ?? "";
    if (plain.length < 6) throw new Error("Password must be at least 6 characters");

    const hashedPassword = await safeHash(plain);

    const username = insertUser.username;

    const inferredEmail =
      (insertUser as any).email ?? `${username.replace(/[^a-z0-9._-]/gi, "").toLowerCase()}@local`;
    const inferredNombre = (insertUser as any).nombre ?? username;

    const [row] = await db
      .insert(usuarios)
      .values({
        username,
        rol: insertUser.rol ?? "ciudadano",
        password: hashedPassword,
        email: inferredEmail,
        nombre: inferredNombre,
        active: insertUser.active ?? false,
      })
      .returning({
        id: usuarios.id,
        nombre: usuarios.nombre,
        email: usuarios.email,
        rol: usuarios.rol,
        username: usuarios.username,
        active: usuarios.active,
        createdAt: usuarios.createdAt,
      });

    return row;
  }

  async getUsers(): Promise<User[]> {
    return await db.select().from(usuarios).orderBy(usuarios.id);
  }

  async deleteUser(id: string | number): Promise<boolean> {
    const numId = toIntId(id);
    const [deleted] = await db.delete(usuarios).where(eq(usuarios.id, numId)).returning();
    return !!deleted;
  }

  async updateUserPassword(id: string | number, newPassword: string): Promise<boolean> {
    const numId = toIntId(id);
    //const hashedPassword = await safeHash(newPassword);
      const hashedPassword = await safeHash(newPassword);

    const [updated] = await db.update(usuarios).set({ password: hashedPassword }).where(eq(usuarios.id, numId)).returning();
    return !!updated;
  }

  async updateUserStatus(id: string | number, active: boolean): Promise<boolean> {
    const numId = toIntId(id);
    try {
      const [updated] = await db.update(usuarios).set({ active }).where(eq(usuarios.id, numId)).returning();
      return !!updated;
    } catch {
      return false;
    }
  }

  async userExists(id: string | number): Promise<boolean> {
    const numId = toIntId(id);
    const [row] = await db.select({ id: usuarios.id }).from(usuarios).where(eq(usuarios.id, numId));
    return !!row;
  }

  /* ------------------------------ Locations ------------------------------ */

  async getDepartments(): Promise<Department[]> {
    try {
      return await db.select().from(departments).orderBy(departments.name);
    } catch (e) {
      console.error("Drizzle getDepartments falló, usando fallback SQL:", e);
      const { rows } = await pool.query(
        `SELECT id, name, geocode, latitude, longitude
           FROM consulta.departments
          ORDER BY name`
      );
      return rows as Department[];
    }
  }

  async getMunicipalitiesByDepartment(departmentId: number): Promise<Municipality[]> {
    return await db
      .select()
      .from(municipalities)
      .where(eq(municipalities.departmentId, departmentId))
      .orderBy(municipalities.name);
  }

  async getLocalitiesByMunicipality(municipalityId: number): Promise<Locality[]> {
    return await db
      .select()
      .from(localities)
      .where(eq(localities.municipalityId, municipalityId))
      .orderBy(localities.name);
  }

  /* ------------------------------ Sectors ------------------------------ */

  async getSectors(): Promise<Sector[]> {
    return await db.select().from(sectors).where(eq(sectors.active, true)).orderBy(sectors.name);
  }

  async searchSectors(query: string): Promise<Sector[]> {
    return await db
      .select()
      .from(sectors)
      .where(and(eq(sectors.active, true), sql`${sectors.name} ILIKE ${"%" + query + "%"}`))
      .orderBy(sectors.name);
  }

  /* ------------------------------ Consultations ------------------------------ */

  async createConsultation(insertConsultation: InsertConsultation): Promise<Consultation> {
    const geo = await buildGeo({
      departmentId: insertConsultation.departmentId,
      municipalityId: insertConsultation.municipalityId,
      localityId: insertConsultation.localityId ?? undefined,
      latitude: (insertConsultation as any).latitude,
      longitude: (insertConsultation as any).longitude,
    });

    const [row] = await db
      .insert(consultations)
      .values({
        ...insertConsultation,
        images: toStringArray((insertConsultation as any).images),
        selectedSectors: toStringArray((insertConsultation as any).selectedSectors),
        geocode: geo.geocode,
        latitude: geo.latitude,
        longitude: geo.longitude,
        updatedAt: new Date(),
      })
      .returning();

    return row;
  }

  async createConsultationsForSectors(payload: MultiConsultation): Promise<{ createdIds: number[] }> {
    const { header, items } = multiConsultationSchema.parse(payload);
    const createdIds: number[] = [];

    for (const it of items) {
      const msg = String(it.message ?? "").trim();
      const imgs = toStringArray(it.images ?? []);
      if (!msg) throw new Error("Cada sector debe incluir un mensaje.");
      if (imgs.length === 0) throw new Error("Cada sector debe incluir al menos una imagen.");

      const insertRow: InsertConsultation = {
        personType: header.personType,
        firstName: header.firstName,
        lastName: header.lastName,
        identity: header.identity,
        email: header.email,
        companyName: header.companyName,
        rtn: header.rtn,
        legalRepresentative: header.legalRepresentative,
        companyContact: header.companyContact,
        mobile: header.mobile,
        phone: header.phone,
        altEmail: header.altEmail,
        departmentId: header.departmentId,
        municipalityId: header.municipalityId,
        zone: header.zone,
        localityId: (header as any).localityId === "otro" ? undefined : (header.localityId as number | undefined),
        customLocalityName: header.customLocalityName,
        latitude: header.latitude,
        longitude: header.longitude,
        message: msg,
        images: imgs,
        selectedSectors: [String(it.sector)],
        status: header.status ?? "active",
      };

      const created = await this.createConsultation(insertRow);
      createdIds.push(created.id);
    }

    return { createdIds };
  }

  async getConsultations(
    filters: ConsultationsFilter = {}
  ): Promise<{ consultations: Consultation[]; total: number }> {
    const conditions: any[] = [];

    if (filters.dateFrom) conditions.push(gte(consultations.createdAt, filters.dateFrom));
    //if (filters.dateTo) conditions.push(lte(consultations.createdAt, filters.dateTo));
    if (filters.dateTo) conditions.push(sql`${consultations.createdAt} < ${filters.dateTo}`);

    if (filters.departmentId != null) conditions.push(eq(consultations.departmentId, filters.departmentId));
    if (filters.municipalityId != null) conditions.push(eq(consultations.municipalityId, filters.municipalityId));
    if (filters.localityId != null) conditions.push(eq(consultations.localityId, filters.localityId));
    if (filters.personType) conditions.push(eq(consultations.personType, filters.personType));
    if (filters.status) conditions.push(eq(consultations.status, filters.status));
    if (filters.sector) {
      conditions.push(sql`${filters.sector} = ANY(${consultations.selectedSectors})`);
    }

    const whereClause = conditions.length ? and(...conditions) : undefined;

    const [totalResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(consultations)
      .where(whereClause);

    const rows = await db
      .select({
        c: consultations,
        d: { id: departments.id, name: departments.name },
        m: { id: municipalities.id, name: municipalities.name },
        l: { id: localities.id, name: localities.name },
      })
      .from(consultations)
      .leftJoin(departments, eq(consultations.departmentId, departments.id))
      .leftJoin(municipalities, eq(consultations.municipalityId, municipalities.id))
      .leftJoin(localities, eq(consultations.localityId, localities.id))
      .where(whereClause)
      .orderBy(desc(consultations.createdAt))
      .limit(filters?.limit ?? 50)
      .offset(filters?.offset ?? 0);

    const list: Consultation[] = rows.map((r) => ({
      ...r.c,
      department: r.d?.id ? (r.d as any) : undefined,
      municipality: r.m?.id ? (r.m as any) : undefined,
      locality: r.l?.id ? (r.l as any) : undefined,
    })) as any;

    return { consultations: list, total: totalResult.count };
  }

  async getConsultationsByDate(
    days: number,
    filters: ConsultationsFilter = {}
  ): Promise<{ date: string; count: number }[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const conds: any[] = [gte(consultations.createdAt, startDate)];
    if (filters.departmentId != null) conds.push(eq(consultations.departmentId, filters.departmentId));
    if (filters.municipalityId != null) conds.push(eq(consultations.municipalityId, filters.municipalityId));
    if (filters.localityId != null) conds.push(eq(consultations.localityId, filters.localityId));
    if (filters.personType) conds.push(eq(consultations.personType, filters.personType));
    if (filters.status) conds.push(eq(consultations.status, filters.status));
    if (filters.sector) conds.push(sql`${filters.sector} = ANY(${consultations.selectedSectors})`);

    const result = await db
      .select({
        date: sql<string>`date(${consultations.createdAt})`,
        count: sql<number>`count(*)`,
      })
      .from(consultations)
      .where(conds.length ? and(...conds) : undefined)
      .groupBy(sql`date(${consultations.createdAt})`)
      .orderBy(sql`date(${consultations.createdAt})`);

    return result;
  }

  async getConsultationsBySector(
    filters: ConsultationsFilter = {}
  ): Promise<{ sector: string; count: number }[]> {
    // Trae sectores (y aplica filtros si llegan)
    const conds: any[] = [];
    if (filters.dateFrom) conds.push(gte(consultations.createdAt, filters.dateFrom));
    //if (filters.dateTo) conds.push(lte(consultations.createdAt, filters.dateTo));
    if (filters.dateTo) conds.push(sql`${consultations.createdAt} < ${filters.dateTo}`);
    if (filters.departmentId != null) conds.push(eq(consultations.departmentId, filters.departmentId));
    if (filters.municipalityId != null) conds.push(eq(consultations.municipalityId, filters.municipalityId));
    if (filters.localityId != null) conds.push(eq(consultations.localityId, filters.localityId));
    if (filters.personType) conds.push(eq(consultations.personType, filters.personType));
    if (filters.status) conds.push(eq(consultations.status, filters.status));

    const rows = await db
      .select({ sectors: consultations.selectedSectors })
      .from(consultations)
      .where(conds.length ? and(...conds) : undefined);

    const counts: Record<string, number> = {};
    for (const r of rows as Array<{ sectors: any }>) {
      const arr = toStringArray(r.sectors);
      for (const s of arr) counts[s] = (counts[s] || 0) + 1;
    }

    return Object.entries(counts)
      .map(([sector, count]) => ({ sector, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  async getConsultationById(id: number): Promise<Consultation | undefined> {
    const [row] = await db.select().from(consultations).where(eq(consultations.id, id));
    return row || undefined;
  }

  /* ------------------------------ Dashboard ------------------------------ */

  async getConsultationStats(): Promise<{
    total: number;
    thisWeek: number;
    departments: number;
    activeSectors: number;
  }> {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const [totalResult] = await db.select({ count: sql<number>`count(*)` }).from(consultations);

    const [thisWeekResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(consultations)
      .where(gte(consultations.createdAt, oneWeekAgo));

    const [departmentsResult] = await db
      .select({ count: sql<number>`count(distinct ${consultations.departmentId})` })
      .from(consultations);

    const [sectorsResult] = await db.select({ count: sql<number>`count(*)` }).from(sectors).where(eq(sectors.active, true));

    return {
      total: totalResult.count,
      thisWeek: thisWeekResult.count,
      departments: departmentsResult.count,
      activeSectors: sectorsResult.count,
    };
  }

  async getSectorBreakdown(filters?: {
    dateFrom?: Date;
    dateTo?: Date;
    departmentId?: number;
    municipalityId?: number;
    localityId?: number;
    sector?: string;
    personType?: "natural" | "juridica" | "anonimo";
    status?: "active" | "archived";
  }): Promise<
    Array<{
      departmentId: number | null;
      department: string | null;
      municipalityId: number | null;
      municipality: string | null;
      localityId: number | null;
      locality: string | null;
      sector: string;
      count: number;
    }>
  > {
    const conds: any[] = [];
    if (filters?.dateFrom) conds.push(sql`c.created_at >= ${filters.dateFrom}`);
   // if (filters?.dateTo) conds.push(sql`c.created_at <= ${filters.dateTo}`);
    if (filters?.dateTo) conds.push(sql`c.created_at < ${filters.dateTo}`);

    if (filters?.departmentId != null) conds.push(sql`c.department_id = ${filters.departmentId}`);
    if (filters?.municipalityId != null) conds.push(sql`c.municipality_id = ${filters.municipalityId}`);
    if (filters?.localityId != null) conds.push(sql`c.locality_id = ${filters.localityId}`);
    if (filters?.personType) conds.push(sql`c.person_type = ${filters.personType}`);
    if (filters?.status) conds.push(sql`c.status = ${filters.status}`);
    if (filters?.sector) conds.push(sql`s.sector = ${filters.sector}`);

    const whereSql = conds.length ? sql`WHERE ${sql.join(conds, sql` AND `)}` : sql``;

    const result = await db.execute<{
      department_id: number | null;
      department: string | null;
      municipality_id: number | null;
      municipality: string | null;
      locality_id: number | null;
      locality: string | null;
      sector: string;
      count: number;
    }>(sql`
      WITH c AS (
        SELECT department_id, municipality_id, locality_id, person_type, status, created_at, selected_sectors
        FROM consulta.consultations
      ),
      s AS (
        SELECT c.department_id, c.municipality_id, c.locality_id, c.person_type, c.status, c.created_at,
               unnest(c.selected_sectors) AS sector
        FROM c
      )
      SELECT
        d.id   AS department_id, d.name AS department,
        m.id   AS municipality_id, m.name AS municipality,
        l.id   AS locality_id,     l.name AS locality,
        s.sector AS sector,
        COUNT(*)::int AS count
      FROM s
      LEFT JOIN consulta.departments    d ON d.id = s.department_id
      LEFT JOIN consulta.municipalities m ON m.id = s.municipality_id
      LEFT JOIN consulta.localities     l ON l.id = s.locality_id
      ${whereSql}
      GROUP BY d.id, d.name, m.id, m.name, l.id, l.name, s.sector
      ORDER BY d.name NULLS LAST, m.name NULLS LAST, l.name NULLS LAST, s.sector ASC;
    `);

    return result.rows.map((r) => ({
      departmentId: r.department_id,
      department: r.department,
      municipalityId: r.municipality_id,
      municipality: r.municipality,
      localityId: r.locality_id,
      locality: r.locality,
      sector: r.sector,
      count: Number(r.count || 0),
    }));
  }
}

/* ------------------------------ Export ------------------------------ */

export const storage: IStorage = new DatabaseStorage();
