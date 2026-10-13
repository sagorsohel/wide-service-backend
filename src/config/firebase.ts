import dotenv from "dotenv";
import { initializeApp, cert, getApps, App } from "firebase-admin/app";
import { getMessaging, Messaging } from "firebase-admin/messaging";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let messagingInstance: Messaging | null = null;
let firebaseApp: App | null = null;

/**
 * Resolves Firebase service account credentials from:
 * 1. FIREBASE_SERVICE_ACCOUNT env (JSON string or base64 encoded)
 * 2. Individual env variables: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
 * 3. Local file fallback: src/config/firebase-service-account.json
 */
function resolveServiceAccount(): any | null {
  // 1. Check FIREBASE_SERVICE_ACCOUNT env
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      const raw = process.env.FIREBASE_SERVICE_ACCOUNT.trim();
      if (raw.startsWith("{")) {
        return JSON.parse(raw);
      } else {
        const decoded = Buffer.from(raw, "base64").toString("utf-8");
        return JSON.parse(decoded);
      }
    } catch (e) {
      console.error("[firebase] Error parsing FIREBASE_SERVICE_ACCOUNT from env:", e);
    }
  }

  // 2. Check individual env variables
  if (
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY
  ) {
    return {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    };
  }

  // 3. Fallback to local file if present on disk
  const serviceAccountPath = path.resolve(__dirname, "firebase-service-account.json");
  if (fs.existsSync(serviceAccountPath)) {
    try {
      const rawData = fs.readFileSync(serviceAccountPath, "utf-8");
      return JSON.parse(rawData);
    } catch (error) {
      console.error("[firebase] Error reading local service account file:", error);
    }
  }

  return null;
}

try {
  const serviceAccount = resolveServiceAccount();

  if (serviceAccount) {
    if (getApps().length === 0) {
      firebaseApp = initializeApp({
        credential: cert(serviceAccount),
      });
      const projectId =
        serviceAccount.project_id ||
        serviceAccount.projectId ||
        "firebase-project";
      console.log(`[firebase] Firebase Admin SDK initialized for project: ${projectId}`);
    } else {
      firebaseApp = getApps()[0];
    }
    messagingInstance = getMessaging(firebaseApp);
  } else {
    console.warn(
      "[firebase] No Firebase credentials found. Provide FIREBASE_SERVICE_ACCOUNT in .env, individual env vars, or firebase-service-account.json file."
    );
  }
} catch (error) {
  console.error("[firebase] Error initializing Firebase Admin SDK:", error);
}

export const messaging = messagingInstance;
export { firebaseApp };
