import { Router } from "express";
import {
  getAllServices,
  getServiceById,
  createService,
  updateService,
  updateServiceStatus,
  deleteService,
} from "../controllers/service.controller.js";
import {
  authenticateToken,
  optionalAuthenticateToken,
  requireSuperAdminOrCreator,
  requireSuperAdmin,
} from "../middleware/auth.js";
import { getImageServerConfig } from "../controllers/image.controller.js";

const router = Router();

router.get("/", optionalAuthenticateToken, getAllServices);
router.get("/config/images", getImageServerConfig);
router.get("/:id", getServiceById);
router.post("/", authenticateToken, requireSuperAdminOrCreator, createService);
router.put("/:id", authenticateToken, requireSuperAdminOrCreator, updateService);
router.patch("/:id/status", authenticateToken, requireSuperAdmin, updateServiceStatus);
router.delete("/:id", authenticateToken, requireSuperAdminOrCreator, deleteService);

export default router;
