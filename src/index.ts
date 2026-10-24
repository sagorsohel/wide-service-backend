import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.routes.js";
import serviceRoutes from "./routes/service.routes.js";
import categoryRoutes from "./routes/category.routes.js";
import subcategoryRoutes from "./routes/subcategory.routes.js";
import uploadRoutes from "./routes/upload.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import notificationRoutes from "./routes/notification.routes.js";
import userRoutes from "./routes/user.routes.js";
import appReleaseRoutes from "./routes/appRelease.routes.js";
import { initNotificationScheduler } from "./services/notificationCron.js";
import { seedDatabase } from "./db/seed.js";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, "../uploads");
const appsUploadDir = path.join(uploadsDir, "apps");

if (!fs.existsSync(appsUploadDir)) {
  fs.mkdirSync(appsUploadDir, { recursive: true });
}

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded application files statically
app.use("/uploads", express.static(uploadsDir));

// Health Check
app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "wide-service-backend",
    timestamp: new Date().toISOString(),
    database: {
      host: process.env.DB_HOST,
      name: process.env.DB_NAME,
      port: process.env.DB_PORT,
    },
    imageServer: {
      url: process.env.IMAGE_SERVER_URL,
      configured: Boolean(process.env.IMAGE_SERVER_API_KEY),
    },
  });
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/subcategories", subcategoryRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/user", userRoutes);
app.use("/api/users", userRoutes);
app.use("/api/app-releases", appReleaseRoutes);

// Root route
app.get("/", (req, res) => {
  res.send("Wide Service Backend API is running!");
});

// Auto seed on boot and start server
seedDatabase().catch((err) => {
  console.warn("[backend] Auto-seed note:", err.message);
});

// Initialize Push Notification Scheduled Cron Job
initNotificationScheduler();

app.listen(Number(PORT), "0.0.0.0", () => {
  console.log(`[wide-service-backend] Server is running on http://0.0.0.0:${PORT} (Accessible across LAN)`);
  console.log(`[wide-service-backend] Database target: ${process.env.DB_USER}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`);
});

export default app;
