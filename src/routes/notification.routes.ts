import { Router } from "express";
import {
  registerDeviceToken,
  sendNotification,
  getNotifications,
  getNotificationStats,
  cancelNotification,
  deleteNotification,
} from "../controllers/notification.controller.js";
import {
  authenticateToken,
  requireSuperAdmin,
  optionalAuthenticateToken,
} from "../middleware/auth.js";

const router = Router();

// Public / Optional Token Registration for App (Guests and Logged-in users)
router.post("/register-token", optionalAuthenticateToken, registerDeviceToken);

// Protected routes for Admins / Super Admins
router.post("/send", authenticateToken, requireSuperAdmin, sendNotification);
router.get("/", authenticateToken, requireSuperAdmin, getNotifications);
router.get("/stats", authenticateToken, requireSuperAdmin, getNotificationStats);
router.patch("/:id/cancel", authenticateToken, requireSuperAdmin, cancelNotification);
router.delete("/:id", authenticateToken, requireSuperAdmin, deleteNotification);

export default router;
