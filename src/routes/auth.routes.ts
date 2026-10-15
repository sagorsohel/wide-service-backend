import { Router } from "express";
import { register, login, getMe, googleAuth } from "../controllers/auth.controller.js";
import { authenticateToken } from "../middleware/auth.js";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/google", googleAuth);
router.get("/me", authenticateToken, getMe);

export default router;
