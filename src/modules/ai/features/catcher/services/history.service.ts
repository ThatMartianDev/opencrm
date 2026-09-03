import { prisma } from "@/lib/db/client";
import { ACTION_TYPES, CATCHER_FEATURE } from "./helpers";
import { catcherInputTypeSchema, catcherResponseSchema } from "../schemas";
import { AiRunStatus } from "@/generated/prisma/enums";
import prepareUserFacingResponse from "./uihandler.service";
import { CatcherExecutionResult, CatcherHistoryTurn } from "../types";
import { Prisma } from "@/generated/prisma/client";

export const HistoryServices = {
  async getActiveThread(organizationId: string, memberId: string) {
    const thread = await prisma.aiThread.findFirst({
      where: {
        organizationId,
        memberId,
        feature: CATCHER_FEATURE,
        status: "ACTIVE",
      },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        runs: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            id: true,
            status: true,
            context: true,
            response: true,
            error: true,
            actions: {
              where: { status: { in: ["COMPLETED", "FAILED"] } },
              orderBy: { ordinal: "asc" },
              select: {
                actionKey: true,
                type: true,
                status: true,
                result: true,
                error: true,
              },
            },
          },
        },
      },
    });

    if (!thread) return null;
    const latestRun = thread.runs[0];
    const storedContext = latestRun?.context as
      | { inputType?: unknown }
      | undefined;
    const parsedInputType = catcherInputTypeSchema.safeParse(
      storedContext?.inputType,
    );
    const parsed = catcherResponseSchema.safeParse(latestRun?.response);
    const isAwaitingUser =
      latestRun?.status === AiRunStatus.AWAITING_INPUT ||
      latestRun?.status === AiRunStatus.AWAITING_APPROVAL;
    if (!isAwaitingUser) return null;

    const preparedResponse =
      parsed.success
        ? await prepareUserFacingResponse(organizationId, parsed.data)
        : null;
    const restoredResponse =
      parsed.success &&
      parsed.data.kind === "proposal" &&
      preparedResponse?.kind !== "proposal"
        ? null
        : preparedResponse;
    if (!restoredResponse) return null;

    return {
      threadId: thread.id,
      inputType: parsedInputType.success ? parsedInputType.data : "command",
      response: restoredResponse,
      executionResults: (latestRun?.actions ?? []).flatMap((action) => {
            const type = action.type as CatcherExecutionResult["type"];
            if (!(type in ACTION_TYPES)) return [];
            const storedResult = action.result as { entityId?: unknown } | null;
            return [
              {
                actionId: action.actionKey,
                type,
                status:
                  action.status === "COMPLETED"
                    ? ("completed" as const)
                    : ("failed" as const),
                ...(typeof storedResult?.entityId === "string"
                  ? { result: { entityId: storedResult.entityId } }
                  : {}),
                ...(action.error ? { error: action.error } : {}),
              },
            ];
          }),
    };
  },

  async getThreadHistory(data: {
    threadId: string;
    organizationId: string;
    memberId: string;
  }): Promise<CatcherHistoryTurn[]> {
    const runs = await prisma.aiRun.findMany({
      where: {
        threadId: data.threadId,
        response: { not: Prisma.DbNull },
        thread: {
          organizationId: data.organizationId,
          memberId: data.memberId,
          feature: CATCHER_FEATURE,
        },
      },
      orderBy: { createdAt: "desc" },
      take: 12,
      select: { input: true, response: true },
    });

    const history: CatcherHistoryTurn[] = [];
    for (const run of runs.reverse()) {
      const input = run.input as { text?: unknown };
      const response = catcherResponseSchema.safeParse(run.response);
      if (typeof input.text !== "string" || !response.success) continue;

      const preparedResponse = await prepareUserFacingResponse(
        data.organizationId,
        response.data,
      );
      if (
        response.data.kind === "proposal" &&
        preparedResponse.kind !== "proposal"
      ) {
        continue;
      }
      history.push({ input: input.text, response: preparedResponse });
    }
    return history;
  },
};
