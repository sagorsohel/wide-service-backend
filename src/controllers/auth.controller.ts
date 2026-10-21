import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { eq, or } from "drizzle-orm";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { AuthenticatedRequest } from "../middleware/auth.js";
import { getAuth } from "firebase-admin/auth";
import { firebaseApp } from "../config/firebase.js";

const JWT_SECRET = process.env.JWT_SECRET || "super_secret_jwt_key_blog_post_2026_x89a";

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, phone, email, password, role, avatar } = req.body;

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
      avatar: avatar || null,
    });

    const newUserId = insertResult[0].insertId;

    const token = jwt.sign(
      { id: newUserId, phone, role: assignedRole },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Sync with Firebase Admin Auth if Firebase SDK is configured
    let firebaseCustomToken: string | null = null;
    if (firebaseApp) {
      try {
        const fbAuth = getAuth(firebaseApp);
        const fbUid = `user_${newUserId}`;

        let formattedPhone: string | undefined = undefined;
        if (phone) {
          const digits = phone.replace(/[^0-9+]/g, "");
          if (digits.startsWith("+")) formattedPhone = digits;
          else if (digits.startsWith("880")) formattedPhone = `+${digits}`;
          else if (digits.startsWith("01")) formattedPhone = `+88${digits}`;
        }

        try {
          await fbAuth.createUser({
            uid: fbUid,
            email: email || undefined,
            phoneNumber: formattedPhone,
            displayName: name,
            password: password,
          });
        } catch (fbCreateErr: any) {
          console.warn("[firebase-auth] Note on Firebase user creation (non-fatal):", fbCreateErr.message);
        }

        firebaseCustomToken = await fbAuth.createCustomToken(fbUid, {
          role: assignedRole,
          name,
        });
      } catch (fbErr: any) {
        console.warn("[firebase-auth] Note on Firebase token creation (non-fatal):", fbErr.message);
      }
    }

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: {
        id: newUserId,
        name,
        displayName: name,
        phone,
        email,
        role: assignedRole,
        avatar: avatar || null,
        photoURL: avatar || null,
        servicesViewed: 0,
        detailsViewed: 0,
        callsClicked: 0,
        token,
        firebaseToken: firebaseCustomToken,
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
      res.status(401).json({ success: false, message: "Invalid phone number/email or password" });
      return;
    }

    const user = existingUsers[0];
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      res.status(401).json({ success: false, message: "Invalid phone number/email or password" });
      return;
    }

    const token = jwt.sign(
      { id: user.id, phone: user.phone, role: user.role },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Generate Firebase custom token if Firebase Admin SDK is initialized
    let firebaseCustomToken: string | null = null;
    if (firebaseApp) {
      try {
        const fbAuth = getAuth(firebaseApp);
        firebaseCustomToken = await fbAuth.createCustomToken(`user_${user.id}`, {
          role: user.role,
          name: user.name,
        });
      } catch (fbErr: any) {
        // Non-fatal warning
      }
    }

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        id: user.id,
        name: user.name,
        displayName: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role,
        avatar: user.avatar || null,
        photoURL: user.avatar || null,
        servicesViewed: user.servicesViewed || 0,
        detailsViewed: user.detailsViewed || 0,
        callsClicked: user.callsClicked || 0,
        token,
        firebaseToken: firebaseCustomToken,
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
        avatar: users.avatar,
        servicesViewed: users.servicesViewed,
        detailsViewed: users.detailsViewed,
        callsClicked: users.callsClicked,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, req.user.id))
      .limit(1);

    if (userList.length === 0) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    const u = userList[0];
    res.status(200).json({
      success: true,
      data: {
        ...u,
        photoURL: u.avatar || null,
        displayName: u.name,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || "Failed to fetch profile" });
  }
};

export const googleAuth = async (req: Request, res: Response): Promise<void> => {
  try {
    const { idToken, email, name, photoURL } = req.body;

    let userEmail = email;
    let userName = name;
    let userPhoto = photoURL;

    // Verify token with Firebase Admin if idToken is provided and firebaseApp is initialized
    if (idToken && firebaseApp) {
      try {
        const decoded = await getAuth(firebaseApp).verifyIdToken(idToken);
        userEmail = decoded.email || userEmail;
        userName = decoded.name || userName;
        userPhoto = decoded.picture || userPhoto;
      } catch (err: any) {
        console.warn("[google-auth] Token verification note:", err.message);
      }
    }

    if (!userEmail) {
      res.status(400).json({ success: false, message: "Email is required for Google Sign-In" });
      return;
    }

    // Check if user exists in database
    const existing = await db
      .select()
      .from(users)
      .where(eq(users.email, userEmail))
      .limit(1);

    let user: any;
    if (existing.length > 0) {
      user = existing[0];
    } else {
      // Create new user with customer role
      const randomPhone = `01${Math.floor(100000000 + Math.random() * 900000000)}`;
      const dummyPassword = await bcrypt.hash(Math.random().toString(36), 10);
      const insertResult = await db.insert(users).values({
        name: userName || "Google User",
        email: userEmail,
        phone: randomPhone,
        password: dummyPassword,
        role: "customer",
      });
      const newId = insertResult[0].insertId;
      user = {
        id: newId,
        name: userName || "Google User",
        email: userEmail,
        phone: randomPhone,
        role: "customer",
      };
    }

    const token = jwt.sign(
      { id: user.id, phone: user.phone, role: user.role },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(200).json({
      success: true,
      message: "Google authentication successful",
      data: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role,
        photoURL: userPhoto,
        token,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || "Failed to authenticate with Google" });
  }
};

