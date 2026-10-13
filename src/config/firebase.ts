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
 * 1. Individual env variables:
 *    FIREBASE_TYPE, FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY_ID, FIREBASE_PRIVATE_KEY,
 *    FIREBASE_CLIENT_EMAIL, FIREBASE_CLIENT_ID, FIREBASE_AUTH_URI, FIREBASE_TOKEN_URI,
 *    FIREBASE_AUTH_PROVIDER_X509_CERT_URL, FIREBASE_CLIENT_X509_CERT_URL, FIREBASE_UNIVERSE_DOMAIN
 * 2. FIREBASE_SERVICE_ACCOUNT env (JSON string or base64 encoded)
 * 3. Local file fallback: src/config/firebase-service-account.json
 */
function resolveServiceAccount(): any | null {
  // 1. Check individual env variables
  if (
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY
  ) {
    const rawKey = process.env.FIREBASE_PRIVATE_KEY.trim();
    const cleanKey =
      rawKey.startsWith('"') && rawKey.endsWith('"')
        ? rawKey.slice(1, -1)
        : rawKey;
    const formattedKey = cleanKey.replace(/\\n/g, "\n");

    return {
      type: process.env.FIREBASE_TYPE || "service_account",
      project_id: process.env.FIREBASE_PROJECT_ID,
      projectId: process.env.FIREBASE_PROJECT_ID,
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID || "",
      privateKeyId: process.env.FIREBASE_PRIVATE_KEY_ID || "",
      private_key: formattedKey,
      privateKey: formattedKey,
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      client_id: process.env.FIREBASE_CLIENT_ID || "",
      clientId: process.env.FIREBASE_CLIENT_ID || "",
      auth_uri:
        process.env.FIREBASE_AUTH_URI || "https://accounts.google.com/o/oauth2/auth",
      authUri:
        process.env.FIREBASE_AUTH_URI || "https://accounts.google.com/o/oauth2/auth",
      token_uri:
        process.env.FIREBASE_TOKEN_URI || "https://oauth2.googleapis.com/token",
      tokenUri:
        process.env.FIREBASE_TOKEN_URI || "https://oauth2.googleapis.com/token",
      auth_provider_x509_cert_url:
        process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL ||
        "https://www.googleapis.com/oauth2/v1/certs",
      authProviderX509CertUrl:
        process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL ||
        "https://www.googleapis.com/oauth2/v1/certs",
      client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL || "",
      clientX509CertUrl: process.env.FIREBASE_CLIENT_X509_CERT_URL || "",
      universe_domain: process.env.FIREBASE_UNIVERSE_DOMAIN || "googleapis.com",
      universeDomain: process.env.FIREBASE_UNIVERSE_DOMAIN || "googleapis.com",
    };
  }

  // 2. Check FIREBASE_SERVICE_ACCOUNT env (JSON string or base64 encoded)
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
      "[firebase] No Firebase credentials found. Provide Firebase env variables in .env or firebase-service-account.json file."
    );
  }
} catch (error) {
  console.error("[firebase] Error initializing Firebase Admin SDK:", error);
}

export const messaging = messagingInstance;
export { firebaseApp };
