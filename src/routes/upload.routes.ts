import { Router } from "express";
import {
  uploadMiddleware,
  handleImageUpload,
  handleMultipleImageUpload,
} from "../controllers/upload.controller.js";
import { optionalAuthenticateToken } from "../middleware/auth.js";

const router = Router();

// Single image upload
router.post(
  "/",
  optionalAuthenticateToken,
  uploadMiddleware.single("file"),
  handleImageUpload
);

// Multiple image upload (up to 10 files)
router.post(
  "/multiple",
  optionalAuthenticateToken,
  uploadMiddleware.array("files", 10),
  handleMultipleImageUpload
);

export default router;
