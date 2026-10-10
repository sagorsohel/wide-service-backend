import { Router } from "express";
import { getDashboardStats } from "../controllers/dashboard.controller.js";
import { authenticateToken } from "../middleware/auth.js";

const router = Router();

// Endpoint to fetch dynamic dashboard stats
router.get("/stats", authenticateToken, getDashboardStats);

export default router;
