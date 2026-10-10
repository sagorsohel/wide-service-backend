import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.routes.js";
import serviceRoutes from "./routes/service.routes.js";

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

// Root route
app.get("/", (req, res) => {
  res.send("Wide Service Backend API is running!");
});

// Start Server
app.listen(PORT, () => {
  console.log(`[wide-service-backend] Server is running on http://localhost:${PORT}`);
  console.log(`[wide-service-backend] Database target: ${process.env.DB_USER}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`);
});

export default app;
