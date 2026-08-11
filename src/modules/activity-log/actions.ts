"use server";

import { getSessionClaims } from "@/lib/auth/session";
import { ActivityLogService } from "./service";
import { EntityType } from "./types";
import { ActivityOutcome, ActivityType } from "@/generated/prisma/enums";
import { createQueryContext } from "@/lib/dal/scoped-query";
import { prisma } from "@/lib/db/client";

async function assertRecordActivityWriteAccess(
    recordId: string,
    organizationId: string,
    memberId: string,
    canUpdateAny: boolean,
) {
    const record = await prisma.recordItem.findFirst({
        where: {
            id: recordId,
            organizationId,
            archivedAt: null,
            ...(canUpdateAny ? {} : { ownerId: memberId }),
        },
        select: { id: true },
    });
    if (!record) throw new Error("Record not found or you do not own it.");
}

export async function getActivities(entityType: EntityType, entityId: string) {
    const session = await getSessionClaims();
    if (entityType === "record") {
        createQueryContext(session).assertCan("records.read");
    }
    return ActivityLogService.getActivities({ entityType, entityId }, session.organizationId);
}

export async function logActivity(data: {
    entityType: EntityType;
    entityId: string;
    activityType: ActivityType;
    title: string;
    outcome?: ActivityOutcome;
    description?: string;
    metadata?: Record<string, unknown>;
}) {
    const session = await getSessionClaims();
    if (data.entityType === "record") {
        const ctx = createQueryContext(session);
        const canUpdateAny = ctx.can("records.update.any");
        if (!canUpdateAny) ctx.assertCan("records.update.own");
        await assertRecordActivityWriteAccess(
            data.entityId,
            session.organizationId,
            session.memberId,
            canUpdateAny,
        );
    }
    return ActivityLogService.log({
        organizationId: session.organizationId,
        memberId: session.memberId,
        entity: { entityType: data.entityType, entityId: data.entityId },
        activityType: data.activityType,
        outcome: data.outcome,
        title: data.title,
        description: data.description,
        metadata: data.metadata,
    });
}
