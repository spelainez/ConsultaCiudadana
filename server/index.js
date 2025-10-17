// server/index.js
const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Ping de salud
app.get("/api/health", (_req, res) => res.json({ ok: true }));

// Login de prueba (sin BD) solo para descartar errores 500
const USERS = [{ id: 1, username: "Jess123", password: "Admin!" }];

app.post("/api/login", (req, res, next) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ message: "username y password son requeridos" });
    }
    const u = USERS.find(x => x.username === username);
    if (!u || u.password !== password) {
      return res.status(401).json({ message: "Credenciales inválidas" });
    }
    res.json({ token: "dev-token", user: { id: u.id, username: u.username } });
  } catch (err) {
    next(err);
  }
});

// handler de errores (para ver el stack y no morir en 500 silencioso)
app.use((err, _req, res, _next) => {
  console.error("ERROR /api:", err);
  res.status(500).json({ message: "Error interno", detail: err.message });
});

app.listen(PORT, () => console.log(`API en http://localhost:${PORT}`));
