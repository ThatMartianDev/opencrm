"use server";

import { getSessionClaims } from "@/lib/auth/session";
import { ActivityLogService } from "./service";
import { EntityType } from "./types";
import { ActivityOutcome, ActivityType } from "@/generated/prisma/enums";

export async function getActivities(entityType: EntityType, entityId: string) {
    const session = await getSessionClaims();
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
