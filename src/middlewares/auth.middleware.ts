import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthRequest extends Request {
  userId?: number;
  role?: string;
}

const JWT_SECRET = process.env.JWT_SECRET as string;

export function authenticate(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers["authorization"];
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Authorization header missing or malformed" });
    return;
  }
  const token = authHeader.split(" ")[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: number; role: string };
    req.userId = payload.userId;
    req.role = payload.role;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function requireHost(req: AuthRequest, res: Response, next: NextFunction): void {
  if (req.role === "HOST" || req.role === "ADMIN") {
    next();
    return;
  }
  res.status(403).json({ error: "Access denied. Hosts only." });
}

export function requireGuest(req: AuthRequest, res: Response, next: NextFunction): void {
  if (req.role === "GUEST" || req.role === "ADMIN") {
    next();
    return;
  }
  res.status(403).json({ error: "Access denied. Guests only." });
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction): void {
  if (req.role === "ADMIN") {
    next();
    return;
  }
  res.status(403).json({ error: "Access denied. Admins only." });
}
