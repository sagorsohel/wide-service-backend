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
import { initNotificationScheduler } from "./services/notificationCron.js";
import { seedDatabase } from "./db/seed.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
