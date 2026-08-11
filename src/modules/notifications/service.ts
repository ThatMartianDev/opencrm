import { prisma } from "@/lib/db/client";
import { boss, ensureQueueStarted } from "@/lib/queue";
import { EmailAdapter } from "./adapters/email.adapter";
import { InAppAdapter } from "./adapters/in-app.adapter";
import { DELIVER_NOTIFICATION_QUEUE, NotificationDelivery } from "./delivery";

export const notificationDelivery = new NotificationDelivery(prisma, boss, [
  new InAppAdapter(),
  new EmailAdapter(),
]);

let deliveryQueueReady = false;

/**
  Starts pg-boss and makes sure the delivery queue exists before producing to it
 */
export async function ensureDeliveryQueue() {
  if (deliveryQueueReady) {
    return;
  }

  await ensureQueueStarted();
  await boss.createQueue(DELIVER_NOTIFICATION_QUEUE);
  deliveryQueueReady = true;
}

function getReminderSchedule(dueDate: Date): Date | null {
  const scheduledAt = new Date(dueDate);
  scheduledAt.setDate(scheduledAt.getDate() - 1);

  if (scheduledAt <= new Date()) {
    return null;
  }

  return scheduledAt;
}

export const NotificationsService = {
  async getRecentNotifications(organizationId: string, memberId: string) {
    return prisma.notification.findMany({
      where: {
        organizationId,
        recipientId: memberId,
        status: "SENT",
      },
      orderBy: { createdAt: "desc" },
      take: 30,
    });
  },

  async markNotificationRead(
    notificationId: string,
    organizationId: string,
    memberId: string,
  ) {
    await prisma.notification.updateMany({
      where: {
        id: notificationId,
        organizationId,
        recipientId: memberId,
        readAt: null,
      },
      data: { readAt: new Date() },
    });
  },

  async markAllNotificationsRead(organizationId: string, memberId: string) {
    await prisma.notification.updateMany({
      where: {
        organizationId,
        recipientId: memberId,
        readAt: null,
        status: "SENT",
      },
      data: { readAt: new Date() },
    });
  },

  /**
   * Deletes still-pending scheduled notifications for a task (e.g. the
   * "due tomorrow" reminder). The queued pg-boss job will find no
   * notification row and skip delivery.
   */
  async cancelPendingTaskNotifications(taskId: string, organizationId: string) {
    await prisma.notification.deleteMany({
      where: {
        organizationId,
        status: "PENDING",
        dedupeKey: { startsWith: `task_due:${taskId}:` },
      },
    });
  },

  async cancelPendingDealNotifications(dealId: string, organizationId: string) {
    await prisma.notification.deleteMany({
      where: {
        organizationId,
        status: "PENDING",
        dedupeKey: { startsWith: `deal_assigned:${dealId}:` },
      },
    });
  },

  async notifyDealAssignment(params: {
    organizationId: string;
    dealId: string;
    dealTitle: string;
    assignedToId?: string | null;
    /** The member performing the assignment — self-assignments are not notified. */
    actorMemberId?: string | null;
  }) {
    if (!params.assignedToId) {
      return;
    }

    if (params.actorMemberId && params.actorMemberId === params.assignedToId) {
      return;
    }

    const assignee = await prisma.member.findFirst({
      where: {
        id: params.assignedToId,
        organizationId: params.organizationId,
      },
      include: { user: true },
    });

    if (!assignee) {
      return;
    }

    await ensureDeliveryQueue();

    await notificationDelivery.notify({
      member: assignee,
      type: "deal_assigned",
      title: `Deal assigned to you: ${params.dealTitle}`,
      body: "You are now the owner of this deal.",
      link: `/app/${params.organizationId}/deals/${params.dealId}`,
      data: {
        dealId: params.dealId,
      },
      channels: ["in_app", "email"],
      dedupeKey: `deal_assigned:${params.dealId}`,
    });
  },

  async notifyRecordAssignment(params: {
    organizationId: string;
    moduleKey: string;
    recordId: string;
    recordName: string;
    assignedToId: string;
    actorMemberId?: string | null;
  }) {
    if (params.actorMemberId === params.assignedToId) {
      return;
    }

    const assignee = await prisma.member.findFirst({
      where: {
        id: params.assignedToId,
        organizationId: params.organizationId,
      },
      include: { user: true },
    });
    if (!assignee) {
      return;
    }

    await ensureDeliveryQueue();

    await notificationDelivery.notify({
      member: assignee,
      type: "record_assigned",
      title: `Record assigned to you: ${params.recordName}`,
      body: "You are now the owner of this record.",
      link: `/app/${params.organizationId}/${params.moduleKey}/${params.recordId}`,
      data: {
        recordId: params.recordId,
        moduleKey: params.moduleKey,
      },
      channels: ["in_app", "email"],
    });
  },

  async notifyTaskAssignment(params: {
    organizationId: string;
    taskId: string;
    taskName: string;
    taskDescription?: string | null;
    dueDate?: Date | null;
    dealId?: string | null;
    assignedToId?: string | null;
  }) {    if (!params.assignedToId) {
      return;
    }

    const assignee = await prisma.member.findFirst({
      where: {
        id: params.assignedToId,
        organizationId: params.organizationId,
      },
      include: { user: true },
    });

    if (!assignee) {
      return;
    }

    await ensureDeliveryQueue();

    await notificationDelivery.notify({
      member: assignee,
      type: "task_assigned",
      title: `New task assigned: ${params.taskName}`,
      body: params.taskDescription ?? "You have a new assigned task.",
      link: `/app/${params.organizationId}/tasks`,
      data: {
        taskId: params.taskId,
        dealId: params.dealId,
        dueDate: params.dueDate?.toISOString() ?? null,
      },
      channels: ["in_app", "email"],
      dedupeKey: `task_assigned:${params.taskId}`,
    });

    if (!params.dueDate) {
      return;
    }

    const scheduledAt = getReminderSchedule(params.dueDate);
    if (!scheduledAt) {
      return;
    }

    await notificationDelivery.notify({
      member: assignee,
      type: "task_due",
      title: `Task due soon: ${params.taskName}`,
      body: "Reminder: this task is due tomorrow.",
      link: `/app/${params.organizationId}/tasks`,
      data: {
        taskId: params.taskId,
        dueDate: params.dueDate.toISOString(),
      },
      channels: ["in_app", "email"],
      scheduledAt,
      dedupeKey: `task_due:${params.taskId}:${params.dueDate.toISOString().slice(0, 10)}`,
    });
  },
};
