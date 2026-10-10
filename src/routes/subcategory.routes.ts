import { Router } from "express";
import {
  getAllSubcategories,
  getSubcategoryById,
  createSubcategory,
  updateSubcategory,
  deleteSubcategory,
} from "../controllers/subcategory.controller.js";
import { authenticateToken, requireSuperAdmin } from "../middleware/auth.js";

const router = Router();

// Read routes
router.get("/", getAllSubcategories);
router.get("/:id", getSubcategoryById);

// Super Admin Only
router.post("/", authenticateToken, requireSuperAdmin, createSubcategory);
router.put("/:id", authenticateToken, requireSuperAdmin, updateSubcategory);
router.delete("/:id", authenticateToken, requireSuperAdmin, deleteSubcategory);

export default router;
