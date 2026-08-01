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

const RecordModuleService = {
    async getModuleBuilderData(
        moduleId: string,
        organizationId: string,
    ): Promise<RecordModuleBuilderData | null> {
        const recordModule = await prisma.recordModule.findFirst({
            where: { id: moduleId, organizationId, archivedAt: null },
            include: {
                fields: { orderBy: { position: "asc" } },
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
            })),
            moduleViews: recordModule.views as unknown as ModuleViewDraft[],
            moduleFeatures: recordModule.features,
        };
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
                fields: { orderBy: { position: "asc" } },
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
                      include: { values: true },
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
                module: {
                    include: {
                        fields: { orderBy: { position: "asc" } },
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
    }) {
        return prisma.recordItem.create({
            data: {
                organizationId: input.organizationId,
                moduleId: input.moduleId,
                createdById: input.createdById,
                displayName: input.displayName,
                values: { create: input.values },
            },
            include: { values: true },
        });
    },

    async updateRecord(input: {
        organizationId: string;
        moduleId: string;
        recordId: string;
        displayName: string;
        values: RecordValueInput[];
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

            await transaction.recordFieldValue.deleteMany({
                where: { recordId: input.recordId },
            });

            await transaction.recordItem.update({
                where: { id: input.recordId },
                data: {
                    displayName: input.displayName,
                    values: { create: input.values },
                },
            });

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
                    fields: { include: { _count: { select: { values: true } } } },
                    views: true,
                },
            });
            if (!existing) throw new Error("Module not found.");

            const nextFieldKeys = new Set(input.dataFields.map((field) => field.key));
            const removedFields = existing.fields.filter(
                (field) => !nextFieldKeys.has(field.key),
            );
            if (removedFields.some((field) => field._count.values > 0)) {
                throw new Error("Fields with record values cannot be removed.");
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
                    await transaction.recordField.update({
                        where: { id: currentField.id },
                        data,
                    });
                } else {
                    await transaction.recordField.create({
                        data: { ...data, moduleId: existing.id, key: field.key },
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