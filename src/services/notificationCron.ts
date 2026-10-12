import cron from "node-cron";
import { and, lte, eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { notifications } from "../db/schema.js";
import { sendPushNotification } from "./notificationService.js";

let isRunning = false;

export function initNotificationScheduler() {
  console.log("[scheduler] Initializing Notification Cron Scheduler (runs every minute)...");

  // Run every minute: "* * * * *"
  cron.schedule("* * * * *", async () => {
    if (isRunning) return; // Prevent overlapping runs
    isRunning = true;

    try {
      const now = new Date();

      // Find pending notifications scheduled for now or earlier
      const dueNotifications = await db
        .select()
        .from(notifications)
        .where(
          and(
            eq(notifications.status, "pending"),
            lte(notifications.scheduledAt, now)
          )
        );

      if (dueNotifications.length > 0) {
        console.log(`[scheduler] Processing ${dueNotifications.length} scheduled notification(s)...`);

        for (const notif of dueNotifications) {
          try {
            const result = await sendPushNotification({
              title: notif.title,
              body: notif.body,
              imageUrl: notif.imageUrl || undefined,
              target: notif.target as any,
            });

            await db
              .update(notifications)
              .set({
                status: "sent",
                sentAt: new Date(),
                successCount: result.successCount,
                failureCount: result.failureCount,
                updatedAt: new Date(),
              })
              .where(eq(notifications.id, notif.id));

            console.log(
              `[scheduler] Notification #${notif.id} sent successfully. Success: ${result.successCount}, Failures: ${result.failureCount}`
            );
          } catch (sendErr: any) {
            console.error(`[scheduler] Failed to send scheduled notification #${notif.id}:`, sendErr.message);

            await db
              .update(notifications)
              .set({
                status: "failed",
                updatedAt: new Date(),
              })
              .where(eq(notifications.id, notif.id));
          }
        }
      }
    } catch (cronError) {
      console.error("[scheduler] Error during notification cron cycle:", cronError);
    } finally {
      isRunning = false;
    }
  });
}
