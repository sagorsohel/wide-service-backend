import { Request, Response } from "express";
import { eq, desc, and } from "drizzle-orm";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { db } from "../db/index.js";
import { appReleases } from "../db/schema.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, "../../uploads");
const appsUploadDir = path.join(uploadsDir, "apps");

// Ensure apps directory exists
if (!fs.existsSync(appsUploadDir)) {
  fs.mkdirSync(appsUploadDir, { recursive: true });
}

// Multer storage for APK / IPA app binary files (up to 150MB)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, appsUploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, "_");
    cb(null, `${baseName}-${Date.now()}${ext}`);
  },
});

export const appUploadMiddleware = multer({
  storage,
  limits: {
    fileSize: 150 * 1024 * 1024, // 150MB maximum file size
  },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowed = [".apk", ".ipa", ".aab", ".zip", ".plist"];
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type ${ext}. Allowed extensions: .apk, .ipa, .aab, .zip`));
    }
  },
});

/**
 * Handle direct app binary upload (APK / IPA / AAB)
 */
export const handleAppBinaryUpload = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, message: "No application file provided" });
      return;
    }

    const host = req.get("host") || "localhost:5000";
    const protocol = req.protocol === "https" || req.headers["x-forwarded-proto"] === "https" ? "https" : "http";
    const fileUrl = `${protocol}://${host}/uploads/apps/${req.file.filename}`;

    const sizeInMB = (req.file.size / (1024 * 1024)).toFixed(1);
    const ext = path.extname(req.file.originalname).replace(".", "").toLowerCase();

    res.status(200).json({
      success: true,
      message: "Application file uploaded successfully",
      downloadUrl: fileUrl,
      filename: req.file.filename,
      originalName: req.file.originalname,
      fileSize: `${sizeInMB} MB`,
      fileType: ext,
      sizeBytes: req.file.size,
    });
  } catch (error: any) {
    console.error("[appRelease] Upload error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to upload app file",
    });
  }
};

/**
 * Public: Get latest active releases for Android and iOS
 */
export const getPublicReleases = async (req: Request, res: Response): Promise<void> => {
  try {
    // Latest active Android
    const androidReleases = await db
      .select()
      .from(appReleases)
      .where(and(eq(appReleases.platform, "android"), eq(appReleases.isActive, 1)))
      .orderBy(desc(appReleases.id))
      .limit(1);

    // Latest active iOS
    const iosReleases = await db
      .select()
      .from(appReleases)
      .where(and(eq(appReleases.platform, "ios"), eq(appReleases.isActive, 1)))
      .orderBy(desc(appReleases.id))
      .limit(1);

    // All active releases history
    const history = await db
      .select()
      .from(appReleases)
      .orderBy(desc(appReleases.id))
      .limit(10);

    const android = androidReleases[0] || null;
    const ios = iosReleases[0] || null;

    res.status(200).json({
      success: true,
      data: {
        android,
        ios,
        history,
      },
    });
  } catch (error: any) {
    console.error("[appRelease] getPublicReleases error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch app releases",
    });
  }
};

/**
 * Public: Track download count when a user initiates download
 */
export const trackDownload = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ success: false, message: "Invalid release ID" });
      return;
    }

    const release = await db
      .select()
      .from(appReleases)
      .where(eq(appReleases.id, id))
      .limit(1);

    if (release.length === 0) {
      res.status(404).json({ success: false, message: "Release not found" });
      return;
    }

    const newCount = (release[0].downloadsCount || 0) + 1;
    await db
      .update(appReleases)
      .set({ downloadsCount: newCount })
      .where(eq(appReleases.id, id));

    res.status(200).json({
      success: true,
      message: "Download tracked successfully",
      downloadsCount: newCount,
    });
  } catch (error: any) {
    console.error("[appRelease] trackDownload error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to track download",
    });
  }
};

/**
 * Super Admin: Get all releases
 */
export const getAllReleases = async (req: Request, res: Response): Promise<void> => {
  try {
    const releases = await db
      .select()
      .from(appReleases)
      .orderBy(desc(appReleases.id));

    res.status(200).json({
      success: true,
      data: releases,
    });
  } catch (error: any) {
    console.error("[appRelease] getAllReleases error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch all releases",
    });
  }
};

/**
 * Super Admin: Create or update release
 */
export const saveRelease = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      id,
      platform,
      version,
      buildNumber = "1",
      downloadUrl,
      fileSize,
      fileType = "apk",
      releaseNotes,
      minOsVersion,
      isActive = 1,
    } = req.body;

    if (!platform || !["android", "ios"].includes(platform)) {
      res.status(400).json({ success: false, message: "Valid platform ('android' or 'ios') is required" });
      return;
    }

    if (!version || !downloadUrl) {
      res.status(400).json({ success: false, message: "Version and Download URL are required" });
      return;
    }

    // If activating this release, deactivate existing releases for the same platform
    if (Number(isActive) === 1) {
      await db
        .update(appReleases)
        .set({ isActive: 0 })
        .where(eq(appReleases.platform, platform));
    }

    if (id) {
      // Update existing
      await db
        .update(appReleases)
        .set({
          platform,
          version,
          buildNumber,
          downloadUrl,
          fileSize: fileSize || null,
          fileType,
          releaseNotes: releaseNotes || null,
          minOsVersion: minOsVersion || (platform === "android" ? "Android 7.0+" : "iOS 14.0+"),
          isActive: Number(isActive),
        })
        .where(eq(appReleases.id, Number(id)));

      res.status(200).json({
        success: true,
        message: "Release updated successfully",
      });
    } else {
      // Insert new
      const [insertResult] = await db.insert(appReleases).values({
        platform,
        version,
        buildNumber,
        downloadUrl,
        fileSize: fileSize || null,
        fileType,
        releaseNotes: releaseNotes || null,
        minOsVersion: minOsVersion || (platform === "android" ? "Android 7.0+" : "iOS 14.0+"),
        isActive: Number(isActive),
        downloadsCount: 0,
      });

      res.status(201).json({
        success: true,
        message: "New release created successfully",
        id: (insertResult as any).insertId,
      });
    }
  } catch (error: any) {
    console.error("[appRelease] saveRelease error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to save release",
    });
  }
};

/**
 * Super Admin: Delete release
 */
export const deleteRelease = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ success: false, message: "Invalid release ID" });
      return;
    }

    await db.delete(appReleases).where(eq(appReleases.id, id));

    res.status(200).json({
      success: true,
      message: "Release deleted successfully",
    });
  } catch (error: any) {
    console.error("[appRelease] deleteRelease error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to delete release",
    });
  }
};
