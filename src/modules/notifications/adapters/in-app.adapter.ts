import type { ChannelAdapter, NotificationRecipient } from "../types";
import type { Notification as NotificationModel } from "@/generated/prisma/client";
import { getIo } from "@/lib/realtime/index";

export class InAppAdapter implements ChannelAdapter {
  channel = "in_app" as const;

  async send(notification: NotificationModel, _recipient: NotificationRecipient): Promise<void> {
    const io = getIo();
    if (!io) return;

    io.to(`user:${notification.recipientId}`).emit("notification", notification);
  }
}
