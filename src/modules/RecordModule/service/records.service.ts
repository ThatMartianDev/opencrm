import { Prisma } from "@/generated/prisma/client";
import {
    RecordFieldType,
    type ModuleFeature,
} from "@/generated/prisma/enums";
import { prisma } from "@/lib/db/client";
import { NotificationsService } from "@/modules/notifications/service";
import type {
    RecordPageQuery,
    RecordRelationshipInput,
    RecordValueInput,
} from "./types";
import { RecordActivityService } from "./record-activity.service";

const validateRelationships = async (
    transaction: Prisma.TransactionClient,
    input: {
        organizationId: string;
        moduleId: string;
        relationships: RecordRelationshipInput[];
    },
) => {
    if (input.relationships.length === 0) return new Map<string, {
        id: string;
        moduleId: string;
        displayName: string;
    }>();

    const fieldIds = input.relationships.map((relationship) => relationship.fieldId);
    if (new Set(fieldIds).size !== fieldIds.length) {
        throw new Error("A relationship field can link only one record.");
    }

    const fields = await transaction.recordField.findMany({
        where: {
            id: { in: fieldIds },
            moduleId: input.moduleId,
            type: RecordFieldType.RELATIONSHIP,
            module: {
                organizationId: input.organizationId,
                archivedAt: null,
            },
        },
        include: { relationshipDefinition: true },
    });
    if (fields.length !== fieldIds.length) {
        throw new Error("A relationship field is invalid.");
    }

    const targetIds = input.relationships.map(
        (relationship) => relationship.targetRecordId,
    );
    const targets = await transaction.recordItem.findMany({
        where: {
            id: { in: targetIds },
            organizationId: input.organizationId,
            archivedAt: null,
            module: { archivedAt: null },
        },
        select: { id: true, moduleId: true, displayName: true },
    });
    const targetsById = new Map(targets.map((target) => [target.id, target]));
    const fieldsById = new Map(fields.map((field) => [field.id, field]));

    for (const relationship of input.relationships) {
        const field = fieldsById.get(relationship.fieldId);
        const target = targetsById.get(relationship.targetRecordId);
        if (
            !field?.relationshipDefinition ||
            !target ||
            target.moduleId !== field.relationshipDefinition.targetModuleId
        ) {
            throw new Error("A relationship target is invalid.");
        }
    }

    return targetsById;
};

const valuesEqual = (left: unknown, right: unknown) =>
    JSON.stringify(left ?? null) === JSON.stringify(right ?? null);

const getConfiguredOptions = (config: Prisma.JsonValue | null) => {
    if (!config || typeof config !== "object" || Array.isArray(config)) return [];
    const options = (config as { options?: unknown }).options;
    if (!Array.isArray(options)) return [];
    return options.filter((option): option is { label: string; value: string } =>
        typeof option === "object" && option !== null &&
        typeof (option as { label?: unknown }).label === "string" &&
        typeof (option as { value?: unknown }).value === "string",
    );
};

const formatFieldValue = (
    field: { type: RecordFieldType; config: Prisma.JsonValue | null },
    value: unknown,
) => {
    if (value === null || value === undefined || value === "") return null;
    const options = getConfiguredOptions(field.config);
    if (field.type === RecordFieldType.SELECT && typeof value === "string") {
        return options.find((option) => option.value === value)?.label ?? value;
    }
    if (field.type === RecordFieldType.MULTI_SELECT && Array.isArray(value)) {
        return value.map((item) =>
            options.find((option) => option.value === item)?.label ?? String(item),
        ).join(", ");
    }
    if (field.type === RecordFieldType.BOOLEAN) return value ? "Yes" : "No";
    return value;
};

const RecordsService = {
    async getLinkableRecords(
        organizationId: string,
        requiredFeature: ModuleFeature,
    ) {
        return prisma.recordModule.findMany({
            where: {
                organizationId,
                archivedAt: null,
                features: { has: requiredFeature },
            },
            select: {
                id: true,
                key: true,
                name: true,
                pluralName: true,
                icon: true,
                accentColor: true,
                records: {
                    where: { archivedAt: null },
                    select: { id: true, displayName: true, createdAt: true },
                    orderBy: [{ displayName: "asc" }, { id: "asc" }],
                },
            },
            orderBy: [{ name: "asc" }, { id: "asc" }],
        });
    },

    async getLinkableRecord(
        recordId: string,
        organizationId: string,
        requiredFeature: ModuleFeature,
    ) {
        return prisma.recordItem.findFirst({
            where: {
                id: recordId,
                organizationId,
                archivedAt: null,
                module: {
                    archivedAt: null,
                    features: { has: requiredFeature },
                },
            },
            select: {
                id: true,
                displayName: true,
                module: {
                    select: {
                        id: true,
                        key: true,
                        name: true,
                        icon: true,
                        accentColor: true,
                    },
                },
            },
        });
    },

    async getRelationshipFieldOptions(fieldId: string, organizationId: string) {
        const definition = await prisma.recordRelationshipDefinition.findFirst({
            where: {
                fieldId,
                field: {
                    module: { organizationId, archivedAt: null },
                },
                targetModule: { organizationId, archivedAt: null },
            },
            select: { targetModuleId: true },
        });
        if (!definition) return [];

        return prisma.recordItem.findMany({
            where: {
                moduleId: definition.targetModuleId,
                organizationId,
                archivedAt: null,
            },
            select: { id: true, displayName: true },
            orderBy: [{ displayName: "asc" }, { id: "asc" }],
        });
    },

    async getModulePageData(
        moduleKey: string,
        organizationId: string,
        query: RecordPageQuery = { page: 1, pageSize: 50, search: "" },
    ) {
        const recordModule = await prisma.recordModule.findFirst({
            where: {
                key: moduleKey,
                organizationId,
                archivedAt: null,
            },
            include: {
                fields: {
                    include: {
                        relationshipDefinition: {
                            include: {
                                targetModule: {
                                    select: { id: true, key: true, name: true, pluralName: true },
                                },
                            },
                        },
                    },
                    orderBy: { position: "asc" },
                },
                views: { orderBy: { position: "asc" } },
            },
        });
        if (!recordModule) return null;

        const search = query.search.trim();
        const searchClause = search
            ? Prisma.sql`
                AND (
                    record_item."displayName" ILIKE ${`%${search}%`}
                    OR EXISTS (
                        SELECT 1
                        FROM "RecordFieldValue" AS field_value
                        WHERE field_value."recordId" = record_item."id"
                          AND field_value."value"::text ILIKE ${`%${search}%`}
                    )
                )
            `
            : Prisma.empty;

        const recordPage = await prisma.$transaction(async (transaction) => {
            const [countRow] = await transaction.$queryRaw<{ count: number }[]>(
                Prisma.sql`
                    SELECT COUNT(*)::integer AS "count"
                    FROM "RecordItem" AS record_item
                    WHERE record_item."moduleId" = ${recordModule.id}
                      AND record_item."organizationId" = ${organizationId}
                      AND record_item."archivedAt" IS NULL
                      ${searchClause}
                `,
            );
            const totalRecords = countRow?.count ?? 0;
            const totalPages = Math.max(1, Math.ceil(totalRecords / query.pageSize));
            const page = Math.min(query.page, totalPages);
            const offset = (page - 1) * query.pageSize;
            const recordIds = await transaction.$queryRaw<{ id: string }[]>(
                Prisma.sql`
                    SELECT record_item."id"
                    FROM "RecordItem" AS record_item
                    WHERE record_item."moduleId" = ${recordModule.id}
                      AND record_item."organizationId" = ${organizationId}
                      AND record_item."archivedAt" IS NULL
                      ${searchClause}
                    ORDER BY record_item."createdAt" DESC, record_item."id" DESC
                    LIMIT ${query.pageSize}
                    OFFSET ${offset}
                `,
            );
            const ids = recordIds.map((record) => record.id);
            const records = ids.length === 0
                ? []
                : await transaction.recordItem.findMany({
                      where: { id: { in: ids } },
                      include: {
                          values: true,
                          owner: {
                              select: {
                                  id: true,
                                  user: {
                                      select: {
                                          name: true,
                                          email: true,
                                          avatarUrl: true,
                                      },
                                  },
                              },
                          },
                          outgoingRelationships: {
                              include: {
                                  targetRecord: {
                                      select: { id: true, displayName: true },
                                  },
                              },
                          },
                      },
                  });
            const recordsById = new Map(records.map((record) => [record.id, record]));

            return {
                records: ids.flatMap((id) => {
                    const record = recordsById.get(id);
                    return record ? [record] : [];
                }),
                pagination: {
                    page,
                    pageSize: query.pageSize,
                    totalRecords,
                    totalPages,
                    search,
                },
            };
        });

        return { ...recordModule, ...recordPage };
    },

    async getRecord(
        moduleKey: string,
        recordId: string,
        organizationId: string,
    ) {
        return prisma.recordItem.findFirst({
            where: {
                id: recordId,
                organizationId,
                archivedAt: null,
                module: {
                    key: moduleKey,
                    archivedAt: null,
                },
            },
            include: {
                values: true,
                outgoingRelationships: {
                    include: {
                        targetRecord: {
                            select: {
                                id: true,
                                displayName: true,
                                module: { select: { id: true, key: true, name: true } },
                            },
                        },
                    },
                },
                incomingRelationships: {
                    where: {
                        sourceRecord: {
                            archivedAt: null,
                            module: { archivedAt: null },
                        },
                    },
                    include: {
                        field: { select: { id: true, label: true } },
                        sourceRecord: {
                            select: {
                                id: true,
                                displayName: true,
                                module: {
                                    select: {
                                        id: true,
                                        key: true,
                                        name: true,
                                        pluralName: true,
                                        icon: true,
                                        accentColor: true,
                                    },
                                },
                            },
                        },
                    },
                },
                module: {
                    include: {
                        fields: {
                            include: {
                                relationshipDefinition: {
                                    include: {
                                        targetModule: {
                                            select: {
                                                id: true,
                                                key: true,
                                                name: true,
                                                pluralName: true,
                                            },
                                        },
                                    },
                                },
                            },
                            orderBy: { position: "asc" },
                        },
                    },
                },
                owner: {
                    select: {
                        id: true,
                        user: {
                            select: {
                                name: true,
                                email: true,
                                avatarUrl: true,
                            },
                        },
                    },
                },
            },
        });
    },

    async createRecord(input: {
        organizationId: string;
        moduleId: string;
        createdById: string;
        ownerId?: string;
        displayName: string;
        values: RecordValueInput[];
        relationships?: RecordRelationshipInput[];
    }) {
        const record = await prisma.$transaction(async (transaction) => {
            const relationships = input.relationships ?? [];
            await validateRelationships(transaction, { ...input, relationships });
            const ownerId = input.ownerId ?? input.createdById;
            const owner = await transaction.member.findFirst({
                where: { id: ownerId, organizationId: input.organizationId },
                select: { id: true },
            });
            if (!owner) return null;

            const record = await transaction.recordItem.create({
                data: {
                    organizationId: input.organizationId,
                    moduleId: input.moduleId,
                    createdById: input.createdById,
                    ownerId,
                    displayName: input.displayName,
                    values: { create: input.values },
                },
                include: {
                    values: true,
                    module: { select: { key: true } },
                },
            });
            if (relationships.length > 0) {
                await transaction.recordRelationship.createMany({
                    data: relationships.map((relationship) => ({
                        organizationId: input.organizationId,
                        fieldId: relationship.fieldId,
                        sourceRecordId: record.id,
                        targetRecordId: relationship.targetRecordId,
                    })),
                });
            }
            return record;
        });
        if (record) {
            await RecordActivityService.created({
                organizationId: input.organizationId,
                memberId: input.createdById,
                recordId: record.id,
                recordName: record.displayName,
            });
            if (record.ownerId !== input.createdById) {
                try {
                    await NotificationsService.notifyRecordAssignment({
                        organizationId: input.organizationId,
                        moduleKey: record.module.key,
                        recordId: record.id,
                        recordName: record.displayName,
                        assignedToId: record.ownerId,
                        actorMemberId: input.createdById,
                    });
                } catch (error) {
                    console.error("[records] failed to enqueue assignment notification", {
                        recordId: record.id,
                        error,
                    });
                }
            }
        }
        return record;
    },

    async updateRecord(input: {
        organizationId: string;
        moduleId: string;
        recordId: string;
        displayName: string;
        values: RecordValueInput[];
        relationships?: RecordRelationshipInput[];
        memberId: string;
        canUpdateAny: boolean;
    }) {
        const result = await prisma.$transaction(async (transaction) => {
            const record = await transaction.recordItem.findFirst({
                where: {
                    id: input.recordId,
                    moduleId: input.moduleId,
                    organizationId: input.organizationId,
                    archivedAt: null,
                    ...(input.canUpdateAny ? {} : { ownerId: input.memberId }),
                },
                select: {
                    id: true,
                    values: { select: { fieldId: true, value: true } },
                    outgoingRelationships: {
                        select: {
                            fieldId: true,
                            targetRecordId: true,
                            targetRecord: { select: { displayName: true } },
                        },
                    },
                    module: {
                        select: {
                            fields: {
                                select: {
                                    id: true,
                                    label: true,
                                    type: true,
                                    config: true,
                                },
                            },
                        },
                    },
                },
            });

            if (!record) return null;

            const relationships = input.relationships ?? [];
            const relationshipTargets = await validateRelationships(
                transaction,
                { ...input, relationships },
            );
            const previousValues = new Map(
                record.values.map((value) => [value.fieldId, value.value]),
            );
            const nextValues = new Map(
                input.values.map((value) => [value.fieldId, value.value]),
            );
            const previousRelationships = new Map(
                record.outgoingRelationships.map((relationship) => [
                    relationship.fieldId,
                    relationship,
                ]),
            );
            const nextRelationships = new Map(
                relationships.map((relationship) => [
                    relationship.fieldId,
                    relationship,
                ]),
            );
            const changes = record.module.fields.flatMap((field) => {
                if (field.type === RecordFieldType.RELATIONSHIP) {
                    const previous = previousRelationships.get(field.id);
                    const next = nextRelationships.get(field.id);
                    if (previous?.targetRecordId === next?.targetRecordId) return [];
                    return [{
                        fieldName: field.label,
                        previousValue: previous?.targetRecord.displayName ?? null,
                        nextValue: next
                            ? relationshipTargets.get(next.targetRecordId)?.displayName ?? null
                            : null,
                    }];
                }

                const previousValue = previousValues.get(field.id) ?? null;
                const nextValue = nextValues.get(field.id) ?? null;
                if (valuesEqual(previousValue, nextValue)) return [];
                return [{
                    fieldName: field.label,
                    previousValue: formatFieldValue(field, previousValue),
                    nextValue: formatFieldValue(field, nextValue),
                }];
            });

            await transaction.recordFieldValue.deleteMany({
                where: { recordId: input.recordId },
            });
            await transaction.recordRelationship.deleteMany({
                where: { sourceRecordId: input.recordId },
            });

            await transaction.recordItem.update({
                where: { id: input.recordId },
                data: {
                    displayName: input.displayName,
                    values: { create: input.values },
                },
            });

            if (relationships.length > 0) {
                await transaction.recordRelationship.createMany({
                    data: relationships.map((relationship) => ({
                        organizationId: input.organizationId,
                        fieldId: relationship.fieldId,
                        sourceRecordId: input.recordId,
                        targetRecordId: relationship.targetRecordId,
                    })),
                });
            }

            const updatedRecord = await transaction.recordItem.findUnique({
                where: { id: input.recordId },
                include: { values: true },
            });
            return { record: updatedRecord, changes };
        });
        if (result?.record && result.changes.length > 0) {
            await RecordActivityService.fieldsUpdated({
                organizationId: input.organizationId,
                memberId: input.memberId,
                recordId: input.recordId,
                changes: result.changes,
            });
        }
        return result?.record ?? null;
    },

    async archiveRecord(input: {
        organizationId: string;
        recordId: string;
        memberId: string;
        canDeleteAny: boolean;
    }) {
        const record = await prisma.recordItem.findFirst({
            where: {
                id: input.recordId,
                organizationId: input.organizationId,
                archivedAt: null,
                ...(input.canDeleteAny ? {} : { ownerId: input.memberId }),
            },
            select: { id: true, displayName: true },
        });
        if (!record) return false;

        const result = await prisma.recordItem.updateMany({
            where: {
                id: input.recordId,
                organizationId: input.organizationId,
                archivedAt: null,
                ...(input.canDeleteAny ? {} : { ownerId: input.memberId }),
            },
            data: { archivedAt: new Date() },
        });

        const archived = result.count > 0;
        if (archived) {
            await RecordActivityService.archived({
                organizationId: input.organizationId,
                memberId: input.memberId,
                recordId: input.recordId,
                recordName: record.displayName,
            });
        }
        return archived;
    },

    async transferRecordOwnership(input: {
        organizationId: string;
        recordId: string;
        ownerId: string;
        memberId: string;
        canUpdateAny: boolean;
    }) {
        const owner = await prisma.member.findFirst({
            where: {
                id: input.ownerId,
                organizationId: input.organizationId,
            },
            select: {
                id: true,
                user: { select: { name: true, email: true } },
            },
        });
        if (!owner) return false;

        const record = await prisma.recordItem.findFirst({
            where: {
                id: input.recordId,
                organizationId: input.organizationId,
                archivedAt: null,
                ...(input.canUpdateAny ? {} : { ownerId: input.memberId }),
            },
            select: {
                displayName: true,
                module: { select: { key: true } },
                owner: {
                    select: {
                        id: true,
                        user: { select: { name: true, email: true } },
                    },
                },
            },
        });
        if (!record) return false;
        if (record.owner.id === owner.id) return true;

        const result = await prisma.recordItem.updateMany({
            where: {
                id: input.recordId,
                organizationId: input.organizationId,
                archivedAt: null,
                ...(input.canUpdateAny ? {} : { ownerId: input.memberId }),
            },
            data: { ownerId: input.ownerId },
        });

        const transferred = result.count > 0;
        if (transferred) {
            await RecordActivityService.ownershipTransferred({
                organizationId: input.organizationId,
                memberId: input.memberId,
                recordId: input.recordId,
                previousOwnerId: record.owner.id,
                previousOwnerName: record.owner.user.name ?? record.owner.user.email,
                nextOwnerId: owner.id,
                nextOwnerName: owner.user.name ?? owner.user.email,
            });
            if (owner.id !== input.memberId) {
                try {
                    await NotificationsService.notifyRecordAssignment({
                        organizationId: input.organizationId,
                        moduleKey: record.module.key,
                        recordId: input.recordId,
                        recordName: record.displayName,
                        assignedToId: owner.id,
                        actorMemberId: input.memberId,
                    });
                } catch (error) {
                    console.error("[records] failed to enqueue assignment notification", {
                        recordId: input.recordId,
                        error,
                    });
                }
            }
        }
        return transferred;
    },
};

export default RecordsService;