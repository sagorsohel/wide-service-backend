import { Router } from "express";
import { getAllServices, getServiceById, createService } from "../controllers/service.controller.js";
import { authenticateToken, requireAdmin } from "../middleware/auth.js";
import { getImageServerConfig } from "../controllers/image.controller.js";

const router = Router();

router.get("/", getAllServices);
router.get("/config/images", getImageServerConfig);
router.get("/:id", getServiceById);
router.post("/", authenticateToken, requireAdmin, createService);

export default router;
