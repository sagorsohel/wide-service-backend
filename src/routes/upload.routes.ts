import { Router } from "express";
import { uploadMiddleware, handleImageUpload } from "../controllers/upload.controller.js";
import { authenticateToken } from "../middleware/auth.js";

const router = Router();

// Accept either 'file' or 'image' field
router.post(
  "/",
  authenticateToken,
  uploadMiddleware.single("file"),
  handleImageUpload
);

export default router;
