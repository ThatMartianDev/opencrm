import { AiRunStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db/client";
import { CATCHER_FEATURE } from "./helpers";
import { catcherResponseSchema } from "../schemas";

export const UserFeedbackServices = {
  async consumeClarificationSelection(data: {
    threadId: string;
    organizationId: string;
    memberId: string;
    recordId: string;
  }) {
    return prisma.$transaction(async (transaction) => {
      const run = await transaction.aiRun.findFirst({
        where: {
          threadId: data.threadId,
          status: AiRunStatus.AWAITING_INPUT,
          thread: {
            organizationId: data.organizationId,
            memberId: data.memberId,
            feature: CATCHER_FEATURE,
          },
        },
        orderBy: { createdAt: "desc" },
        select: { id: true, response: true },
      });
      const parsed = catcherResponseSchema.safeParse(run?.response);
      if (
        !run ||
        !parsed.success ||
        parsed.data.kind !== "clarification" ||
        !("choices" in parsed.data)
      ) {
        return null;
      }
      const choice = parsed.data.choices.find(
        (candidate) => candidate.recordId === data.recordId,
      );
      if (!choice) return null;

      const consumed = await transaction.aiRun.updateMany({
        where: { id: run.id, status: AiRunStatus.AWAITING_INPUT },
        data: { status: AiRunStatus.COMPLETED },
      });
      return consumed.count === 1 ? choice : null;
    });
  },

  async consumeClarificationAnswers(data: {
    threadId: string;
    organizationId: string;
    memberId: string;
    answers: Record<string, string>;
  }) {
    return prisma.$transaction(async (transaction) => {
      const run = await transaction.aiRun.findFirst({
        where: {
          threadId: data.threadId,
          status: AiRunStatus.AWAITING_INPUT,
          thread: {
            organizationId: data.organizationId,
            memberId: data.memberId,
            feature: CATCHER_FEATURE,
          },
        },
        orderBy: { createdAt: "desc" },
        select: { id: true, response: true },
      });
      const parsed = catcherResponseSchema.safeParse(run?.response);
      if (
        !run ||
        !parsed.success ||
        parsed.data.kind !== "clarification" ||
        !("fields" in parsed.data)
      ) {
        return null;
      }

      const normalized: Record<string, string> = {};
      for (const field of parsed.data.fields) {
        const answer = data.answers[field.id]?.trim();
        if (!answer) return null;
        if (
          field.type !== "text" &&
          !field.options.some((option) => option.value === answer)
        ) {
          return null;
        }
        normalized[field.id] = answer;
      }

      const consumed = await transaction.aiRun.updateMany({
        where: { id: run.id, status: AiRunStatus.AWAITING_INPUT },
        data: { status: AiRunStatus.COMPLETED },
      });
      return consumed.count === 1 ? normalized : null;
    });
  },
};
