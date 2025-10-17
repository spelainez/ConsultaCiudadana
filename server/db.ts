import "dotenv/config";
import { Pool } from "pg";
import { drizzle, NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "@shared/schema";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error("Falta DATABASE_URL en .env");

const isProd = process.env.NODE_ENV === "production";

export const pgPool = new Pool({
  connectionString: DATABASE_URL,
  ssl: isProd ? { rejectUnauthorized: false } : undefined,
});

pgPool.on("connect", (client) => {
  client.query("SET search_path TO consulta, public");
});

export const db: NodePgDatabase<typeof schema> = drizzle(pgPool, {
  schema,
  logger: true,
});
