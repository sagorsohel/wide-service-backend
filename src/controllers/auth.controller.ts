import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { eq, or } from "drizzle-orm";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { AuthenticatedRequest } from "../middleware/auth.js";

const JWT_SECRET = process.env.JWT_SECRET || "super_secret_jwt_key_blog_post_2026_x89a";

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, phone, email, password, role } = req.body;

    if (!name || !phone || !password) {
      res.status(400).json({ success: false, message: "Name, phone and password are required" });
      return;
    }

    const existingUsers = await db
      .select()
      .from(users)
      .where(or(eq(users.phone, phone), email ? eq(users.email, email) : undefined))
      .limit(1);

    if (existingUsers.length > 0) {
      res.status(409).json({ success: false, message: "User with this phone or email already exists" });
      return;
    }

    // Public registration only permits 'creator' or 'customer' roles
    let assignedRole: "superadmin" | "creator" | "admin" | "staff" | "customer" = "customer";
    if (role === "creator") {
      assignedRole = "creator";
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const insertResult = await db.insert(users).values({
      name,
      phone,
      email: email || null,
      password: hashedPassword,
      role: assignedRole,
    });

    const newUserId = insertResult[0].insertId;

    const token = jwt.sign(
      { id: newUserId, phone, role: assignedRole },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: {
        id: newUserId,
        name,
        phone,
        email,
        role: assignedRole,
        token,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || "Failed to register user" });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { phone, email, identifier, password } = req.body;
    const loginIdentifier = phone || email || identifier;

    if (!loginIdentifier || !password) {
      res.status(400).json({ success: false, message: "Phone/Email and password are required" });
      return;
    }

    // Match either phone or email
    const existingUsers = await db
      .select()
      .from(users)
      .where(or(eq(users.phone, loginIdentifier), eq(users.email, loginIdentifier)))
      .limit(1);

    if (existingUsers.length === 0) {
      res.status(401).json({ success: false, message: "Invalid phone number or password" });
      return;
    }

    const user = existingUsers[0];
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      res.status(401).json({ success: false, message: "Invalid phone number or password" });
      return;
    }

    const token = jwt.sign(
      { id: user.id, phone: user.phone, role: user.role },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role,
        token,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || "Failed to login" });
  }
};

export const getMe = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const userList = await db
      .select({
        id: users.id,
        name: users.name,
        phone: users.phone,
        email: users.email,
        role: users.role,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, req.user.id))
      .limit(1);

    if (userList.length === 0) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    res.status(200).json({ success: true, data: userList[0] });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || "Failed to fetch profile" });
  }
};
