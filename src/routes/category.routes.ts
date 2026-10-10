import { Router } from "express";
import {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
} from "../controllers/category.controller.js";
import { authenticateToken, requireSuperAdmin } from "../middleware/auth.js";

const router = Router();

// Public / Authenticated read routes
router.get("/", getAllCategories);
router.get("/:id", getCategoryById);

// Restricted to Super Admin Only
router.post("/", authenticateToken, requireSuperAdmin, createCategory);
router.put("/:id", authenticateToken, requireSuperAdmin, updateCategory);
router.delete("/:id", authenticateToken, requireSuperAdmin, deleteCategory);

export default router;
