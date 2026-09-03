"use server";

import { randomUUID } from "crypto";
import { getSessionClaims } from "@/lib/auth/session";
import { QuickCatcherService } from "./services";
import type {
  CatcherActionProps,
  CatcherActionResult,
  ApproveCatcherResult,
  CatcherThreadStateResult,
  DiscardCatcherResult,
} from "./types";
import { createQueryContext } from "@/lib/dal/scoped-query";
import {
  approveCatcherSchema,
  catcherActionPropsSchema,
  catcherActionSchema,
} from "./schemas";
import { createCatcherToolGrant } from "@/modules/ai/tool-grant";
import { executeCatcherAction } from "./executor";

export const InitiateCatcher = async (
  request: CatcherActionProps,
): Promise<CatcherActionResult> => {
  let persistedRunId: string | null = null;
  try {
    const parsed = catcherActionPropsSchema.safeParse(request);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Invalid catcher request.",
      };
    }

    const session = await getSessionClaims();
    const context = createQueryContext(session);
    context.assertCan("ai.catcher.run");
    context.assertCan("records.read");

    const availableModules = await QuickCatcherService.getAvailableModules(
      session.organizationId,
    );

    if (availableModules.length === 0) {
      return {
        success: false,
        error: "No available modules found for the user.",
      };
    }

    const runId = `catch_${randomUUID().replaceAll("-", "")}`;
    persistedRunId = runId;
    let effectiveInput = parsed.data.input;
    if (parsed.data.clarification) {
      if (!parsed.data.threadId) {
        return { success: false, error: "A thread is required to continue." };
      }
      const answers = await QuickCatcherService.consumeClarificationAnswers({
        threadId: parsed.data.threadId,
        organizationId: session.organizationId,
        memberId: session.memberId,
        answers: parsed.data.clarification.answers,
      });
      if (!answers) {
        return {
          success: false,
          error: "Those clarification answers are no longer valid.",
        };
      }
      effectiveInput = `Clarification answers: ${JSON.stringify(answers)}.`;
    }
    if (parsed.data.selection) {
      if (!parsed.data.threadId) {
        return { success: false, error: "A thread is required to continue." };
      }
      const choice = await QuickCatcherService.consumeClarificationSelection({
        threadId: parsed.data.threadId,
        organizationId: session.organizationId,
        memberId: session.memberId,
        recordId: parsed.data.selection.recordId,
      });
      if (!choice) {
        return {
          success: false,
          error: "That clarification choice is no longer available.",
        };
      }
      effectiveInput = `Selected ${choice.label} with record ID ${choice.recordId}.`;
    }

    const threadId = await QuickCatcherService.startPersistedRun({
      runId,
      threadId: parsed.data.threadId,
      organizationId: session.organizationId,
      memberId: session.memberId,
      request: { ...parsed.data, input: effectiveInput },
    });
    const history = await QuickCatcherService.getThreadHistory({
      threadId,
      organizationId: session.organizationId,
      memberId: session.memberId,
    });

    const toolToken = await createCatcherToolGrant({
      runId,
      userId: session.userId,
      memberId: session.memberId,
      organizationId: session.organizationId,
      tools: ["search_records", "get_linked_records"],
    });

    const modelResponse = await QuickCatcherService.createRun({
      runId,
      input: effectiveInput,
      history,
      user: {
        organizationId: session.organizationId,
        memberId: session.memberId,
      },
      available_modules: availableModules,
      tool_access: {
        token: toolToken,
      },
      context: parsed.data.context,
    });
    const response = await QuickCatcherService.prepareUserFacingResponse(
      session.organizationId,
      modelResponse,
    );

    await QuickCatcherService.completePersistedRun({
      runId,
      threadId,
      organizationId: session.organizationId,
      memberId: session.memberId,
      response,
    });

    return {
      success: true,
      threadId,
      response,
    };
  } catch (error) {
    if (persistedRunId) {
      await QuickCatcherService.failPersistedRun(
        persistedRunId,
        error instanceof Error
          ? error.message
          : "An unexpected error occurred.",
      ).catch((persistenceError) => {
        console.error(
          "Failed to mark AI catcher run as failed",
          persistenceError,
        );
      });
    }
    if (error instanceof Error && error.message.startsWith("Forbidden:")) {
      return {
        success: false,
        error: "You do not have permission to run the AI catcher.",
      };
    }
    console.error("Failed to initiate AI catcher", error);
    return {
      success: false,
      error: "An unexpected error occurred.",
    };
  }
};

export const GetActiveCatcher = async (): Promise<CatcherThreadStateResult> => {
  try {
    const session = await getSessionClaims();
    const context = createQueryContext(session);
    context.assertCan("ai.catcher.run");

    const state = await QuickCatcherService.getActiveThread(
      session.organizationId,
      session.memberId,
    );
    return {
      success: true,
      threadId: state?.threadId ?? null,
      inputType: state?.inputType ?? "command",
      response: state?.response ?? null,
      executionResults: state?.executionResults ?? [],
    };
  } catch (error) {
    console.error("Failed to restore AI catcher", error);
    return { success: false, error: "Unable to restore Quick Catcher." };
  }
};

export const DiscardCatcher = async (): Promise<DiscardCatcherResult> => {
  try {
    const session = await getSessionClaims();
    createQueryContext(session).assertCan("ai.catcher.run");
    await QuickCatcherService.discardActiveThreads(
      session.organizationId,
      session.memberId,
    );
    return { success: true };
  } catch (error) {
    console.error("Failed to discard AI catcher", error);
    return { success: false, error: "Unable to discard Quick Catcher." };
  }
};

export const ApproveCatcher = async (request: {
  runId: string;
  actionIds: string[];
}): Promise<ApproveCatcherResult> => {
  let claimedRunId: string | null = null;
  try {
    const parsed = approveCatcherSchema.safeParse(request);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Invalid approval request.",
      };
    }

    const session = await getSessionClaims();
    createQueryContext(session).assertCan("ai.catcher.run");
    const persistedActions = await QuickCatcherService.prepareApproval({
      ...parsed.data,
      organizationId: session.organizationId,
      memberId: session.memberId,
    });
    claimedRunId = parsed.data.runId;

    const results = [];
    const actionRecordIds = new Map<string, string>();
    const selectedActionIds = new Set(
      persistedActions.map(
        (action) => catcherActionSchema.parse(action.payload).id,
      ),
    );
    for (const persistedAction of persistedActions) {
      const action = catcherActionSchema.parse(persistedAction.payload);
      if (
        (action.type === "task.create" || action.type === "note.create") &&
        action.recordActionId &&
        !selectedActionIds.has(action.recordActionId)
      ) {
        throw new Error(
          "Select the record creation action required by this action.",
        );
      }
      const claimed = await QuickCatcherService.claimAction(persistedAction.id);
      if (!claimed) throw new Error("A selected action could not be claimed.");
      const result = await executeCatcherAction(
        action,
        session.organizationId,
        actionRecordIds,
      );
      await QuickCatcherService.completeAction(persistedAction.id, result);
      results.push(result);
      if (result.status === "completed" && result.result?.entityId) {
        actionRecordIds.set(action.id, result.result.entityId);
      }
    }
    await QuickCatcherService.completeExecution(
      parsed.data.runId,
      results.some((result) => result.status === "failed"),
    );
    return { success: true, results };
  } catch (error) {
    if (claimedRunId) {
      await QuickCatcherService.failExecution(
        claimedRunId,
        error instanceof Error ? error.message : "Action execution failed.",
      ).catch((persistenceError) => {
        console.error(
          "Failed to mark AI catcher execution as failed",
          persistenceError,
        );
      });
    }
    console.error("Failed to approve AI catcher actions", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to execute the proposal.",
    };
  }
};
