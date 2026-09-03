import { AiRunStatus, Prisma } from "@/generated/prisma/client";
import { CatcherExecutionResult, CatcherResponse } from "../types";

export const CATCHER_FEATURE = "quick_catcher";

export const ACTION_TYPES: Record<CatcherExecutionResult["type"], true> = {
  "record.create": true,
  "record.patch_fields": true,
  "task.create": true,
  "note.create": true,
};

export function toJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export function statusForResponse(response: CatcherResponse): AiRunStatus {
  if (response.kind === "proposal") return AiRunStatus.AWAITING_APPROVAL;
  if (response.kind === "clarification") return AiRunStatus.AWAITING_INPUT;
  if (response.kind === "error") return AiRunStatus.FAILED;
  return AiRunStatus.COMPLETED;
}
