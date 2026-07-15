import { prisma } from "@/lib/db/client";
import { ActivityType, TaskStatus } from "@/generated/prisma/enums";
import { NotificationsService } from "@/modules/notifications/service";
import { ActivityLogService } from "@/modules/activity-log/service";

const taskInclude = {
    assignedTo: {
        include: { user: { select: { name: true, avatarUrl: true } } },
    },
    deal: { select: { id: true, title: true } },
} as const;

export const TasksService = {
    async getAllTasks(organizationId: string) {
        return prisma.task.findMany({
            where: { organizationId, deletedAt: null },
            include: taskInclude,
            orderBy: { createdAt: "desc" },
        });
    },

    async getTasksForMember(organizationId: string, memberId: string) {
        return prisma.task.findMany({
            where: { organizationId, assignedToId: memberId, deletedAt: null },
            include: taskInclude,
            orderBy: { createdAt: "desc" },
        });
    },

    async getTasksForDeal(dealId: string, organizationId: string) {
        return prisma.task.findMany({
            where: { dealId, organizationId, deletedAt: null },
            include: taskInclude,
            orderBy: { createdAt: "desc" },
        });
    },

    async getTaskById(taskId: string, organizationId: string) {
        return prisma.task.findFirst({
            where: { id: taskId, organizationId, deletedAt: null },
            include: taskInclude,
        });
    },

    async createTask(
        data: {
            name: string;
            description?: string;
            status?: TaskStatus;
            dueDate?: Date;
            assignedToId?: string;
            dealId?: string;
            organizationId: string;
        },
        memberId?: string,
    ) {
        const task = await prisma.task.create({
            data: {
                name: data.name,
                description: data.description,
                status: data.status,
                dueDate: data.dueDate,
                assignedToId: data.assignedToId,
                dealId: data.dealId,
                organizationId: data.organizationId,
                createdById: memberId,
            },
            include: taskInclude,
        });

        if (memberId && task.dealId) {
            await ActivityLogService.log({
                organizationId: data.organizationId,
                memberId,
                entity: { entityType: "deal", entityId: task.dealId },
                activityType: ActivityType.CREATION,
                title: `Task created: ${data.name}`,
            });
        }

        try {
            await NotificationsService.notifyTaskAssignment({
                organizationId: data.organizationId,
                taskId: task.id,
                taskName: task.name,
                taskDescription: task.description,
                dueDate: task.dueDate,
                dealId: task.dealId,
                assignedToId: task.assignedToId,
            });
        } catch (error) {
            console.error("[tasks] failed to enqueue task notifications", {
                taskId: task.id,
                error,
            });
        }

        return task;
    },

    async updateTaskStatus(
        taskId: string,
        status: TaskStatus,
        organizationId: string,
        memberId: string,
    ) {
        const task = await prisma.task.findFirst({ where: { id: taskId, organizationId, deletedAt: null } });
        if (!task) throw new Error("Task not found");
        const oldStatus = task.status;

        const updated = await prisma.task.update({
            where: { id: taskId },
            data: {
                status,
                completedAt: status === TaskStatus.COMPLETED ? new Date() : null,
            },
            include: taskInclude,
        });

        if (updated.dealId) {
            await ActivityLogService.log({
                organizationId,
                memberId,
                entity: { entityType: "deal", entityId: updated.dealId },
                activityType: ActivityType.STATUS_CHANGE,
                title: `Task status changed`,
                metadata: { field: "status", from: oldStatus, to: status },
            });
        }

        try {
            if (status === TaskStatus.COMPLETED) {
                await NotificationsService.cancelPendingTaskNotifications(taskId, organizationId);
            } else if (oldStatus === TaskStatus.COMPLETED) {
                // When reopened, reschedule the due-date reminder
                await NotificationsService.notifyTaskAssignment({
                    organizationId,
                    taskId: updated.id,
                    taskName: updated.name,
                    taskDescription: updated.description,
                    dueDate: updated.dueDate,
                    dealId: updated.dealId,
                    assignedToId: updated.assignedToId,
                });
            }
        } catch (error) {
            console.error("[tasks] failed to sync task notifications", { taskId, error });
        }

        return updated;
    },

    async updateTask(
        taskId: string,
        data: {
            name?: string;
            description?: string;
            dueDate?: Date | null;
            assignedToId?: string | null;
            dealId?: string | null;
        },
        organizationId: string,
        memberId: string,
    ) {
        const task = await prisma.task.findFirst({ where: { id: taskId, organizationId, deletedAt: null } });
        if (!task) throw new Error("Task not found");

        const updated = await prisma.task.update({
            where: { id: taskId },
            data,
            include: taskInclude,
        });

        if (updated.dealId) {
            await ActivityLogService.log({
                organizationId,
                memberId,
                entity: { entityType: "deal", entityId: updated.dealId },
                activityType: ActivityType.STATUS_CHANGE,
                title: `Task updated: ${updated.name}`,
            });
        }

        const assigneeChanged =
            data.assignedToId !== undefined && data.assignedToId !== task.assignedToId;
        const dueDateChanged =
            data.dueDate !== undefined &&
            (data.dueDate?.getTime() ?? null) !== (task.dueDate?.getTime() ?? null);

        if (assigneeChanged || dueDateChanged) {
            try {
                // Drop reminders that no longer apply (old assignee / old due date) then re-notify
                await NotificationsService.cancelPendingTaskNotifications(taskId, organizationId);
                await NotificationsService.notifyTaskAssignment({
                    organizationId,
                    taskId: updated.id,
                    taskName: updated.name,
                    taskDescription: updated.description,
                    dueDate: updated.dueDate,
                    dealId: updated.dealId,
                    assignedToId: updated.assignedToId,
                });
            } catch (error) {
                console.error("[tasks] failed to sync task notifications", { taskId, error });
            }
        }

        return updated;
    },

    async deleteTask(data: {
        taskId: string;
        organizationId: string;
        memberId: string;
        canDeleteAny: boolean;
    }) {
        const result = await prisma.task.updateMany({
            where: {
                id: data.taskId,
                organizationId: data.organizationId,
                deletedAt: null,
                ...(data.canDeleteAny ? {} : { createdById: data.memberId }),
            },
            data: { deletedAt: new Date() },
        });

        if (result.count === 0) {
            const exists = await prisma.task.findFirst({
                where: { id: data.taskId, organizationId: data.organizationId, deletedAt: null },
                select: { id: true },
            });
            if (exists) throw new Error("You can only delete tasks you created.");
            throw new Error("Task not found.");
        }

        const task = await prisma.task.findFirst({
            where: { id: data.taskId },
            select: { dealId: true, name: true },
        });

        if (task?.dealId) {
            await ActivityLogService.log({
                organizationId: data.organizationId,
                memberId: data.memberId,
                entity: { entityType: "deal", entityId: task.dealId },
                activityType: ActivityType.STATUS_CHANGE,
                title: `Task deleted: ${task.name}`,
            });
        }

        try {
            await NotificationsService.cancelPendingTaskNotifications(
                data.taskId,
                data.organizationId,
            );
        } catch (error) {
            console.error("[tasks] failed to cancel task notifications", {
                taskId: data.taskId,
                error,
            });
        }
    },
};
