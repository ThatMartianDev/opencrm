import { prisma } from "@/lib/db/client";
import { boss } from "@/lib/queue";
import { DELIVER_NOTIFICATION_QUEUE } from "./delivery";
import { ensureDeliveryQueue, notificationDelivery } from "./service";
import type { NotificationChannel } from "./types";

type DeliverNotificationPayload = {
    notificationId: string;
    channels?: NotificationChannel[];
};

async function processQueuedNotification(payload: DeliverNotificationPayload) {
    if (!payload?.notificationId) {
        throw new Error("Missing notificationId in deliver-notification job payload");
    }

    const notification = await prisma.notification.findUnique({
        where: { id: payload.notificationId },
    });

    if (!notification) {
        return;
    }

    if (notification.status === "SENT") {
        console.log(`[notifications] notification ${notification.id} already sent, skipping`);
        return;
    }

    await notificationDelivery.dispatch(notification, payload.channels);
}

/**
 * Registers the deliver-notification consumer on the shared pg-boss instance.
 * Runs inside the web server process (see server.ts) so the InAppAdapter has
 * access to the socket.io instance for real-time push. Can also run in a
 * standalone process (worker/notifications.worker.ts) where the real-time
 * push is skipped and only DB persistence + email delivery happen.
 */
export async function registerNotificationWorker() {
    await ensureDeliveryQueue();

    await boss.work(DELIVER_NOTIFICATION_QUEUE, async (jobs) => {
        const results = await Promise.allSettled(
            jobs.map((job) =>
                processQueuedNotification(job.data as DeliverNotificationPayload),
            ),
        );
        for (const result of results) {
            if (result.status === "rejected") {
                console.error("[notifications] job failed:", result.reason);
            }
        }
    });

    console.log("[notifications] delivery worker registered");
}
