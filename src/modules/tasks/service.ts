import { prisma } from "@/lib/db/client";
import { ActivityType, TaskStatus } from "@/generated/prisma/enums";
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
    },
};
