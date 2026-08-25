import { prisma } from "@/lib/db/client";
import { CatcherActionProps, CatcherRequest, CatcherResponse } from "../types";
import { CATCHER_FEATURE, statusForResponse, toJson } from "./helpers";
import { AiRunStatus } from "@/generated/prisma/enums";
import { catcherResponseSchema } from "../schemas";

export const RunServices = {
  async discardActiveThreads(organizationId: string, memberId: string) {
    await prisma.$transaction(async (transaction) => {
      const threadWhere = {
        organizationId,
        memberId,
        feature: CATCHER_FEATURE,
        status: "ACTIVE",
      } as const;

      await transaction.aiRunAction.updateMany({
        where: {
          status: "PROPOSED",
          run: {
            status: AiRunStatus.AWAITING_APPROVAL,
            thread: threadWhere,
          },
        },
        data: { status: "REJECTED" },
      });
      await transaction.aiRun.updateMany({
        where: {
          status: {
            in: [
              AiRunStatus.PENDING,
              AiRunStatus.RUNNING,
              AiRunStatus.AWAITING_INPUT,
              AiRunStatus.AWAITING_APPROVAL,
            ],
          },
          thread: threadWhere,
        },
        data: { status: AiRunStatus.CANCELLED, completedAt: new Date() },
      });
      await transaction.aiThread.updateMany({
        where: threadWhere,
        data: { status: "ARCHIVED" },
      });
    });
  },

  async startPersistedRun(data: {
    runId: string;
    threadId?: string;
    organizationId: string;
    memberId: string;
    request: CatcherActionProps;
  }) {
    return prisma.$transaction(async (transaction) => {
      let thread;
      if (data.threadId) {
        thread = await transaction.aiThread.findFirst({
            where: {
              id: data.threadId,
              organizationId: data.organizationId,
              memberId: data.memberId,
              feature: CATCHER_FEATURE,
              status: "ACTIVE",
            },
            select: { id: true },
          });
      } else {
        await transaction.aiThread.updateMany({
          where: {
            organizationId: data.organizationId,
            memberId: data.memberId,
            feature: CATCHER_FEATURE,
            status: "ACTIVE",
          },
          data: { status: "ARCHIVED" },
        });
        thread = await transaction.aiThread.create({
            data: {
              organizationId: data.organizationId,
              memberId: data.memberId,
              feature: CATCHER_FEATURE,
            },
            select: { id: true },
          });
          }

      if (!thread) throw new Error("AI thread was not found.");

      await transaction.aiRun.create({
        data: {
          id: data.runId,
          threadId: thread.id,
          status: AiRunStatus.RUNNING,
          input: toJson({ text: data.request.input }),
          context: toJson(data.request.context),
          startedAt: new Date(),
        },
      });

      return thread.id;
    });
  },

  async completePersistedRun(data: {
    runId: string;
    threadId: string;
    organizationId: string;
    memberId: string;
    response: CatcherResponse;
  }) {
    await prisma.$transaction(async (transaction) => {
      const updated = await transaction.aiRun.updateMany({
        where: {
          id: data.runId,
          threadId: data.threadId,
          thread: {
            organizationId: data.organizationId,
            memberId: data.memberId,
            feature: CATCHER_FEATURE,
          },
        },
        data: {
          status: statusForResponse(data.response),
          response: toJson(data.response),
          error: data.response.kind === "error" ? data.response.error : null,
          completedAt: new Date(),
        },
      });

      if (updated.count !== 1) throw new Error("AI run was not found.");

      if (data.response.kind === "proposal") {
        await transaction.aiRunAction.createMany({
          data: data.response.actions.map((action, ordinal) => ({
            runId: data.runId,
            actionKey: action.id,
            type: action.type,
            ordinal,
            payload: toJson(action),
            idempotencyKey: `${data.runId}:${action.id}`,
          })),
        });
      }

      await transaction.aiThread.update({
        where: { id: data.threadId },
        data: { updatedAt: new Date() },
      });
    });
  },

  async failPersistedRun(runId: string, error: string) {
    await prisma.aiRun.updateMany({
      where: {
        id: runId,
        status: { in: [AiRunStatus.PENDING, AiRunStatus.RUNNING] },
      },
      data: {
        status: AiRunStatus.FAILED,
        error,
        completedAt: new Date(),
      },
    });
  },

  async createRun(request: CatcherRequest): Promise<CatcherResponse> {
    const serviceUrl = process.env.AI_SERVICE_URL?.replace(/\/$/, "");
    if (!serviceUrl) {
      throw new Error("AI_SERVICE_URL is not configured.");
    }

    const response = await fetch(`${serviceUrl}/catcher/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(
        `AI catcher request failed with status ${response.status}.`,
      );
    }

    return catcherResponseSchema.parse(await response.json());
  },

  async completeExecution(runId: string, hasFailures: boolean) {
    await prisma.aiRun.update({
      where: { id: runId },
      data: {
        status: hasFailures ? AiRunStatus.FAILED : AiRunStatus.COMPLETED,
        completedAt: new Date(),
      },
    });
  },

  async failExecution(runId: string, error: string) {
    await prisma.$transaction([
      prisma.aiRun.updateMany({
        where: { id: runId, status: AiRunStatus.EXECUTING },
        data: {
          status: AiRunStatus.FAILED,
          error,
          completedAt: new Date(),
        },
      }),
      prisma.aiRunAction.updateMany({
        where: { runId, status: { in: ["APPROVED", "EXECUTING"] } },
        data: {
          status: "FAILED",
          error,
          completedAt: new Date(),
        },
      }),
    ]);
  },
};
