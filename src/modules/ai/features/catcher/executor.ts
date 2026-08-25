import "server-only";

import { prisma } from "@/lib/db/client";
import { createNote } from "@/modules/notes/actions";
import { createTask } from "@/modules/tasks/actions";
import {
  createModuleRecord,
  patchModuleRecordFields,
} from "@/modules/RecordModule/actions/records.actions";
import type { CatcherAction, CatcherExecutionResult } from "./types";

async function getRecordActionTarget(
  organizationId: string,
  moduleId: string,
) {
  return prisma.recordModule.findFirst({
    where: { id: moduleId, organizationId, archivedAt: null },
    select: {
      key: true,
      fields: { select: { id: true, key: true } },
    },
  });
}

export async function executeCatcherAction(
  action: CatcherAction,
  organizationId: string,
  actionRecordIds: ReadonlyMap<string, string> = new Map(),
): Promise<CatcherExecutionResult> {
  try {
    const dependentRecordId = (
      action.type === "task.create" || action.type === "note.create"
    ) && action.recordActionId
      ? actionRecordIds.get(action.recordActionId)
      : undefined;
    if (
      (action.type === "task.create" || action.type === "note.create")
      && action.recordActionId
      && !dependentRecordId
    ) {
      throw new Error("The action that creates this record must complete first.");
    }

    if (action.type === "note.create") {
      const note = await createNote({
        title: action.title,
        content: action.content,
        recordId: dependentRecordId ?? action.recordId ?? undefined,
      });
      return {
        actionId: action.id,
        type: action.type,
        status: "completed",
        result: { entityId: note.id },
      };
    }

    if (action.type === "task.create") {
      const task = await createTask({
        name: action.name,
        description: action.description ?? undefined,
        dueDate: action.dueDate ?? undefined,
        recordId: dependentRecordId ?? action.recordId ?? undefined,
      });
      return {
        actionId: action.id,
        type: action.type,
        status: "completed",
        result: { entityId: task.id },
      };
    }

    const target = await getRecordActionTarget(organizationId, action.moduleId);
    if (!target) throw new Error("The record module is no longer available.");
    const fieldKeys = new Map(target.fields.map((field) => [field.id, field.key]));
    const entries = action.type === "record.create" ? action.values : action.changes;
    const rawValues: Record<string, unknown> = {};
    for (const entry of entries) {
      const fieldKey = fieldKeys.get(entry.fieldId);
      if (!fieldKey) throw new Error("A proposed record field is no longer available.");
      rawValues[fieldKey] = entry.value;
    }

    const result = action.type === "record.create"
      ? await createModuleRecord(target.key, rawValues)
      : await patchModuleRecordFields(target.key, action.recordId, rawValues);
    if (!result.success) throw new Error(result.error);

    return {
      actionId: action.id,
      type: action.type,
      status: "completed",
      result: { entityId: result.recordId },
    };
  } catch (error) {
    return {
      actionId: action.id,
      type: action.type,
      status: "failed",
      error: error instanceof Error ? error.message : "Action execution failed.",
    };
  }
}