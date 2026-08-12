import { Prisma } from "@/generated/prisma/client";
import {
    RecordFieldType,
    RecordViewType,
} from "@/generated/prisma/enums";
import { prisma } from "@/lib/db/client";
import type { RecordFieldDraft } from "../ui/RecordModuleBuilder/types";

const ViewsService = {
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
};

export default ViewsService;