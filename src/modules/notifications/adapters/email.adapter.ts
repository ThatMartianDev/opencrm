import type { ChannelAdapter, NotificationRecipient } from "../types";
import { Notification as NotificationModel } from "@/generated/prisma/client";

import { sendEmail } from "@/lib/email";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export class EmailAdapter implements ChannelAdapter {
  channel = 'email' as const;
  async send(notification: NotificationModel, recipient: NotificationRecipient) {
    if (!recipient.user.email) return;
    await sendEmail({
      to: recipient.user.email,
      subject: notification.title,
      text: notification.body ?? "",
      html: notification.body ? `<p>${escapeHtml(notification.body)}</p>` : "",
    });
  }
}
