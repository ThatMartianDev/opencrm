import { prisma } from "@/lib/db/client";
import {
    ActivityOutcome,
    ActivitySource,
    ActivityType,
    Prisma,
} from "@/generated/prisma/client";
import { EntityRef } from "./types";
import { assertCrmLinksBelongToOrganization } from "@/lib/dal/crm-links";

function entityToField(ref: EntityRef) {
    switch (ref.entityType) {
        case "deal": return { dealId: ref.entityId };
        case "contact": return { contactId: ref.entityId };
        case "company": return { companyId: ref.entityId };
        case "record": return { recordId: ref.entityId };
    }
}

function entityToLinks(ref: EntityRef) {
    switch (ref.entityType) {
        case "deal": return { dealId: ref.entityId };
        case "contact": return { contactId: ref.entityId };
        case "company": return { companyId: ref.entityId };
        case "record": return { recordId: ref.entityId };
    }
}

export const ActivityLogService = {
    async getActivities(ref: EntityRef, organizationId: string) {
        await assertCrmLinksBelongToOrganization(
            organizationId,
            entityToLinks(ref),
            { includeDeleted: true },
        );

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
        source?: ActivitySource;
        outcome?: ActivityOutcome;
        description?: string;
        metadata?: Record<string, unknown>;
    }) {
        await assertCrmLinksBelongToOrganization(
            data.organizationId,
            entityToLinks(data.entity),
            { includeDeleted: true },
        );

        return prisma.activity.create({
            data: {
                organizationId: data.organizationId,
                memberId: data.memberId,
                ...entityToField(data.entity),
                source: data.source,
                activityType: data.activityType,
                title: data.title,
                outcome: data.outcome,
                description: data.description,
                metadata: data.metadata ? (data.metadata as Prisma.InputJsonValue) : undefined,
            },
        });
    },
};
