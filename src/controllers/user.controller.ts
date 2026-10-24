import { Request, Response } from "express";
import { eq, and, desc, sql, count, or, like } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db, poolConnection } from "../db/index.js";
import { users, services, userFavorites, userRecentServices, categories } from "../db/schema.js";
import { AuthenticatedRequest } from "../middleware/auth.js";

/**
 * Get current logged in user's profile and stats from database
 */
export const getProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const userRecords = await db
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

    if (userRecords.length === 0) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    const [recentCountResult] = await poolConnection.query(
      `SELECT COUNT(*) as count FROM user_recent_services WHERE user_id = ?`,
      [req.user.id]
    );
    const realViews = Number((recentCountResult as any)?.[0]?.count) || 0;

    const u = userRecords[0];
    res.status(200).json({
      success: true,
      data: {
        ...u,
        servicesViewed: realViews,
        detailsViewed: realViews,
        photoURL: u.avatar || null,
        displayName: u.name,
      },
    });
  } catch (error: any) {
    console.error("[user.controller] getProfile error:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to fetch profile" });
  }
};

/**
 * Update current logged-in user profile in database
 */
export const updateProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const { name, phone, email, avatar } = req.body;

    if (!name || !name.trim()) {
      res.status(400).json({ success: false, message: "Name is required" });
      return;
    }

    const cleanPhone = phone && String(phone).trim() ? String(phone).trim() : null;
    const cleanEmail = email && String(email).trim() ? String(email).trim() : null;

    // Check if phone or email is already taken by another user
    if (cleanPhone || cleanEmail) {
      const existing = await db
        .select({ id: users.id })
        .from(users)
        .where(sql`${users.id} != ${req.user.id} AND (${cleanPhone ? sql`${users.phone} = ${cleanPhone}` : sql`1=0`} OR (${cleanEmail ? sql`${users.email} = ${cleanEmail}` : sql`1=0`}))`)
        .limit(1);

      if (existing.length > 0) {
        res.status(409).json({ success: false, message: "Phone or email already in use by another account" });
        return;
      }
    }

    const updateFields: any = {
      name: name.trim(),
      phone: cleanPhone,
      email: cleanEmail,
    };

    if (avatar !== undefined) {
      updateFields.avatar = avatar;
    }

    await db.update(users).set(updateFields).where(eq(users.id, req.user.id));

    const updatedUserList = await db
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
      })
      .from(users)
      .where(eq(users.id, req.user.id))
      .limit(1);

    const [recentCountResult] = await poolConnection.query(
      `SELECT COUNT(*) as count FROM user_recent_services WHERE user_id = ?`,
      [req.user.id]
    );
    const realViews = Number((recentCountResult as any)?.[0]?.count) || 0;

    const userObj = updatedUserList[0];
    res.status(200).json({
      success: true,
      message: "Profile updated successfully in database",
      data: {
        ...userObj,
        servicesViewed: realViews,
        detailsViewed: realViews,
        photoURL: userObj.avatar || null,
        displayName: userObj.name,
      },
    });
  } catch (error: any) {
    console.error("[user.controller] updateProfile error:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to update profile" });
  }
};

/**
 * Increment user activity stats in database
 */
export const incrementStats = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const { type, count = 1 } = req.body;
    const incrementAmount = Math.max(1, Number(count) || 1);

    if (type === "services") {
      await db
        .update(users)
        .set({ servicesViewed: sql`${users.servicesViewed} + ${incrementAmount}` })
        .where(eq(users.id, req.user.id));
    } else if (type === "details") {
      await db
        .update(users)
        .set({ detailsViewed: sql`${users.detailsViewed} + ${incrementAmount}` })
        .where(eq(users.id, req.user.id));
    } else if (type === "calls") {
      await db
        .update(users)
        .set({ callsClicked: sql`${users.callsClicked} + ${incrementAmount}` })
        .where(eq(users.id, req.user.id));
    } else {
      res.status(400).json({ success: false, message: "Invalid stat type. Must be 'services', 'details', or 'calls'." });
      return;
    }

    const updated = await db
      .select({
        servicesViewed: users.servicesViewed,
        detailsViewed: users.detailsViewed,
        callsClicked: users.callsClicked,
      })
      .from(users)
      .where(eq(users.id, req.user.id))
      .limit(1);

    res.status(200).json({
      success: true,
      message: "Stats updated successfully",
      data: updated[0],
    });
  } catch (error: any) {
    console.error("[user.controller] incrementStats error:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to update stats" });
  }
};

/**
 * Get all favorite services for the logged-in user
 */
export const getFavorites = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const favList = await db
      .select({
        service: services,
        categoryName: categories.name,
      })
      .from(userFavorites)
      .innerJoin(services, eq(userFavorites.serviceId, services.id))
      .leftJoin(categories, eq(services.categoryId, categories.id))
      .where(eq(userFavorites.userId, req.user.id))
      .orderBy(desc(userFavorites.createdAt));

    const formatted = favList.map((item) => ({
      ...item.service,
      categoryName: item.categoryName || undefined,
      images: item.service.images ? (typeof item.service.images === "string" ? (() => { try { return JSON.parse(item.service.images); } catch { return [item.service.images]; } })() : item.service.images) : [],
    }));

    res.status(200).json({
      success: true,
      data: formatted,
    });
  } catch (error: any) {
    console.error("[user.controller] getFavorites error:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to fetch favorites" });
  }
};

/**
 * Toggle favorite service for logged-in user
 */
export const toggleFavorite = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const { serviceId } = req.body;
    if (!serviceId) {
      res.status(400).json({ success: false, message: "serviceId is required" });
      return;
    }

    const numServiceId = Number(serviceId);

    // Check if already favorited
    const existing = await db
      .select()
      .from(userFavorites)
      .where(and(eq(userFavorites.userId, req.user.id), eq(userFavorites.serviceId, numServiceId)))
      .limit(1);

    let isFavorite = false;
    if (existing.length > 0) {
      // Remove from favorites
      await db
        .delete(userFavorites)
        .where(and(eq(userFavorites.userId, req.user.id), eq(userFavorites.serviceId, numServiceId)));
      isFavorite = false;
    } else {
      // Add to favorites
      await db.insert(userFavorites).values({
        userId: req.user.id,
        serviceId: numServiceId,
      });
      isFavorite = true;
    }

    res.status(200).json({
      success: true,
      isFavorite,
      serviceId: numServiceId,
      message: isFavorite ? "Added to favorites" : "Removed from favorites",
    });
  } catch (error: any) {
    console.error("[user.controller] toggleFavorite error:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to toggle favorite" });
  }
};

/**
 * Get recently viewed services for the logged-in user
 */
export const getRecentServices = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const recentList = await db
      .select({
        service: services,
        categoryName: categories.name,
        viewedAt: userRecentServices.viewedAt,
      })
      .from(userRecentServices)
      .innerJoin(services, eq(userRecentServices.serviceId, services.id))
      .leftJoin(categories, eq(services.categoryId, categories.id))
      .where(eq(userRecentServices.userId, req.user.id))
      .orderBy(desc(userRecentServices.viewedAt))
      .limit(30);

    const formatted = recentList.map((item) => ({
      ...item.service,
      categoryName: item.categoryName || undefined,
      images: item.service.images ? (typeof item.service.images === "string" ? (() => { try { return JSON.parse(item.service.images); } catch { return [item.service.images]; } })() : item.service.images) : [],
    }));

    res.status(200).json({
      success: true,
      data: formatted,
    });
  } catch (error: any) {
    console.error("[user.controller] getRecentServices error:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to fetch recent services" });
  }
};

/**
 * Record a service view in recently viewed history
 */
export const recordRecent = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const { serviceId } = req.body;
    if (!serviceId) {
      res.status(400).json({ success: false, message: "serviceId is required" });
      return;
    }

    const numServiceId = Number(serviceId);

    // Upsert into user_recent_services
    await poolConnection.query(
      `INSERT INTO user_recent_services (user_id, service_id, viewed_at)
       VALUES (?, ?, NOW())
       ON DUPLICATE KEY UPDATE viewed_at = NOW()`,
      [req.user.id, numServiceId]
    );

    // Sync users table services_viewed & details_viewed with real recent count
    const [cntRes] = await poolConnection.query(
      `SELECT COUNT(*) as count FROM user_recent_services WHERE user_id = ?`,
      [req.user.id]
    );
    const realCount = Number((cntRes as any)?.[0]?.count) || 0;
    await poolConnection.query(
      `UPDATE users SET services_viewed = ?, details_viewed = ? WHERE id = ?`,
      [realCount, realCount, req.user.id]
    );

    res.status(200).json({
      success: true,
      message: "Recorded recent service view",
    });
  } catch (error: any) {
    console.error("[user.controller] recordRecent error:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to record recent service" });
  }
};

/**
 * Clear recently viewed services history for user
 */
export const clearRecent = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    await db.delete(userRecentServices).where(eq(userRecentServices.userId, req.user.id));

    res.status(200).json({
      success: true,
      message: "Recent service history cleared",
    });
  } catch (error: any) {
    console.error("[user.controller] clearRecent error:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to clear history" });
  }
};

/**
 * Admin: Get all users with search, role filter, and aggregate stats
 * Route: GET /api/users or GET /api/user/all
 */
export const getAllUsers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { page, limit, search, role } = req.query;

    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(100, Math.max(1, Number(limit) || 20));
    const offset = (pageNum - 1) * limitNum;

    const conditions: any[] = [];

    if (search && typeof search === "string" && search.trim() !== "") {
      const q = `%${search.trim()}%`;
      conditions.push(sql`(${users.name} LIKE ${q} OR ${users.phone} LIKE ${q} OR ${users.email} LIKE ${q})`);
    }

    if (role && typeof role === "string" && role !== "all") {
      conditions.push(eq(users.role, role as any));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Fetch users matching filter
    const query = db
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
        updatedAt: users.updatedAt,
      })
      .from(users);

    const countQuery = db.select({ total: count() }).from(users);

    const [userList, [totalRes], statsRes] = await Promise.all([
      (whereClause ? query.where(whereClause) : query)
        .orderBy(desc(users.createdAt))
        .limit(limitNum)
        .offset(offset),
      whereClause ? countQuery.where(whereClause) : countQuery,
      poolConnection.query(
        `SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN role = 'customer' THEN 1 ELSE 0 END) as customerCount,
          SUM(CASE WHEN role = 'creator' THEN 1 ELSE 0 END) as creatorCount,
          SUM(CASE WHEN role IN ('admin', 'superadmin', 'staff') THEN 1 ELSE 0 END) as adminCount
         FROM users`
      ),
    ]);

    const total = Number(totalRes?.total) || 0;
    const totalPages = Math.ceil(total / limitNum) || 1;

    const statsRow = (statsRes?.[0] as any)?.[0] || {};
    const stats = {
      totalUsers: Number(statsRow.total) || 0,
      customerCount: Number(statsRow.customerCount) || 0,
      creatorCount: Number(statsRow.creatorCount) || 0,
      adminCount: Number(statsRow.adminCount) || 0,
    };

    res.status(200).json({
      success: true,
      data: userList,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
      },
      stats,
    });
  } catch (error: any) {
    console.error("[user.controller] getAllUsers error:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to fetch users" });
  }
};

/**
 * Admin: Create a new user account
 * Route: POST /api/users
 */
export const createUser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { name, phone, email, password, role } = req.body;

    if (!name || !phone || !password) {
      res.status(400).json({ success: false, message: "Name, phone and password are required" });
      return;
    }

    const assignedRole = role || "customer";
    if (assignedRole === "superadmin" && req.user?.role !== "superadmin") {
      res.status(403).json({ success: false, message: "Only Super Admin can assign the Super Admin role" });
      return;
    }

    // Check duplicate
    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(or(eq(users.phone, phone), email ? eq(users.email, email) : undefined))
      .limit(1);

    if (existing.length > 0) {
      res.status(409).json({ success: false, message: "User with this phone or email already exists" });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const insertResult = await db.insert(users).values({
      name: name.trim(),
      phone: phone.trim(),
      email: email && String(email).trim() ? String(email).trim() : null,
      password: hashedPassword,
      role: assignedRole,
    });

    res.status(201).json({
      success: true,
      message: "User created successfully",
      data: {
        id: insertResult[0].insertId,
        name: name.trim(),
        phone: phone.trim(),
        email: email || null,
        role: assignedRole,
      },
    });
  } catch (error: any) {
    console.error("[user.controller] createUser error:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to create user" });
  }
};

/**
 * Admin: Update user role
 * Route: PUT /api/users/:id/role
 */
export const updateUserRole = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = Number(req.params.id);
    const { role } = req.body;

    const validRoles = ["superadmin", "creator", "admin", "staff", "customer"];
    if (!validRoles.includes(role)) {
      res.status(400).json({ success: false, message: "Invalid role specified" });
      return;
    }

    if (role === "superadmin" && req.user?.role !== "superadmin") {
      res.status(403).json({ success: false, message: "Only Super Admin can promote to Super Admin" });
      return;
    }

    const [targetUser] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!targetUser) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    if (targetUser.role === "superadmin" && req.user?.role !== "superadmin") {
      res.status(403).json({ success: false, message: "Cannot modify a Super Admin user" });
      return;
    }

    await db.update(users).set({ role }).where(eq(users.id, userId));

    res.status(200).json({
      success: true,
      message: `User role updated to ${role} successfully`,
      data: { id: userId, role },
    });
  } catch (error: any) {
    console.error("[user.controller] updateUserRole error:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to update role" });
  }
};

/**
 * Admin: Delete user
 * Route: DELETE /api/users/:id
 */
export const deleteUser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = Number(req.params.id);

    if (req.user?.id === userId) {
      res.status(400).json({ success: false, message: "You cannot delete your own account" });
      return;
    }

    const [targetUser] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!targetUser) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    if (targetUser.role === "superadmin" && req.user?.role !== "superadmin") {
      res.status(403).json({ success: false, message: "Cannot delete a Super Admin user" });
      return;
    }

    // Clean up related records
    await poolConnection.query(`DELETE FROM user_favorites WHERE user_id = ?`, [userId]);
    await poolConnection.query(`DELETE FROM user_recent_services WHERE user_id = ?`, [userId]);
    await poolConnection.query(`DELETE FROM device_tokens WHERE user_id = ?`, [userId]);
    await db.delete(users).where(eq(users.id, userId));

    res.status(200).json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error: any) {
    console.error("[user.controller] deleteUser error:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to delete user" });
  }
};
