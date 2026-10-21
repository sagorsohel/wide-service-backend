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
} from "../controllers/user.controller.js";
import { authenticateToken } from "../middleware/auth.js";

const router = Router();

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
