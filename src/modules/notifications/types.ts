// types.ts

import {
  Member,
  Notification as NotificationModel,
  Prisma,
  User,
} from "@/generated/prisma/client";

export type NotificationChannel = "in_app" | "email" | "push" | "sms";

export interface NotifyInput {
  member: Member;
  type: string;
  title: string;
  body?: string;
  link?: string;
  data?: Prisma.InputJsonValue;
  channels?: NotificationChannel[];
  scheduledAt?: Date;
  dedupeKey?: string;
}

export interface NotificationRecipient {
  user: User;
  member: Member;
}

export interface ChannelAdapter {
  channel: NotificationChannel;
  send(
    notification: NotificationModel,
    recipient: NotificationRecipient,
  ): Promise<void>;
  // adapter decides for itself if it even should send
  // e.g. push adapter checks if user has a device token, returns early if not
}
