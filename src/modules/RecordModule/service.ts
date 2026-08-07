import { Prisma } from "@/generated/prisma/client";
import {
    RecordFieldType,
    RecordViewType,
    type ModuleFeature,
} from "@/generated/prisma/enums";
import { prisma } from "@/lib/db/client";
import type {
    ModuleDetails,
    ModuleViewDraft,
    RecordModuleBuilderData,
    RecordFieldDraft,
} from "./ui/RecordModuleBuilder/types";

export type CreateRecordModuleInput = {
    organizationId: string;
    createdById: string;
    moduleDetails: ModuleDetails;
    dataFields: RecordFieldDraft[];
    moduleViews: ModuleViewDraft[];
    moduleFeatures: ModuleFeature[];
};

export type UpdateRecordModuleInput = CreateRecordModuleInput & {
    moduleId: string;
};

export type RecordValueInput = {
    fieldId: string;
    value: Prisma.InputJsonValue;
};

export type RecordRelationshipInput = {
    fieldId: string;
    targetRecordId: string;
};

export type RecordPageQuery = {
    page: number;
    pageSize: number;
    search: string;
};

const RESERVED_MODULE_KEYS = new Set([
    "calendar",
    "companies",
    "contacts",
    "deals",
    "emails",
    "home",
    "notes",
    "settings",
    "tasks",
    "team",
]);

const createModuleKey = async (name: string, organizationId: string) => {
    const baseKey =
        name
            .trim()
            .toLowerCase()
            .normalize("NFKD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9]+/g, "_")
            .replace(/^_+|_+$/g, "") || "module";

    const existingModules = await prisma.recordModule.findMany({
        where: {
            organizationId,
            OR: [{ key: baseKey }, { key: { startsWith: `${baseKey}_` } }],
        },
        select: { key: true },
    });
    const existingKeys = new Set(existingModules.map((module) => module.key));

    if (!existingKeys.has(baseKey) && !RESERVED_MODULE_KEYS.has(baseKey)) {
        return baseKey;
    }

    let suffix = 2;
    while (existingKeys.has(`${baseKey}_${suffix}`)) suffix += 1;
    return `${baseKey}_${suffix}`;
};

const validateRelationships = async (
    transaction: Prisma.TransactionClient,
    input: {
        organizationId: string;
        moduleId: string;
        relationships: RecordRelationshipInput[];
    },
) => {
    if (input.relationships.length === 0) return;

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
        select: { id: true, moduleId: true },
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
};

const RecordModuleService = {
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

    async getModuleBuilderData(
        moduleId: string,
        organizationId: string,
    ): Promise<RecordModuleBuilderData | null> {
        const recordModule = await prisma.recordModule.findFirst({
            where: { id: moduleId, organizationId, archivedAt: null },
            include: {
                fields: {
                    include: { relationshipDefinition: true },
                    orderBy: { position: "asc" },
                },
                views: { orderBy: { position: "asc" } },
            },
        });
        if (!recordModule) return null;

        return {
            moduleDetails: {
                name: recordModule.name,
                pluralName: recordModule.pluralName ?? "",
                icon: recordModule.icon as ModuleDetails["icon"],
                accentColor: recordModule.accentColor ?? "#5670ff",
            },
            dataFields: recordModule.fields.map((field) => ({
                key: field.key,
                label: field.label,
                type: field.type,
                required: field.required,
                unique: field.unique,
                defaultValue: field.defaultValue,
                isPrimary: field.isPrimary,
                position: field.position,
                config: field.config as RecordFieldDraft["config"],
                relationshipTargetModuleId:
                    field.relationshipDefinition?.targetModuleId ?? null,
            })),
            moduleViews: recordModule.views as unknown as ModuleViewDraft[],
            moduleFeatures: recordModule.features,
        };
    },

    async getRelationshipTargetModules(organizationId: string) {
        return prisma.recordModule.findMany({
            where: { organizationId, archivedAt: null },
            select: { id: true, key: true, name: true, pluralName: true },
            orderBy: { name: "asc" },
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
            },
        });
    },

    async createRecord(input: {
        organizationId: string;
        moduleId: string;
        createdById: string;
        displayName: string;
        values: RecordValueInput[];
        relationships?: RecordRelationshipInput[];
    }) {
        return prisma.$transaction(async (transaction) => {
            const relationships = input.relationships ?? [];
            await validateRelationships(transaction, { ...input, relationships });
            const record = await transaction.recordItem.create({
                data: {
                    organizationId: input.organizationId,
                    moduleId: input.moduleId,
                    createdById: input.createdById,
                    displayName: input.displayName,
                    values: { create: input.values },
                },
                include: { values: true },
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
    },

    async updateRecord(input: {
        organizationId: string;
        moduleId: string;
        recordId: string;
        displayName: string;
        values: RecordValueInput[];
        relationships?: RecordRelationshipInput[];
    }) {
        return prisma.$transaction(async (transaction) => {
            const record = await transaction.recordItem.findFirst({
                where: {
                    id: input.recordId,
                    moduleId: input.moduleId,
                    organizationId: input.organizationId,
                    archivedAt: null,
                },
                select: { id: true },
            });

            if (!record) return null;

            const relationships = input.relationships ?? [];
            await validateRelationships(transaction, { ...input, relationships });

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

            return transaction.recordItem.findUnique({
                where: { id: input.recordId },
                include: { values: true },
            });
        });
    },

    async updateListViewColumns(input: {
        organizationId: string;
        moduleId: string;
        viewId: string;
        columns: string[];
    }) {
        return prisma.$transaction(async (transaction) => {
            const view = await transaction.recordModuleView.findFirst({
                where: {
                    id: input.viewId,
                    moduleId: input.moduleId,
                    type: RecordViewType.LIST,
                    module: {
                        organizationId: input.organizationId,
                        archivedAt: null,
                    },
                },
                select: { id: true },
            });
            if (!view) return null;

            const fields = await transaction.recordField.findMany({
                where: { moduleId: input.moduleId, key: { in: input.columns } },
                select: { key: true },
            });
            if (fields.length !== new Set(input.columns).size) return null;

            return transaction.recordModuleView.update({
                where: { id: view.id },
                data: { config: { columns: input.columns } },
            });
        });
    },

    async createFieldInListView(input: {
        organizationId: string;
        moduleId: string;
        viewId: string;
        field: RecordFieldDraft;
    }) {
        return prisma.$transaction(async (transaction) => {
            const view = await transaction.recordModuleView.findFirst({
                where: {
                    id: input.viewId,
                    moduleId: input.moduleId,
                    type: RecordViewType.LIST,
                    module: {
                        organizationId: input.organizationId,
                        archivedAt: null,
                    },
                },
                select: { id: true, config: true },
            });
            if (!view) return null;

            if (input.field.relationshipTargetModuleId) {
                const targetModule = await transaction.recordModule.findFirst({
                    where: {
                        id: input.field.relationshipTargetModuleId,
                        organizationId: input.organizationId,
                        archivedAt: null,
                    },
                    select: { id: true },
                });
                if (!targetModule) return null;
            }

            const lastField = await transaction.recordField.findFirst({
                where: { moduleId: input.moduleId },
                orderBy: { position: "desc" },
                select: { position: true },
            });
            if (
                input.field.type === RecordFieldType.EMAIL &&
                input.field.config?.isPrimaryEmail
            ) {
                const emailFields = await transaction.recordField.findMany({
                    where: { moduleId: input.moduleId, type: RecordFieldType.EMAIL },
                    select: { id: true, config: true },
                });
                await Promise.all(
                    emailFields.map((emailField) => {
                        const config =
                            emailField.config &&
                            typeof emailField.config === "object" &&
                            !Array.isArray(emailField.config)
                                ? emailField.config
                                : {};
                        return transaction.recordField.update({
                            where: { id: emailField.id },
                            data: {
                                config: {
                                    ...config,
                                    isPrimaryEmail: false,
                                },
                            },
                        });
                    }),
                );
            }
            const field = await transaction.recordField.create({
                data: {
                    moduleId: input.moduleId,
                    key: input.field.key,
                    label: input.field.label,
                    type: input.field.type,
                    required: input.field.required,
                    unique: input.field.unique,
                    isPrimary: false,
                    position: (lastField?.position ?? 0) + 1,
                    ...(input.field.config !== null && {
                        config: input.field.config as Prisma.InputJsonValue,
                    }),
                    ...(input.field.defaultValue !== null && {
                        defaultValue: input.field.defaultValue as Prisma.InputJsonValue,
                    }),
                    ...(input.field.relationshipTargetModuleId && {
                        relationshipDefinition: {
                            create: {
                                targetModuleId: input.field.relationshipTargetModuleId,
                            },
                        },
                    }),
                },
            });
            const config =
                view.config && typeof view.config === "object" && !Array.isArray(view.config)
                    ? (view.config as { columns?: unknown })
                    : {};
            const columns = Array.isArray(config.columns)
                ? config.columns.filter((key): key is string => typeof key === "string")
                : [];
            const currentColumns =
                columns.length > 0
                    ? columns
                    : (
                          await transaction.recordField.findMany({
                              where: { moduleId: input.moduleId },
                              orderBy: { position: "asc" },
                              select: { key: true },
                          })
                      ).map((existingField) => existingField.key);
            const nextColumns = currentColumns.includes(field.key)
                ? currentColumns
                : [...currentColumns, field.key];

            await transaction.recordModuleView.update({
                where: { id: view.id },
                data: { config: { columns: nextColumns } },
            });

            return field;
        });
    },

    async createRecordModule(input: CreateRecordModuleInput) {
        const key = await createModuleKey(
            input.moduleDetails.name,
            input.organizationId,
        );

        const relationshipTargetIds = input.dataFields.flatMap((field) =>
            field.relationshipTargetModuleId
                ? [field.relationshipTargetModuleId]
                : [],
        );
        const relationshipTargets = await prisma.recordModule.count({
            where: {
                id: { in: relationshipTargetIds },
                organizationId: input.organizationId,
                archivedAt: null,
            },
        });
        if (relationshipTargets !== new Set(relationshipTargetIds).size) {
            throw new Error("Relationship target module not found.");
        }

        return prisma.recordModule.create({
            data: {
                organizationId: input.organizationId,
                key,
                name: input.moduleDetails.name,
                pluralName: input.moduleDetails.pluralName || null,
                icon: input.moduleDetails.icon,
                accentColor: input.moduleDetails.accentColor,
                features: input.moduleFeatures,
                fields: {
                    create: input.dataFields.map((field) => ({
                        key: field.key,
                        label: field.label,
                        type: field.type,
                        required: field.required,
                        unique: field.unique,
                        isPrimary: field.isPrimary,
                        position: field.position,
                        ...(field.config !== null && {
                            config: field.config as Prisma.InputJsonValue,
                        }),
                        ...(field.defaultValue !== null && {
                            defaultValue: field.defaultValue as Prisma.InputJsonValue,
                        }),
                        ...(field.relationshipTargetModuleId && {
                            relationshipDefinition: {
                                create: {
                                    targetModuleId: field.relationshipTargetModuleId,
                                },
                            },
                        }),
                    })),
                },
                views: {
                    create: input.moduleViews.map((view) => ({
                        name: view.name,
                        type: view.type,
                        position: view.position,
                        isDefault: view.isDefault,
                        config: view.config as Prisma.InputJsonValue,
                        createdById: input.createdById,
                    })),
                },
            },
            include: {
                fields: { orderBy: { position: "asc" } },
                views: { orderBy: { position: "asc" } },
            },
        });
    },

    async updateRecordModule(input: UpdateRecordModuleInput) {
        return prisma.$transaction(async (transaction) => {
            const existing = await transaction.recordModule.findFirst({
                where: {
                    id: input.moduleId,
                    organizationId: input.organizationId,
                    archivedAt: null,
                },
                include: {
                    fields: {
                        include: {
                            relationshipDefinition: true,
                            _count: { select: { values: true, relationships: true } },
                        },
                    },
                    views: true,
                },
            });
            if (!existing) throw new Error("Module not found.");

            const nextFieldKeys = new Set(input.dataFields.map((field) => field.key));
            const removedFields = existing.fields.filter(
                (field) => !nextFieldKeys.has(field.key),
            );
            if (
                removedFields.some(
                    (field) =>
                        field._count.values > 0 || field._count.relationships > 0,
                )
            ) {
                throw new Error("Fields with record data cannot be removed.");
            }

            const relationshipTargetIds = input.dataFields.flatMap((field) =>
                field.relationshipTargetModuleId
                    ? [field.relationshipTargetModuleId]
                    : [],
            );
            const relationshipTargets = await transaction.recordModule.count({
                where: {
                    id: { in: relationshipTargetIds },
                    organizationId: input.organizationId,
                    archivedAt: null,
                },
            });
            if (relationshipTargets !== new Set(relationshipTargetIds).size) {
                throw new Error("Relationship target module not found.");
            }

            await transaction.recordModule.update({
                where: { id: existing.id },
                data: {
                    name: input.moduleDetails.name,
                    pluralName: input.moduleDetails.pluralName || null,
                    icon: input.moduleDetails.icon,
                    accentColor: input.moduleDetails.accentColor,
                    features: input.moduleFeatures,
                },
            });

            if (removedFields.length > 0) {
                await transaction.recordField.deleteMany({
                    where: { id: { in: removedFields.map((field) => field.id) } },
                });
            }

            for (const field of input.dataFields) {
                const data = {
                    label: field.label,
                    type: field.type,
                    required: field.required,
                    unique: field.unique,
                    isPrimary: field.isPrimary,
                    position: field.position,
                    config: field.config === null
                        ? Prisma.DbNull
                        : field.config as Prisma.InputJsonValue,
                    defaultValue: field.defaultValue === null
                        ? Prisma.DbNull
                        : field.defaultValue as Prisma.InputJsonValue,
                };
                const currentField = existing.fields.find(
                    (existingField) => existingField.key === field.key,
                );
                if (currentField) {
                    const changesRelationshipKind =
                        currentField.type !== field.type &&
                        (currentField.type === RecordFieldType.RELATIONSHIP ||
                            field.type === RecordFieldType.RELATIONSHIP);
                    const changesRelationshipTarget =
                        currentField.relationshipDefinition?.targetModuleId !==
                        (field.relationshipTargetModuleId ?? undefined);
                    if (
                        (changesRelationshipKind || changesRelationshipTarget) &&
                        (currentField._count.values > 0 ||
                            currentField._count.relationships > 0)
                    ) {
                        throw new Error(
                            "Relationship fields with record data cannot change type or target module.",
                        );
                    }
                    await transaction.recordField.update({
                        where: { id: currentField.id },
                        data,
                    });
                    if (field.relationshipTargetModuleId) {
                        await transaction.recordRelationshipDefinition.upsert({
                            where: { fieldId: currentField.id },
                            create: {
                                fieldId: currentField.id,
                                targetModuleId: field.relationshipTargetModuleId,
                            },
                            update: {
                                targetModuleId: field.relationshipTargetModuleId,
                            },
                        });
                    } else if (currentField.relationshipDefinition) {
                        await transaction.recordRelationshipDefinition.delete({
                            where: { fieldId: currentField.id },
                        });
                    }
                } else {
                    await transaction.recordField.create({
                        data: {
                            ...data,
                            moduleId: existing.id,
                            key: field.key,
                            ...(field.relationshipTargetModuleId && {
                                relationshipDefinition: {
                                    create: {
                                        targetModuleId: field.relationshipTargetModuleId,
                                    },
                                },
                            }),
                        },
                    });
                }
            }

            const nextViewTypes = new Set(input.moduleViews.map((view) => view.type));
            await transaction.recordModuleView.deleteMany({
                where: {
                    moduleId: existing.id,
                    type: { notIn: [...nextViewTypes] },
                },
            });
            for (const view of input.moduleViews) {
                const data = {
                    name: view.name,
                    position: view.position,
                    isDefault: view.isDefault,
                    config: view.config as Prisma.InputJsonValue,
                };
                const currentView = existing.views.find(
                    (existingView) => existingView.type === view.type,
                );
                if (currentView) {
                    await transaction.recordModuleView.update({
                        where: { id: currentView.id },
                        data,
                    });
                } else {
                    await transaction.recordModuleView.create({
                        data: {
                            ...data,
                            moduleId: existing.id,
                            type: view.type,
                            createdById: input.createdById,
                        },
                    });
                }
            }

            return { id: existing.id };
        });
    },
};

export default RecordModuleService;