import { Prisma, PrismaClient, Notification } from "@/generated/prisma/client";
import { PgBoss } from "pg-boss";
import {
  ChannelAdapter,
  NotificationRecipient,
  NotifyInput,
  NotificationChannel,
} from "./types";

type DeliveryStatus = "PENDING" | "SENT" | "FAILED";

export const DELIVER_NOTIFICATION_QUEUE = "deliver-notification";

export class NotificationDelivery {
  constructor(
    private prisma: PrismaClient,
    private boss: PgBoss,
    private adapters: ChannelAdapter[],
  ) {}

  async notify(input: NotifyInput) {
    const notification = await this.createOrReuseNotification(input);

    // All notifications go through the queue, immediate ones use scheduledAt = now
    // which pg-boss picks up immediately, but with retry semantics on failure
    await this.boss.send(
      DELIVER_NOTIFICATION_QUEUE,
      { notificationId: notification.id, channels: input.channels },
      { startAfter: notification.scheduledAt },
    );

    return notification;
  }
  
  async dispatch(notification: Notification, channels?: NotificationChannel[]) {
    const recipient = await this.getRecipient(notification.recipientId);
    const targetChannels = channels ?? ["in_app"];

    const relevantAdapters = this.adapters.filter((a) =>
      targetChannels.includes(a.channel),
    );

    const results = await Promise.allSettled(
      relevantAdapters.map(async (adapter) => {
        try {
          await adapter.send(notification, recipient);
          await this.recordDelivery(notification.id, adapter.channel, "SENT");
        } catch (err) {
          await this.recordDelivery(
            notification.id,
            adapter.channel,
            "FAILED",
            String(err),
          );
          throw err;
        }
      }),
    );

    const hadFailures = results.some((r) => r.status === "rejected");

    await this.prisma.notification.update({
      where: { id: notification.id },
      data: {
        status: hadFailures ? "FAILED" : "SENT",
        sentAt: hadFailures ? null : new Date(),
      },
    });
  }

  private async recordDelivery(
    notificationId: string,
    channel: NotificationChannel,
    status: DeliveryStatus,
    error?: string,
  ) {
    await this.prisma.notificationDelivery.create({
      data: {
        notificationId,
        channel,
        status,
        sentAt: status === "SENT" ? new Date() : null,
        error,
      },
    });
  }

  private async createOrReuseNotification(input: NotifyInput): Promise<Notification> {
    try {
      return await this.prisma.notification.create({
        data: {
          organizationId: input.member.organizationId,
          recipientId: input.member.id,
          type: input.type,
          title: input.title,
          body: input.body,
          link: input.link,
          data: input.data,
          scheduledAt: input.scheduledAt ?? new Date(),
          dedupeKey: input.dedupeKey,
          status: "PENDING",
        },
      });
    } catch (error) {
      const isUniqueViolation =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002" &&
        !!input.dedupeKey;

      if (!isUniqueViolation) {
        throw error;
      }

      const existing = await this.prisma.notification.findFirst({
        where: {
          organizationId: input.member.organizationId,
          recipientId: input.member.id,
          type: input.type,
          dedupeKey: input.dedupeKey,
        },
      });

      if (!existing) {
        throw error;
      }

      return existing;
    }
  }

  private async getRecipient(recipientId: string): Promise<NotificationRecipient> {
    const member = await this.prisma.member.findUniqueOrThrow({
      where: { id: recipientId },
      include: { user: true },
    });

    return {
      member,
      user: member.user,
    };
  }
}