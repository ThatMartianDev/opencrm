import { prisma } from "@/lib/db/client";
import { ActivityOutcome, ActivityType, Prisma } from "@/generated/prisma/client";
import { EntityRef } from "./types";

function entityToField(ref: EntityRef) {
    switch (ref.entityType) {
        case "deal": return { dealId: ref.entityId };
        case "contact": return { contactId: ref.entityId };
        case "company": return { companyId: ref.entityId };
    }
}

export const ActivityLogService = {
    async getActivities(ref: EntityRef, organizationId: string) {
        return prisma.activity.findMany({
            where: { ...entityToField(ref), organizationId },
            include: {
                member: {
                    include: { user: { select: { name: true, avatarUrl: true } } },
                },
            },
            orderBy: { createdAt: "desc" },
        });
    },

    async log(data: {
        organizationId: string;
        memberId: string;
        entity: EntityRef;
        activityType: ActivityType;
        title: string;
        outcome?: ActivityOutcome;
        description?: string;
        metadata?: Record<string, unknown>;
    }) {
        return prisma.activity.create({
            data: {
                organizationId: data.organizationId,
                memberId: data.memberId,
                ...entityToField(data.entity),
                activityType: data.activityType,
                title: data.title,
                outcome: data.outcome,
                description: data.description,
                metadata: data.metadata ? (data.metadata as Prisma.InputJsonValue) : undefined,
            },
        });
    },
};
