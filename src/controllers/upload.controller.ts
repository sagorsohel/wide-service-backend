import { Request, Response } from "express";
import multer from "multer";

// Configure multer memory storage
export const uploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

export const handleImageUpload = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, message: "No image file provided" });
      return;
    }

    const imageServerUrl = process.env.IMAGE_SERVER_URL || "https://image.streamespn.org";
    const apiKey = process.env.IMAGE_SERVER_API_KEY || "";

    if (!apiKey) {
      res.status(500).json({ success: false, message: "Image server API key is not configured" });
      return;
    }

    // Build FormData using native Node.js Blob
    const formData = new FormData();
    const blob = new Blob([req.file.buffer], { type: req.file.mimetype });
    formData.append("file", blob, req.file.originalname);

    // Forward to remote image server
    const remoteResponse = await fetch(`${imageServerUrl}/api/upload`, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
      },
      body: formData,
    });

    const result: any = await remoteResponse.json();

    if (!remoteResponse.ok || !result.success) {
      res.status(remoteResponse.status || 500).json({
        success: false,
        message: result.error || "Failed to upload image to remote server",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Image uploaded successfully",
      url: result.url,
      filename: result.filename,
      size: result.size,
      mimetype: result.mimetype,
    });
  } catch (error: any) {
    console.error("[upload] Error uploading image:", error);
    res.status(500).json({
      success: false,
      message: error.message || "An unexpected error occurred during image upload",
    });
  }
};
