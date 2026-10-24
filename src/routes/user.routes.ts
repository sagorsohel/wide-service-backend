import { Router } from "express";
import {
  getProfile,
  updateProfile,
  incrementStats,
  getFavorites,
  toggleFavorite,
  getRecentServices,
  recordRecent,
  clearRecent,
  getAllUsers,
  createUser,
  updateUserRole,
  deleteUser,
} from "../controllers/user.controller.js";
import { authenticateToken, requireAdmin } from "../middleware/auth.js";

const router = Router();

// Admin User Management Routes
router.get("/", authenticateToken, requireAdmin, getAllUsers);
router.get("/all", authenticateToken, requireAdmin, getAllUsers);
router.post("/", authenticateToken, requireAdmin, createUser);
router.put("/:id/role", authenticateToken, requireAdmin, updateUserRole);
router.delete("/:id", authenticateToken, requireAdmin, deleteUser);

// Profile Routes
router.get("/profile", authenticateToken, getProfile);
router.put("/profile", authenticateToken, updateProfile);

// Dynamic Activity Stats Route
router.post("/stats/increment", authenticateToken, incrementStats);

// Dynamic Favorites Routes
router.get("/favorites", authenticateToken, getFavorites);
router.post("/favorites/toggle", authenticateToken, toggleFavorite);

// Dynamic Recently Viewed Routes
router.get("/recent", authenticateToken, getRecentServices);
router.post("/recent/record", authenticateToken, recordRecent);
router.delete("/recent", authenticateToken, clearRecent);

export default router;

