import { 
  users, 
  departments, 
  municipalities, 
  localities, 
  sectors, 
  consultations,
  type User, 
  type InsertUser,
  type Department,
  type Municipality,
  type Locality,
  type Sector,
  type Consultation,
  type InsertConsultation,
  type InsertDepartment,
  type InsertMunicipality,
  type InsertLocality,
  type InsertSector
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, lte, like, sql, desc } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";
import bcrypt from "bcrypt";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getUsers(): Promise<User[]>;
  deleteUser(id: string): Promise<boolean>;
  updateUserPassword(id: string, newPassword: string): Promise<boolean>;
  updateUserStatus(id: string, active: boolean): Promise<boolean>;

  // Locations
  getDepartments(): Promise<Department[]>;
  getMunicipalitiesByDepartment(departmentId: string): Promise<Municipality[]>;
  getLocalitiesByMunicipality(municipalityId: string): Promise<Locality[]>;
  
  // Sectors
  getSectors(): Promise<Sector[]>;
  searchSectors(query: string): Promise<Sector[]>;

  // Consultations
  createConsultation(consultation: InsertConsultation): Promise<Consultation>;
  getConsultations(filters?: {
    dateFrom?: Date;
    dateTo?: Date;
    departmentId?: string;
    sector?: string;
    offset?: number;
    limit?: number;
  }): Promise<{ consultations: Consultation[]; total: number }>;
  getConsultationById(id: string): Promise<Consultation | undefined>;
  
  // Dashboard stats
  getConsultationStats(): Promise<{
    total: number;
    thisWeek: number;
    departments: number;
    activeSectors: number;
  }>;
  getConsultationsByDate(days: number): Promise<{ date: string; count: number }[]>;
  getConsultationsBySector(): Promise<{ sector: string; count: number }[]>;

  // Session store
  sessionStore: any;
}

export class DatabaseStorage implements IStorage {
  sessionStore: any;

  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true 
    });
  }

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    // Hash password before storing
    const hashedPassword = await bcrypt.hash(insertUser.password, 12);
    
    const [user] = await db
      .insert(users)
      .values({
        ...insertUser,
        password: hashedPassword
      })
      .returning();
    return user;
  }

  async getUsers(): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .orderBy(users.createdAt);
  }

  async deleteUser(id: string): Promise<boolean> {
    const [deleted] = await db
      .delete(users)
      .where(eq(users.id, id))
      .returning();
    return !!deleted;
  }

  async updateUserPassword(id: string, newPassword: string): Promise<boolean> {
    // Hash password before updating
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    
    const [updated] = await db
      .update(users)
      .set({ password: hashedPassword })
      .where(eq(users.id, id))
      .returning();
    return !!updated;
  }

  async updateUserStatus(id: string, active: boolean): Promise<boolean> {
    const [updated] = await db
      .update(users)
      .set({ active })
      .where(eq(users.id, id))
      .returning();
    return !!updated;
  }

  async getDepartments(): Promise<Department[]> {
    return await db.select().from(departments).orderBy(departments.name);
  }

  async getMunicipalitiesByDepartment(departmentId: string): Promise<Municipality[]> {
    return await db
      .select()
      .from(municipalities)
      .where(eq(municipalities.departmentId, departmentId))
      .orderBy(municipalities.name);
  }

  async getLocalitiesByMunicipality(municipalityId: string): Promise<Locality[]> {
    return await db
      .select()
      .from(localities)
      .where(eq(localities.municipalityId, municipalityId))
      .orderBy(localities.name);
  }

  async getSectors(): Promise<Sector[]> {
    return await db
      .select()
      .from(sectors)
      .where(eq(sectors.active, true))
      .orderBy(sectors.name);
  }

  async searchSectors(query: string): Promise<Sector[]> {
    return await db
      .select()
      .from(sectors)
      .where(
        and(
          eq(sectors.active, true),
          sql`${sectors.name} ILIKE ${`%${query}%`}`
        )
      )
      .orderBy(sectors.name);
  }

  async createConsultation(insertConsultation: InsertConsultation): Promise<Consultation> {
    // Fetch and validate location hierarchy with relational integrity
    const [department] = await db
      .select({ geocode: departments.geocode })
      .from(departments)
      .where(eq(departments.id, insertConsultation.departmentId));
    
    const [municipality] = await db
      .select({ 
        geocode: municipalities.geocode,
        departmentId: municipalities.departmentId 
      })
      .from(municipalities)
      .where(eq(municipalities.id, insertConsultation.municipalityId));
    
    const [locality] = await db
      .select({ 
        geocode: localities.geocode,
        municipalityId: localities.municipalityId
      })
      .from(localities)
      .where(eq(localities.id, insertConsultation.localityId));
    
    if (!department || !municipality || !locality) {
      throw new Error('Invalid location IDs provided');
    }
    
    // Enforce relational integrity
    if (municipality.departmentId !== insertConsultation.departmentId) {
      throw new Error('Municipality does not belong to the selected department');
    }
    
    if (locality.municipalityId !== insertConsultation.municipalityId) {
      throw new Error('Locality does not belong to the selected municipality');
    }
    
    // Generate geocode from the actual geocode values in the database
    const geocode = `${department.geocode}-${municipality.geocode}-${locality.geocode}`;
    
    const [consultation] = await db
      .insert(consultations)
      .values({
        ...insertConsultation,
        geocode,
        updatedAt: new Date(),
      })
      .returning();
    return consultation;
  }

  async getConsultations(filters?: {
    dateFrom?: Date;
    dateTo?: Date;
    departmentId?: string;
    sector?: string;
    offset?: number;
    limit?: number;
  }): Promise<{ consultations: Consultation[]; total: number }> {
    const conditions = [];
    
    if (filters?.dateFrom) {
      conditions.push(gte(consultations.createdAt, filters.dateFrom));
    }
    if (filters?.dateTo) {
      conditions.push(lte(consultations.createdAt, filters.dateTo));
    }
    if (filters?.departmentId) {
      conditions.push(eq(consultations.departmentId, filters.departmentId));
    }
    if (filters?.sector) {
      conditions.push(sql`${filters.sector} = ANY(${consultations.selectedSectors})`);
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(consultations)
      .where(whereClause);

    const consultationsList = await db
      .select()
      .from(consultations)
      .where(whereClause)
      .orderBy(desc(consultations.createdAt))
      .limit(filters?.limit || 50)
      .offset(filters?.offset || 0);

    return {
      consultations: consultationsList,
      total: totalResult.count,
    };
  }

  async getConsultationById(id: string): Promise<Consultation | undefined> {
    const [consultation] = await db
      .select()
      .from(consultations)
      .where(eq(consultations.id, id));
    return consultation || undefined;
  }

  async getConsultationStats(): Promise<{
    total: number;
    thisWeek: number;
    departments: number;
    activeSectors: number;
  }> {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const [totalResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(consultations);

    const [thisWeekResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(consultations)
      .where(gte(consultations.createdAt, oneWeekAgo));

    const [departmentsResult] = await db
      .select({ count: sql<number>`count(distinct ${consultations.departmentId})` })
      .from(consultations);

    const [sectorsResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(sectors)
      .where(eq(sectors.active, true));

    return {
      total: totalResult.count,
      thisWeek: thisWeekResult.count,
      departments: departmentsResult.count,
      activeSectors: sectorsResult.count,
    };
  }

  async getConsultationsByDate(days: number): Promise<{ date: string; count: number }[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const result = await db
      .select({
        date: sql<string>`date(${consultations.createdAt})`,
        count: sql<number>`count(*)`
      })
      .from(consultations)
      .where(gte(consultations.createdAt, startDate))
      .groupBy(sql`date(${consultations.createdAt})`)
      .orderBy(sql`date(${consultations.createdAt})`);

    return result;
  }

  async getConsultationsBySector(): Promise<{ sector: string; count: number }[]> {
    const result = await db
      .select({
        sectors: consultations.selectedSectors,
      })
      .from(consultations);

    // Process the sectors array to count occurrences
    const sectorCounts: Record<string, number> = {};
    
    result.forEach(row => {
      row.sectors.forEach(sector => {
        sectorCounts[sector] = (sectorCounts[sector] || 0) + 1;
      });
    });

    return Object.entries(sectorCounts)
      .map(([sector, count]) => ({ sector, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10 sectors
  }
}

export const storage = new DatabaseStorage();
