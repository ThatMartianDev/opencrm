import { prisma } from "@/lib/db/client";
import { AiRunStatus } from "@/generated/prisma/enums";
import { CATCHER_FEATURE, toJson } from "./helpers";
import { catcherResponseSchema } from "../schemas";

import prepareUserFacingResponse from "./uihandler.service";
import { HistoryServices } from "./history.service";
import { RunServices } from "./run.service";
import { UserFeedbackServices } from "./userfeedback.service";

export const QuickCatcherService = {
  prepareUserFacingResponse,
  ...HistoryServices,
  ...RunServices,
  ...UserFeedbackServices,

  async prepareApproval(data: {
    runId: string;
    actionIds: string[];
    organizationId: string;
    memberId: string;
  }) {
    const pendingRun = await prisma.aiRun.findFirst({
      where: {
        id: data.runId,
        status: AiRunStatus.AWAITING_APPROVAL,
        thread: {
          organizationId: data.organizationId,
          memberId: data.memberId,
          feature: CATCHER_FEATURE,
        },
      },
      select: { response: true },
    });
    const parsedResponse = catcherResponseSchema.safeParse(
      pendingRun?.response,
    );
    const validatedResponse = parsedResponse.success
      ? await prepareUserFacingResponse(
          data.organizationId,
          parsedResponse.data,
        )
      : null;
    if (!validatedResponse || validatedResponse.kind !== "proposal") {
      await prisma.aiRun.updateMany({
        where: { id: data.runId, status: AiRunStatus.AWAITING_APPROVAL },
        data: {
          status: AiRunStatus.FAILED,
          error: "The proposal referenced CRM data that is no longer valid.",
          completedAt: new Date(),
        },
      });
      throw new Error(
        "This proposal is no longer valid. Please submit the request again.",
      );
    }

    return prisma.$transaction(async (transaction) => {
      const claimed = await transaction.aiRun.updateMany({
        where: {
          id: data.runId,
          status: AiRunStatus.AWAITING_APPROVAL,
          thread: {
            organizationId: data.organizationId,
            memberId: data.memberId,
            feature: CATCHER_FEATURE,
          },
        },
        data: { status: AiRunStatus.EXECUTING },
      });
      if (claimed.count !== 1) {
        throw new Error("This proposal is no longer available for approval.");
      }

      const actions = await transaction.aiRunAction.findMany({
        where: { runId: data.runId, status: "PROPOSED" },
        orderBy: { ordinal: "asc" },
        select: { id: true, actionKey: true, type: true, payload: true },
      });
      const validatedActions = new Map(
        validatedResponse.actions.map((action) => [action.id, action]),
      );
      if (actions.some((action) => !validatedActions.has(action.actionKey))) {
        throw new Error("The proposal actions no longer match the validated response.");
      }
      const preparedActions = actions.map((action) => ({
        ...action,
        payload: toJson(validatedActions.get(action.actionKey)!),
      }));
      const selected = new Set(data.actionIds);
      if (
        preparedActions.filter((action) => selected.has(action.actionKey)).length !==
        selected.size
      ) {
        throw new Error(
          "One or more selected actions are not part of this proposal.",
        );
      }

      const approvedAt = new Date();
      await Promise.all(
        preparedActions.map((action) =>
          transaction.aiRunAction.update({
            where: { id: action.id },
            data: { payload: action.payload },
          }),
        ),
      );
      await transaction.aiRunAction.updateMany({
        where: { runId: data.runId, actionKey: { in: data.actionIds } },
        data: { status: "APPROVED", approvedAt },
      });
      await transaction.aiRunAction.updateMany({
        where: { runId: data.runId, actionKey: { notIn: data.actionIds } },
        data: { status: "REJECTED" },
      });

      return preparedActions.filter((action) => selected.has(action.actionKey));
    });
  },

  async claimAction(actionId: string) {
    const claimed = await prisma.aiRunAction.updateMany({
      where: { id: actionId, status: "APPROVED" },
      data: { status: "EXECUTING", startedAt: new Date() },
    });
    return claimed.count === 1;
  },

  async completeAction(
    actionId: string,
    result: {
      status: "completed" | "failed";
      result?: unknown;
      error?: string;
    },
  ) {
    await prisma.aiRunAction.update({
      where: { id: actionId },
      data: {
        status: result.status === "completed" ? "COMPLETED" : "FAILED",
        result: result.result === undefined ? undefined : toJson(result.result),
        error: result.error ?? null,
        completedAt: new Date(),
      },
    });
  },

  async getAvailableModules(organizationId: string) {
    const modules = await prisma.recordModule.findMany({
      where: {
        organizationId,
        archivedAt: null,
      },
      select: {
        id: true,
        key: true,
        name: true,
        pluralName: true,
        features: true,
        fields: {
          select: {
            id: true,
            key: true,
            label: true,
            type: true,
            required: true,
            isPrimary: true,
            config: true,
            defaultValue: true,
            relationshipDefinition: {
              select: {
                targetModule: {
                  select: {
                    id: true,
                    key: true,
                    name: true,
                  },
                },
              },
            },
          },
          orderBy: { position: "asc" },
        },
      },
      orderBy: [{ name: "asc" }, { id: "asc" }],
    });

    return modules.map((module) => ({
      ...module,
      fields: module.fields.map(({ relationshipDefinition, ...field }) => ({
        ...field,
        relationshipTarget: relationshipDefinition?.targetModule ?? null,
      })),
    }));
  },
};
