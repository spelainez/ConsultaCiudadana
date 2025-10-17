import { Express, Request, Response, NextFunction } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";

interface AuthUser { id: string; username: string; role: string; }
declare global { namespace Express { interface Request { user?: AuthUser; } } }

const JWT_SECRET = (() => {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error("SESSION_SECRET no está definido");
  if (s.length < 32) console.warn("WARNING: SESSION_SECRET debería tener >= 32 chars");
  return s;
})();
const JWT_EXPIRES_IN = "7d";

interface JwtPayload { id: string; username: string; role: string; iat?: number; exp?: number; }

//export async function hashPassword(password: string) { return bcrypt.hash(password, 12); }
export async function hashPassword(password: string) {
  const plain = String(password); // ¡no hagas trim/lower al password!
  // evita re-hashear si por error te mandan un hash ya hecho
  if (/^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(plain)) {
    throw new Error("Password parece ya un hash bcrypt. Envía la contraseña en texto plano.");
  }
  const hash = await bcrypt.hash(plain, 12);
  // sanity check: debe ser true siempre
  if (!(await bcrypt.compare(plain, hash))) {
    throw new Error("Hash mismatch inesperado al generar.");
  }
  return hash;
}


export async function comparePasswords(supplied: string, stored: string) { return bcrypt.compare(supplied, stored); }

export function generateToken(user: SelectUser): string {
  return jwt.sign({ id: user.id, username: user.username, role: user.rol }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): JwtPayload | null {
  try { return jwt.verify(token, JWT_SECRET) as JwtPayload; } catch { return null; }
}

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: "Demasiados intentos. Intenta en 15 minutos." },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : req.cookies?.token;
  if (!token) return res.status(401).json({ error: "Token requerido" });
  const decoded = verifyToken(token);
  if (!decoded) return res.status(401).json({ error: "Token inválido o expirado" });
  req.user = { id: decoded.id, username: decoded.username, role: decoded.role };
  next();
}

export function requireRole(roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: "Autenticación requerida" });
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: "Sin permisos" });
    next();
  };
}

export function setupAuth(app: Express) {
  app.set("trust proxy", 1);

app.post("/api/login", loginLimiter, async (req, res) => {
  try {
    const { username, password } = req.body ?? {};
    if (typeof username !== "string" || typeof password !== "string") {
      return res.status(400).json({ error: "Usuario y contraseña son requeridos" });
    }

    const user = await storage.getUserByUsername(username);

    // ⬇️ LOG de diagnóstico
    console.log('[login] candidate:', {
      reqUser: username,
      foundUser: user?.username,
      active: user?.active,
      hashLen: String(user?.password ?? '').length,
      hashPrefix: String(user?.password ?? '').slice(0, 7), // ej: $2b$12$
    });

    if (!user) {
      console.warn(`[login] user not found: ${username}`);
      return res.status(401).json({ error: "Usuario o contraseña incorrectos" });
    }

    if (typeof user.password !== "string" || user.password.length < 10 || !/^\$2[aby]\$/.test(user.password)) {
      console.error("[login] password hash inválido en DB para user id:", user.id);
      return res.status(500).json({ error: "Configuración de credenciales inválida" });
    }

    let isValid = false;
    try {
      isValid = await comparePasswords(password, user.password);
    } catch (e) {
      console.error("[login] bcrypt.compare error:", e);
      return res.status(500).json({ error: "Error al validar credenciales" });
    }

    // ⬇️ LOG de resultado de compare
    console.log('[login] compare result:', isValid);

    if (!isValid) {
      return res.status(401).json({ error: "Usuario o contraseña incorrectos" });
    }

      const token = generateToken(user);
      const isProd = process.env.NODE_ENV === "production";
      res.cookie("token", token, {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? "strict" : "lax",
        path: "/",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      const { password: _omit, ...userWithoutPassword } = user as any;
      res.json(userWithoutPassword);

    } catch (error: any) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Error interno del servidor", detail: error?.message });
    }
  });

  app.post("/api/logout", (_req, res) => {
    const isProd = process.env.NODE_ENV === "production";
    res.clearCookie("token", {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? "strict" : "lax",
      path: "/",
    });
    res.json({ message: "Sesión cerrada exitosamente" });
  });

  app.get("/api/user", (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : req.cookies?.token;
    if (!token) return res.status(401).json({ error: "No authenticated user" });
    const decoded = verifyToken(token);
    if (!decoded) return res.status(401).json({ error: "Invalid or expired token" });
    res.json({ id: decoded.id, username: decoded.username, role: decoded.role, createdAt: new Date() });
  });
}