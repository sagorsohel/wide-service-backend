import { initializeApp, cert, getApps, App } from "firebase-admin/app";
import { getMessaging, Messaging } from "firebase-admin/messaging";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let messagingInstance: Messaging | null = null;
let firebaseApp: App | null = null;

try {
  const serviceAccountPath = path.resolve(__dirname, "firebase-service-account.json");

  if (fs.existsSync(serviceAccountPath)) {
    const rawData = fs.readFileSync(serviceAccountPath, "utf-8");
    const serviceAccount = JSON.parse(rawData);

    if (getApps().length === 0) {
      firebaseApp = initializeApp({
        credential: cert(serviceAccount),
      });
      console.log(`[firebase] Firebase Admin SDK initialized for project: ${serviceAccount.project_id}`);
    } else {
      firebaseApp = getApps()[0];
    }
    messagingInstance = getMessaging(firebaseApp);
  } else {
    console.warn(`[firebase] Service account file not found at: ${serviceAccountPath}`);
  }
} catch (error) {
  console.error("[firebase] Error initializing Firebase Admin SDK:", error);
}

export const messaging = messagingInstance;
export { firebaseApp };
