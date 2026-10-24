import { Router } from "express";
import {
  getPublicReleases,
  trackDownload,
  getAllReleases,
  saveRelease,
  deleteRelease,
  handleAppBinaryUpload,
  appUploadMiddleware,
} from "../controllers/appRelease.controller.js";
import { authenticateToken, requireSuperAdmin } from "../middleware/auth.js";

const router = Router();

// Public routes for website /apk page
router.get("/public", getPublicReleases);
router.post("/track/:id", trackDownload);

// Super Admin Management routes
router.get("/", authenticateToken, requireSuperAdmin, getAllReleases);
router.post("/", authenticateToken, requireSuperAdmin, saveRelease);
router.post(
  "/upload",
  authenticateToken,
  requireSuperAdmin,
  appUploadMiddleware.single("file"),
  handleAppBinaryUpload
);
router.delete("/:id", authenticateToken, requireSuperAdmin, deleteRelease);

export default router;
