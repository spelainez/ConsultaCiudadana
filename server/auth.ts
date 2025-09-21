import { Express, Request, Response, NextFunction } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";

// Simplified auth context interface
interface AuthUser {
  id: string;
  username: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

// Validate JWT secret at startup
const JWT_SECRET = (() => {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET environment variable is required for JWT authentication");
  }
  if (secret.length < 32) {
    console.warn("WARNING: SESSION_SECRET should be at least 32 characters for security");
  }
  return secret;
})();
const JWT_EXPIRES_IN = "24h";

// JWT payload type
interface JwtPayload {
  id: string;
  username: string;
  role: string;
  iat?: number;
  exp?: number;
}

// bcrypt password hashing
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
}

export async function comparePasswords(supplied: string, stored: string): Promise<boolean> {
  return await bcrypt.compare(supplied, stored);
}

// JWT functions
export function generateToken(user: SelectUser): string {
  return jwt.sign(
    { 
      id: user.id, 
      username: user.username, 
      role: user.role 
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET, {
      algorithms: ['HS256']
    }) as JwtPayload;
  } catch (error) {
    return null;
  }
}

// Rate limiting for login attempts
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: {
    error: "Demasiados intentos de inicio de sesión. Intente nuevamente en 15 minutos."
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

// JWT Authentication middleware
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') 
    ? authHeader.slice(7) 
    : req.cookies?.token;

  if (!token) {
    return res.status(401).json({ error: "Token de acceso requerido" });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: "Token inválido o expirado" });
  }

  // Store minimal auth context
  req.user = {
    id: decoded.id,
    username: decoded.username,
    role: decoded.role
  };

  next();
}

// Role-based authorization middleware
export function requireRole(roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Autenticación requerida" });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "No tiene permisos para acceder a este recurso" });
    }
    
    next();
  };
}

export function setupAuth(app: Express) {
  // Enable trust proxy for rate limiting
  app.set("trust proxy", 1);

  // Login endpoint with rate limiting
  app.post("/api/login", loginLimiter, async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ error: "Usuario y contraseña son requeridos" });
      }

      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ error: "Usuario o contraseña incorrectos" });
      }

      const isValidPassword = await comparePasswords(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ error: "Usuario o contraseña incorrectos" });
      }

      const token = generateToken(user);
      
      // Set HTTP-only cookie for web app
      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
      });

      // Return user data (without password)
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);

    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  // Logout endpoint
  app.post("/api/logout", (req: Request, res: Response) => {
    res.clearCookie('token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/'
    });
    res.json({ message: "Sesión cerrada exitosamente" });
  });

  // Get current user endpoint (allows unauthenticated access for frontend compatibility)
  app.get("/api/user", (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') 
      ? authHeader.slice(7) 
      : req.cookies?.token;

    if (!token) {
      return res.status(401).json({ error: "No authenticated user" });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    // Return user data without password
    res.json({
      id: decoded.id,
      username: decoded.username,
      role: decoded.role,
      createdAt: new Date() // Frontend expects this field
    });
  });
}