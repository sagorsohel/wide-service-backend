import { Router } from "express";
import {
  registerDeviceToken,
  sendNotification,
  getNotifications,
  getNotificationStats,
  cancelNotification,
  deleteNotification,
  getPublicNotifications,
  clearDeviceTokens,
} from "../controllers/notification.controller.js";
import {
  authenticateToken,
  requireSuperAdmin,
  optionalAuthenticateToken,
} from "../middleware/auth.js";

const router = Router();

// Public / Optional Token Registration and App Notifications Feed
router.post("/register-token", optionalAuthenticateToken, registerDeviceToken);
router.get("/public", getPublicNotifications);

// Protected routes for Admins / Super Admins
router.post("/send", authenticateToken, requireSuperAdmin, sendNotification);
router.get("/", authenticateToken, requireSuperAdmin, getNotifications);
router.get("/stats", authenticateToken, requireSuperAdmin, getNotificationStats);
router.patch("/:id/cancel", authenticateToken, requireSuperAdmin, cancelNotification);
router.delete("/tokens/clear", authenticateToken, requireSuperAdmin, clearDeviceTokens);
router.delete("/:id", authenticateToken, requireSuperAdmin, deleteNotification);


export default router;
