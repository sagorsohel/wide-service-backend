import { Request, Response } from "express";
import { eq, and, desc, sql } from "drizzle-orm";
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

    const u = userRecords[0];
    res.status(200).json({
      success: true,
      data: {
        ...u,
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

    if (!name || !phone) {
      res.status(400).json({ success: false, message: "Name and phone are required" });
      return;
    }

    // Check if phone or email is already taken by another user
    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(sql`${users.id} != ${req.user.id} AND (${users.phone} = ${phone} OR (${email ? sql`${users.email} = ${email}` : sql`1=0`}))`)
      .limit(1);

    if (existing.length > 0) {
      res.status(409).json({ success: false, message: "Phone or email already in use by another account" });
      return;
    }

    const updateFields: any = {
      name: name.trim(),
      phone: phone.trim(),
      email: email ? email.trim() : null,
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

    const userObj = updatedUserList[0];
    res.status(200).json({
      success: true,
      message: "Profile updated successfully in database",
      data: {
        ...userObj,
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
