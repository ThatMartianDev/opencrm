"use server";

import { TaskStatus } from "@/generated/prisma/enums";
import { getSessionClaims } from "@/lib/auth/session";
import { createQueryContext } from "@/lib/dal/scoped-query";
import { TasksService } from "./service";

export const getTasks = async () => {
    const session = await getSessionClaims();
    const ctx = createQueryContext(session);
    ctx.assertCan("tasks.read");

    // OWNER, ADMIN, MANAGER see all tasks; MEMBER sees only their own
    if (ctx.can("tasks.delete.any")) {
        return TasksService.getAllTasks(session.organizationId);
    }
    return TasksService.getTasksForMember(session.organizationId, session.memberId);
};

export const getTasksForDeal = async (dealId: string) => {
    const session = await getSessionClaims();
    const ctx = createQueryContext(session);
    ctx.assertCan("tasks.read");

    return TasksService.getTasksForDeal(dealId, session.organizationId);
};

export const getTasksForRecord = async (recordId: string) => {
    const session = await getSessionClaims();
    const ctx = createQueryContext(session);
    ctx.assertCan("tasks.read");

    return TasksService.getTasksForRecord(recordId, session.organizationId);
};

export const createTask = async (data: {
    name: string;
    description?: string;
    status?: TaskStatus;
    dueDate?: string;
    assignedToId?: string;
    dealId?: string;
    recordId?: string;
}) => {
    const session = await getSessionClaims();
    const ctx = createQueryContext(session);
    ctx.assertCan("tasks.create");

    return TasksService.createTask(
        {
            name: data.name,
            description: data.description,
            status: data.status,
            dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
            assignedToId: data.assignedToId,
            dealId: data.dealId,
            recordId: data.recordId,
            organizationId: session.organizationId,
        },
        session.memberId,
    );
};

export const updateTaskStatus = async (taskId: string, status: TaskStatus) => {
    const session = await getSessionClaims();
    const ctx = createQueryContext(session);
    ctx.assertCan("tasks.update");

    return TasksService.updateTaskStatus(
        taskId,
        status,
        session.organizationId,
        session.memberId,
    );
};

export const updateTask = async (
    taskId: string,
    data: {
        name?: string;
        description?: string;
        dueDate?: string | null;
        assignedToId?: string | null;
        dealId?: string | null;
    },
) => {
    const session = await getSessionClaims();
    const ctx = createQueryContext(session);
    ctx.assertCan("tasks.update");

    return TasksService.updateTask(
        taskId,
        {
            name: data.name,
            description: data.description,
            dueDate: data.dueDate ? new Date(data.dueDate) : data.dueDate as null | undefined,
            assignedToId: data.assignedToId,
            dealId: data.dealId,
        },
        session.organizationId,
        session.memberId,
    );
};

export const deleteTask = async (taskId: string) => {
    const session = await getSessionClaims();
    const ctx = createQueryContext(session);

    const canDeleteAny = ctx.can("tasks.delete.any");
    if (!canDeleteAny) ctx.assertCan("tasks.delete.own");

    return TasksService.deleteTask({
        taskId,
        organizationId: session.organizationId,
        memberId: session.memberId,
        canDeleteAny,
    });
};
