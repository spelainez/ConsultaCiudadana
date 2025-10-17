// scripts/check-login.js
// Ejecuta: node scripts/check-login.js

require("dotenv").config();
const { Pool } = require("pg");
const bcrypt = require("bcrypt");

// Cambia estos si quieres probar otro usuario/clave
const USERNAME = "Jess123";
const PLAIN = "cv!";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

(async () => {
  const client = await pool.connect();
  try {
    // Muy importante: usa el esquema correcto
    await client.query("SET search_path TO consulta, public");

    const { rows } = await client.query(
      `SELECT id::text AS id, username, rol, email, password
         FROM usuarios
        WHERE lower(username) = lower($1) OR lower(email) = lower($1)
        LIMIT 1`,
      [USERNAME]
    );

    console.log("row =", rows[0] || null);
    if (!rows[0]) return;

    const ok = await bcrypt.compare(PLAIN, rows[0].password);
    console.log("bcrypt.compare =", ok);
  } catch (e) {
    console.error(e);
  } finally {
    client.release();
    await pool.end();
  }
})();
