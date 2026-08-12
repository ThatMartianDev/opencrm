import { Prisma } from "@/generated/prisma/client";
import { RecordFieldType } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db/client";
import type {
    ModuleDetails,
    ModuleViewDraft,
    RecordModuleBuilderData,
    RecordFieldDraft,
} from "../ui/RecordModuleBuilder/types";
import type {
    CreateRecordModuleInput,
    UpdateRecordModuleInput,
} from "./types";

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

const ModuleService = {
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

export default ModuleService;