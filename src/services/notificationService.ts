import { eq, isNotNull, isNull, inArray } from "drizzle-orm";
import { db } from "../db/index.js";
import { deviceTokens } from "../db/schema.js";
import { messaging } from "../config/firebase.js";

export interface PushPayload {
  title: string;
  body: string;
  imageUrl?: string;
  target?: "all" | "users_only" | "guests_only";
  data?: Record<string, string>;
}

function isExpoPushToken(token: string): boolean {
  return token.startsWith("ExponentPushToken[") || token.startsWith("ExpoPushToken[");
}

async function sendExpoPushNotifications(
  tokens: string[],
  title: string,
  body: string,
  imageUrl?: string,
  data?: Record<string, string>
) {
  let successCount = 0;
  let failureCount = 0;
  const invalidTokens: string[] = [];

  const chunks: string[][] = [];
  for (let i = 0; i < tokens.length; i += 100) {
    chunks.push(tokens.slice(i, i + 100));
  }

  for (const chunk of chunks) {
    const messages = chunk.map((to) => ({
      to,
      sound: "default",
      title,
      body,
      data: { ...(data || {}), imageUrl },
      priority: "high",
      channelId: "wide_service_v2",
      _displayInForeground: true,
    }));

    try {
      const response = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Accept-encoding": "gzip, deflate",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(messages),
      });

      const resData: any = await response.json();
      if (resData?.data && Array.isArray(resData.data)) {
        resData.data.forEach((ticket: any, idx: number) => {
          if (ticket.status === "ok") {
            successCount++;
          } else {
            failureCount++;
            if (ticket.details?.error === "DeviceNotRegistered") {
              invalidTokens.push(chunk[idx]);
            }
          }
        });
      } else {
        failureCount += chunk.length;
      }
    } catch (err) {
      console.error("[expo-push] Error sending chunk:", err);
      failureCount += chunk.length;
    }
  }

  return { successCount, failureCount, invalidTokens };
}

export async function sendPushNotification(payload: PushPayload) {
  const { title, body, imageUrl, target = "all", data } = payload;

  // 1. Fetch relevant tokens from DB
  let query = db.select({ token: deviceTokens.token }).from(deviceTokens);

  if (target === "users_only") {
    query = query.where(isNotNull(deviceTokens.userId)) as typeof query;
  } else if (target === "guests_only") {
    query = query.where(isNull(deviceTokens.userId)) as typeof query;
  }

  const tokenRows = await query;
  const tokens = Array.from(new Set(tokenRows.map((r) => r.token.trim()))).filter(Boolean);

  if (tokens.length === 0) {
    return {
      successCount: 0,
      failureCount: 0,
      totalCount: 0,
      message: "No registered device tokens found for this target audience",
    };
  }

  // 2. Partition tokens: Expo Push Tokens vs Native FCM Tokens
  const expoTokens = tokens.filter(isExpoPushToken);
  const fcmTokens = tokens.filter((t) => !isExpoPushToken(t) && !t.startsWith("client-"));

  let totalSuccess = 0;
  let totalFailure = 0;
  const tokensToRemove: string[] = [];

  // A. Handle Expo Tokens (Expo Go & Expo Managed Clients)
  if (expoTokens.length > 0) {
    const expoResult = await sendExpoPushNotifications(expoTokens, title, body, imageUrl, data);
    totalSuccess += expoResult.successCount;
    totalFailure += expoResult.failureCount;
    tokensToRemove.push(...expoResult.invalidTokens);
  }

  // B. Handle Native FCM Tokens (Production / Development APK with Firebase)
  if (fcmTokens.length > 0 && messaging) {
    const batchSize = 500;
    for (let i = 0; i < fcmTokens.length; i += batchSize) {
      const batch = fcmTokens.slice(i, i + batchSize);

      const message: any = {
        notification: {
          title,
          body,
          ...(imageUrl ? { imageUrl } : {}),
        },
        data: {
          ...(data || {}),
          ...(imageUrl ? { imageUrl } : {}),
        },
        tokens: batch,
        android: {
          priority: "high",
          notification: {
            title,
            body,
            channelId: "wide_service_v2",
            sound: "default",
            priority: "max",
            visibility: "public",
            defaultSound: true,
            defaultVibrateTimings: true,
            notificationCount: 1,
            ...(imageUrl ? { imageUrl } : {}),
          },
        },
        apns: {
          payload: {
            aps: {
              sound: "default",
              badge: 1,
            },
          },
        },
      };

      try {
        const response = await messaging.sendEachForMulticast(message);
        totalSuccess += response.successCount;
        totalFailure += response.failureCount;

        response.responses.forEach((resp: any, idx: number) => {
          if (!resp.success) {
            const errCode = resp.error?.code;
            if (
              errCode === "messaging/registration-token-not-registered" ||
              errCode === "messaging/invalid-registration-token"
            ) {
              tokensToRemove.push(batch[idx]);
            }
          }
        });
      } catch (batchErr) {
        console.error("[fcm] Batch sending error:", batchErr);
        totalFailure += batch.length;
      }
    }
  }

  // 3. Clean up invalid tokens from DB asynchronously
  if (tokensToRemove.length > 0) {
    try {
      await db.delete(deviceTokens).where(inArray(deviceTokens.token, tokensToRemove));
      console.log(`[push] Cleaned up ${tokensToRemove.length} inactive tokens`);
    } catch (cleanupErr) {
      console.warn("[push] Token cleanup warning:", cleanupErr);
    }
  }

  return {
    successCount: totalSuccess,
    failureCount: totalFailure,
    totalCount: tokens.length,
  };
}

export async function registerDeviceToken(token: string, userId?: number | null, platform: string = "unknown") {
  const existing = await db
    .select()
    .from(deviceTokens)
    .where(eq(deviceTokens.token, token))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(deviceTokens)
      .set({
        userId: userId !== undefined ? userId : existing[0].userId,
        platform: platform || existing[0].platform,
        updatedAt: new Date(),
      })
      .where(eq(deviceTokens.token, token));
    return { created: false, token: existing[0] };
  } else {
    await db.insert(deviceTokens).values({
      token,
      userId: userId || null,
      platform,
    });
    return { created: true };
  }
}
