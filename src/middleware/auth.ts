import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthenticatedUser {
  id: number;
  phone?: string;
  email?: string;
  role: "superadmin" | "creator" | "admin" | "staff" | "customer";
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

export const authenticateToken = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    res.status(401).json({ success: false, message: "Access token is required" });
    return;
  }

  const secret = process.env.JWT_SECRET || "super_secret_jwt_key_blog_post_2026_x89a";

  try {
    const decoded = jwt.verify(token, secret) as AuthenticatedUser;
    req.user = decoded;
    next();
  } catch (error) {
    res.status(403).json({ success: false, message: "Invalid or expired token" });
  }
};

export const requireSuperAdmin = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user || req.user.role !== "superadmin") {
    res.status(403).json({
      success: false,
      message: "Forbidden: Only Super Admin is allowed to perform this operation",
    });
    return;
  }
  next();
};

export const requireAdmin = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user || (req.user.role !== "admin" && req.user.role !== "superadmin")) {
    res.status(403).json({ success: false, message: "Admin authorization required" });
    return;
  }
  next();
};

export const requireSuperAdminOrCreator = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  if (
    !req.user ||
    (req.user.role !== "superadmin" && req.user.role !== "creator" && req.user.role !== "admin")
  ) {
    res.status(403).json({
      success: false,
      message: "Forbidden: Super Admin or Creator role required",
    });
    return;
  }
  next();
};

