import type {
    ModuleFeature,
    RecordFieldType,
} from "@/generated/prisma/enums";

export type CatcherModule = {
  id: string;
  key: string;
  name: string;
  pluralName: string | null;
  features: ModuleFeature[];
  fields: {
    id: string;
    key: string;
    label: string;
    type: RecordFieldType;
    required: boolean;
        isPrimary: boolean;
    config: unknown;
        defaultValue: unknown;
        relationshipTarget: {
            id: string;
            key: string;
            name: string;
        } | null;
  }[];
};

export type CatcherInputType = "command" | "transcript" | "email" | "chat";

export type CatcherActionProps = {
    threadId?: string;
    selection?: {
        recordId: string;
    };
    clarification?: {
        answers: Record<string, string>;
    };
    input: string;
    context: {
        inputType?: CatcherInputType;
        current_page: string;
        timezone: string;
        localDatetime: string;
    };
}

export type CatcherActionResult =
    | {
          success: true;
          threadId: string;
          response: CatcherResponse;
      }
    | {
          success: false;
          error: string;
      };

export type CatcherExecutionResult = {
    actionId: string;
    type: CatcherAction["type"];
    status: "completed" | "failed";
    result?: {
        entityId: string;
    };
    error?: string;
};

export type ApproveCatcherResult =
    | {
          success: true;
          results: CatcherExecutionResult[];
      }
    | {
          success: false;
          error: string;
      };

export type DiscardCatcherResult =
    | { success: true }
    | { success: false; error: string };

export interface CatcherRequest extends CatcherActionProps {
    runId?: string;
    history: CatcherHistoryTurn[];
    available_modules: CatcherModule[];
    tool_access: {
        token: string;
    };
    user: {
        organizationId: string;
        memberId: string;
    }
}

export type CatcherHistoryTurn = {
    input: string;
    response: CatcherResponse;
};

export type CatcherThreadStateResult =
    | {
          success: true;
          threadId: string | null;
          inputType: CatcherInputType;
          response: CatcherResponse | null;
          executionResults: CatcherExecutionResult[];
      }
    | {
          success: false;
          error: string;
      };

export type CatcherAIResponseTypes = "clarification" | "proposal" | "error" | "info" | "unknown";

export type CatcherCandidate = {
    id: string;
    moduleId: string;
    moduleKey: string;
    moduleName: string;
    moduleIcon?: string;
    moduleAccentColor?: string | null;
    displayName: string;
    summary: {
        label: string;
        value: string;
    }[];
}

export type CatcherChoice = {
    recordId: string;
    label: string;
}

export type CatcherClarificationField = {
    id: string;
    label: string;
    type: "text" | "single_choice" | "record_choice";
    options: {
        value: string;
        label: string;
    }[];
}

export type CatcherActionPresentation = {
    title: string;
    description?: string | null;
    details: {
        label: string;
        value: string;
    }[];
    module?: {
        name: string;
        icon: string;
        accentColor: string | null;
    };
};

export type CatcherAction =
    | {
          id: string;
          type: "record.create";
          moduleId: string;
          values: {
              fieldId: string;
              value: CatcherActionValue;
          }[];
          presentation?: CatcherActionPresentation;
      }
    | {
          id: string;
          type: "record.patch_fields";
          moduleId: string;
          recordId: string;
          changes: {
              fieldId: string;
              value: CatcherActionValue;
          }[];
          presentation?: CatcherActionPresentation;
      }
    | {
          id: string;
          type: "task.create";
          name: string;
          description: string | null;
          dueDate: string | null;
          recordId: string | null;
          recordActionId?: string | null;
          presentation?: CatcherActionPresentation;
      }
    | {
          id: string;
          type: "note.create";
          title: string;
          content: string;
          recordId: string | null;
          recordActionId?: string | null;
          presentation?: CatcherActionPresentation;
      };

export type CatcherResponse =
    | {
          kind: "clarification";
          runId: string;
          question: string;
            fields?: CatcherClarificationField[];
            choices?: CatcherChoice[];
          candidates: CatcherCandidate[];
              pendingRecord?: {
                  moduleId: string;
                  values: {
                      fieldId: string;
                      value: CatcherActionValue;
                  }[];
              } | null;
      }
    | {
          kind: "proposal";
          runId: string;
          summary: string;
          actions: CatcherAction[];
      }
    | {
          kind: "info";
          runId: string;
          message: string;
      }
    | {
          kind: "error";
          runId?: string;
          error: string;
      };

export type CatcherActionValue =
        | string
        | number
        | boolean
        | null
        | string[];