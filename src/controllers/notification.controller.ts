import { Request, Response } from "express";
import { eq, desc, count, and, like } from "drizzle-orm";
import { db } from "../db/index.js";
import { notifications, deviceTokens, users } from "../db/schema.js";
import { sendPushNotification, registerDeviceToken as registerTokenService } from "../services/notificationService.js";
import { AuthenticatedRequest } from "../middleware/auth.js";

// POST /api/notifications/register-token (Public / Optional Auth)
export const registerDeviceToken = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { token, platform } = req.body;

    if (!token || typeof token !== "string" || !token.trim()) {
      res.status(400).json({ success: false, message: "Valid device token is required" });
      return;
    }

    const userId = req.user?.id || req.body.userId || null;
    const result = await registerTokenService(token.trim(), userId ? Number(userId) : null, platform || "android");

    res.status(200).json({
      success: true,
      message: result.created ? "Device token registered successfully" : "Device token updated successfully",
      data: result,
    });
  } catch (error: any) {
    console.error("[notification.controller] registerDeviceToken error:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to register device token" });
  }
};

// POST /api/notifications/send (Admin / Super Admin)
export const sendNotification = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { title, body, imageUrl, target = "all", scheduledAt } = req.body;

    if (!title || !title.trim()) {
      res.status(400).json({ success: false, message: "Notification title is required" });
      return;
    }
    if (!body || !body.trim()) {
      res.status(400).json({ success: false, message: "Notification body is required" });
      return;
    }

    const cleanTitle = title.trim();
    const cleanBody = body.trim();
    const cleanImage = imageUrl && typeof imageUrl === "string" && imageUrl.trim() ? imageUrl.trim() : null;
    const validTarget = ["all", "users_only", "guests_only"].includes(target) ? target : "all";

    // Check if scheduled for the future
    if (scheduledAt) {
      const scheduleDate = new Date(scheduledAt);
      const now = new Date();

      if (isNaN(scheduleDate.getTime())) {
        res.status(400).json({ success: false, message: "Invalid scheduled date format" });
        return;
      }

      if (scheduleDate.getTime() > now.getTime()) {
        // Schedule notification for later
        const [insertResult] = await db.insert(notifications).values({
          title: cleanTitle,
          body: cleanBody,
          imageUrl: cleanImage,
          target: validTarget as any,
          scheduledAt: scheduleDate,
          status: "pending",
        });

        res.status(201).json({
          success: true,
          message: "Notification scheduled successfully",
          data: {
            id: insertResult.insertId,
            title: cleanTitle,
            scheduledAt: scheduleDate,
            status: "pending",
          },
        });
        return;
      }
    }

    // Instant Send
    let pushResult;
    try {
      pushResult = await sendPushNotification({
        title: cleanTitle,
        body: cleanBody,
        imageUrl: cleanImage || undefined,
        target: validTarget as any,
      });
    } catch (err: any) {
      // Record failed notification
      await db.insert(notifications).values({
        title: cleanTitle,
        body: cleanBody,
        imageUrl: cleanImage,
        target: validTarget as any,
        status: "failed",
        sentAt: new Date(),
      });
      throw err;
    }

    // Save sent notification to DB
    const [insertResult] = await db.insert(notifications).values({
      title: cleanTitle,
      body: cleanBody,
      imageUrl: cleanImage,
      target: validTarget as any,
      status: "sent",
      sentAt: new Date(),
      successCount: pushResult.successCount,
      failureCount: pushResult.failureCount,
    });

    res.status(200).json({
      success: true,
      message: `Notification sent! (${pushResult.successCount} delivered, ${pushResult.failureCount} failed)`,
      data: {
        id: insertResult.insertId,
        ...pushResult,
      },
    });
  } catch (error: any) {
    console.error("[notification.controller] sendNotification error:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to send notification" });
  }
};

// GET /api/notifications (Admin / Super Admin)
export const getNotifications = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { page = 1, limit = 20, status, search } = req.query;

    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.max(1, Number(limit) || 20);
    const offsetNum = (pageNum - 1) * limitNum;

    // Conditions
    const conditions = [];
    if (status && typeof status === "string" && ["sent", "pending", "failed", "cancelled"].includes(status)) {
      conditions.push(eq(notifications.status, status as any));
    }
    if (search && typeof search === "string" && search.trim()) {
      conditions.push(like(notifications.title, `%${search.trim()}%`));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Count
    const countQuery = whereClause
      ? db.select({ total: count() }).from(notifications).where(whereClause)
      : db.select({ total: count() }).from(notifications);
    const [{ total }] = await countQuery;

    // List
    const baseQuery = db
      .select()
      .from(notifications)
      .orderBy(desc(notifications.createdAt))
      .limit(limitNum)
      .offset(offsetNum);

    const data = whereClause ? await baseQuery.where(whereClause) : await baseQuery;

    res.status(200).json({
      success: true,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1,
      data,
    });
  } catch (error: any) {
    console.error("[notification.controller] getNotifications error:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to fetch notifications" });
  }
};

// GET /api/notifications/stats
export const getNotificationStats = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const [{ totalDevices }] = await db.select({ totalDevices: count() }).from(deviceTokens);
    const [{ totalSent }] = await db
      .select({ totalSent: count() })
      .from(notifications)
      .where(eq(notifications.status, "sent"));
    const [{ totalPending }] = await db
      .select({ totalPending: count() })
      .from(notifications)
      .where(eq(notifications.status, "pending"));

    res.status(200).json({
      success: true,
      data: {
        totalDevices,
        totalSent,
        totalPending,
      },
    });
  } catch (error: any) {
    console.error("[notification.controller] getNotificationStats error:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to fetch stats" });
  }
};

// PATCH /api/notifications/:id/cancel
export const cancelNotification = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);
    if (!id) {
      res.status(400).json({ success: false, message: "Valid notification ID is required" });
      return;
    }

    const existing = await db.select().from(notifications).where(eq(notifications.id, id)).limit(1);
    if (existing.length === 0) {
      res.status(404).json({ success: false, message: "Notification not found" });
      return;
    }

    if (existing[0].status !== "pending") {
      res.status(400).json({ success: false, message: "Only pending scheduled notifications can be cancelled" });
      return;
    }

    await db.update(notifications).set({ status: "cancelled", updatedAt: new Date() }).where(eq(notifications.id, id));

    res.status(200).json({ success: true, message: "Notification cancelled successfully" });
  } catch (error: any) {
    console.error("[notification.controller] cancelNotification error:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to cancel notification" });
  }
};

// DELETE /api/notifications/:id
export const deleteNotification = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);
    if (!id) {
      res.status(400).json({ success: false, message: "Valid notification ID is required" });
      return;
    }

    await db.delete(notifications).where(eq(notifications.id, id));
    res.status(200).json({ success: true, message: "Notification deleted successfully" });
  } catch (error: any) {
    console.error("[notification.controller] deleteNotification error:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to delete notification" });
  }
};

// GET /api/notifications/public (Public / App Feed)
export const getPublicNotifications = async (_req: Request, res: Response): Promise<void> => {
  try {
    const list = await db
      .select({
        id: notifications.id,
        title: notifications.title,
        body: notifications.body,
        imageUrl: notifications.imageUrl,
        sentAt: notifications.sentAt,
        createdAt: notifications.createdAt,
      })
      .from(notifications)
      .where(eq(notifications.status, "sent"))
      .orderBy(desc(notifications.sentAt), desc(notifications.createdAt))
      .limit(30);

    res.status(200).json({
      success: true,
      data: list,
    });
  } catch (error: any) {
    console.error("[notification.controller] getPublicNotifications error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch notifications" });
  }
};
