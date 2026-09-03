import { prisma } from "@/lib/db/client";
import type { CatcherActionValue, CatcherResponse } from "../types";

function invalidProposalResponse(
    runId: string,
    error = "I couldn't prepare a valid change for that record. Please select the record again or rephrase your request.",
): CatcherResponse {
    return {
        kind: "error",
        runId,
        error,
    };
}

function displayValue(value: CatcherActionValue): string {
    if (value === null) return "Empty";
    if (Array.isArray(value)) return value.join(", ");
    if (typeof value === "boolean") return value ? "Yes" : "No";
    return String(value);
}


export default async function prepareUserFacingResponse(
    organizationId: string,
    response: CatcherResponse,
): Promise<CatcherResponse> {
    if (response.kind === "clarification") {
        const modules = await prisma.recordModule.findMany({
            where: {
                id: { in: response.candidates.map((candidate) => candidate.moduleId) },
                organizationId,
                archivedAt: null,
            },
            select: { id: true, icon: true, accentColor: true },
        });
        const modulesById = new Map(modules.map((module) => [module.id, module]));
        return {
            ...response,
            candidates: response.candidates.map((candidate) => {
                const recordModule = modulesById.get(candidate.moduleId);
                return {
                    ...candidate,
                    ...(recordModule ? {
                        moduleIcon: recordModule.icon,
                        moduleAccentColor: recordModule.accentColor,
                    } : {}),
                };
            }),
        };
    }
    if (response.kind !== "proposal") return response;

    const moduleIds = response.actions.flatMap((action) =>
        action.type === "record.create" || action.type === "record.patch_fields"
            ? [action.moduleId]
            : [],
    );
    const recordIds = response.actions.flatMap((action) => {
        if (action.type === "record.patch_fields") return [action.recordId];
        if ((action.type === "task.create" || action.type === "note.create") && action.recordId) {
            return [action.recordId];
        }
        return [];
    });
    const potentialRelationshipRecordIds = response.actions.flatMap((action) => {
        if (action.type !== "record.create" && action.type !== "record.patch_fields") return [];
        const entries = action.type === "record.create" ? action.values : action.changes;
        return entries.flatMap((entry) =>
            typeof entry.value === "string" ? [entry.value] : [],
        );
    });
    const [modules, records] = await Promise.all([
        prisma.recordModule.findMany({
            where: {
                id: { in: moduleIds },
                organizationId,
                archivedAt: null,
            },
            select: {
                id: true,
                name: true,
                icon: true,
                accentColor: true,
                features: true,
                fields: {
                    select: {
                        id: true,
                        label: true,
                        type: true,
                        isPrimary: true,
                        relationshipDefinition: {
                            select: { targetModuleId: true },
                        },
                    },
                },
            },
        }),
        prisma.recordItem.findMany({
            where: {
                id: { in: [...recordIds, ...potentialRelationshipRecordIds] },
                organizationId,
                archivedAt: null,
                module: { archivedAt: null },
            },
            select: {
                id: true,
                moduleId: true,
                displayName: true,
                module: {
                    select: {
                        name: true,
                        icon: true,
                        accentColor: true,
                        features: true,
                    },
                },
            },
        }),
    ]);
    const modulesById = new Map(modules.map((module) => [module.id, module]));
    const recordsById = new Map(records.map((record) => [record.id, record]));
    const actionsById = new Map(response.actions.map((action, index) => [
        action.id,
        { action, index },
    ]));
    const descriptions: string[] = [];

    for (const [actionIndex, action] of response.actions.entries()) {
        if (action.type === "record.create") {
            const recordModule = modulesById.get(action.moduleId);
            const fieldIds = new Set(recordModule?.fields.map((field) => field.id));
            if (!recordModule || action.values.some((value) => !fieldIds.has(value.fieldId))) {
                return invalidProposalResponse(response.runId);
            }
            const hasInvalidRelationship = action.values.some((entry) => {
                const field = recordModule.fields.find((candidate) => candidate.id === entry.fieldId);
                if (field?.type !== "RELATIONSHIP") return false;
                if (typeof entry.value !== "string") return true;
                const target = recordsById.get(entry.value);
                return !target || target.moduleId !== field.relationshipDefinition?.targetModuleId;
            });
            if (hasInvalidRelationship) {
                return invalidProposalResponse(
                    response.runId,
                    "The selected related record does not match this field. Please choose a record from the requested module.",
                );
            }
            descriptions.push(`Create a new ${recordModule.name}`);
            const primaryFieldId = recordModule.fields.find((field) => field.isPrimary)?.id;
            const primaryValue = action.values.find((item) => item.fieldId === primaryFieldId)?.value;
            action.presentation = {
                title: primaryValue !== undefined && primaryValue !== null
                    ? displayValue(primaryValue)
                    : `New ${recordModule.name}`,
                details: action.values
                    .filter((item) => item.fieldId !== primaryFieldId)
                    .slice(0, 4)
                    .map((item) => ({
                    label: recordModule.fields.find((field) => field.id === item.fieldId)?.label ?? "Field",
                    value: typeof item.value === "string" && recordsById.has(item.value)
                        ? recordsById.get(item.value)?.displayName ?? displayValue(item.value)
                        : displayValue(item.value),
                    })),
                module: {
                    name: recordModule.name,
                    icon: recordModule.icon,
                    accentColor: recordModule.accentColor,
                },
            };
            continue;
        }
        if (action.type === "record.patch_fields") {
            const recordModule = modulesById.get(action.moduleId);
            const record = recordsById.get(action.recordId);
            const fieldIds = new Set(recordModule?.fields.map((field) => field.id));
            if (
                !recordModule
                || !record
                || record.moduleId !== action.moduleId
                || action.changes.some((change) => !fieldIds.has(change.fieldId))
            ) {
                return invalidProposalResponse(response.runId);
            }
            const hasInvalidRelationship = action.changes.some((entry) => {
                const field = recordModule.fields.find((candidate) => candidate.id === entry.fieldId);
                if (field?.type !== "RELATIONSHIP") return false;
                if (typeof entry.value !== "string") return true;
                const target = recordsById.get(entry.value);
                return !target || target.moduleId !== field.relationshipDefinition?.targetModuleId;
            });
            if (hasInvalidRelationship) {
                return invalidProposalResponse(
                    response.runId,
                    "The selected related record does not match this field. Please choose a record from the requested module.",
                );
            }
            descriptions.push(`Update ${record.displayName}`);
            action.presentation = {
                title: record.displayName,
                details: action.changes.slice(0, 4).map((item) => ({
                    label: recordModule.fields.find((field) => field.id === item.fieldId)?.label ?? "Field",
                    value: typeof item.value === "string" && recordsById.has(item.value)
                        ? recordsById.get(item.value)?.displayName ?? displayValue(item.value)
                        : displayValue(item.value),
                })),
                module: {
                    name: recordModule.name,
                    icon: recordModule.icon,
                    accentColor: recordModule.accentColor,
                },
            };
            continue;
        }
        if (action.type === "task.create") {
            const dependency = action.recordActionId
                ? actionsById.get(action.recordActionId)
                : null;
            if (
                action.recordId && action.recordActionId
                || action.recordActionId && (
                    !dependency
                    || dependency.index >= actionIndex
                    || dependency.action.type !== "record.create"
                )
            ) {
                return invalidProposalResponse(response.runId);
            }
            if (
                dependency?.action.type === "record.create"
                && !modulesById.get(dependency.action.moduleId)?.features.includes("TASKS")
            ) {
                return invalidProposalResponse(response.runId);
            }
            let record = action.recordId ? recordsById.get(action.recordId) : null;
            if (action.recordId && !record) {
                return invalidProposalResponse(response.runId);
            }
            if (record && !record.module.features.includes("TASKS")) {
                action.recordId = null;
                record = null;
            }
            descriptions.push(
                `Create task "${action.name}"${record ? ` for ${record.displayName}` : ""}`,
            );
            const linkedRecord = record?.displayName ?? dependency?.action.presentation?.title;
            action.presentation = {
                title: action.name,
                description: action.description,
                details: [
                    ...(action.dueDate ? [{ label: "Due", value: action.dueDate }] : []),
                    ...(linkedRecord ? [{ label: "Record", value: linkedRecord }] : []),
                ],
                module: record ? {
                    name: record.module.name,
                    icon: record.module.icon,
                    accentColor: record.module.accentColor,
                } : dependency?.action.presentation?.module,
            };
            continue;
        }

        const dependency = action.recordActionId
            ? actionsById.get(action.recordActionId)
            : null;
        if (
            action.recordId && action.recordActionId
            || action.recordActionId && (
                !dependency
                || dependency.index >= actionIndex
                || dependency.action.type !== "record.create"
            )
        ) {
            return invalidProposalResponse(response.runId);
        }
        if (
            dependency?.action.type === "record.create"
            && !modulesById.get(dependency.action.moduleId)?.features.includes("NOTES")
        ) {
            return invalidProposalResponse(response.runId);
        }
        let record = action.recordId ? recordsById.get(action.recordId) : null;
        if (action.recordId && !record) {
            return invalidProposalResponse(response.runId);
        }
        if (record && !record.module.features.includes("NOTES")) {
            action.recordId = null;
            record = null;
        }
        descriptions.push(
            `Add note "${action.title}"${record ? ` to ${record.displayName}` : ""}`,
        );
        const linkedRecord = record?.displayName ?? dependency?.action.presentation?.title;
        action.presentation = {
            title: action.title,
            description: action.content,
            details: linkedRecord ? [{ label: "Record", value: linkedRecord }] : [],
            module: record ? {
                name: record.module.name,
                icon: record.module.icon,
                accentColor: record.module.accentColor,
            } : dependency?.action.presentation?.module,
        };
    }

    return {
        ...response,
        summary: descriptions.length === 1
            ? `${descriptions[0]}.`
            : `Review ${descriptions.length} proposed changes: ${descriptions.join("; ")}.`,
    };
}