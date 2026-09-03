"use client";

import {
  BotSparkleRegular,
  NoteRegular,
  TaskListSquareLtrRegular,
} from "@fluentui/react-icons";

import ModuleIcon from "@/modules/RecordModule/ui/components/ModuleIcon";
import type {
  CatcherAction,
  CatcherChoice,
  CatcherClarificationField,
  CatcherExecutionResult,
  CatcherResponse,
} from "../../../types";
import Styles from "./Panel.module.css";

const ACTION_LABELS: Record<CatcherAction["type"], string> = {
  "record.create": "Create record",
  "record.patch_fields": "Update record",
  "task.create": "Create task",
  "note.create": "Create note",
};

function describeAction(action: CatcherAction) {
  if (action.type === "task.create") return action.name;
  if (action.type === "note.create") {
    return (
      action.title ||
      `${action.content.slice(0, 60)}${action.content.length > 60 ? "..." : ""}`
    );
  }
  if (action.type === "record.create") {
    return `${action.values.length} field${action.values.length === 1 ? "" : "s"}`;
  }
  return `${action.changes.length} field${action.changes.length === 1 ? "" : "s"}`;
}

function actionTitle(action: CatcherAction) {
  return action.presentation?.title ?? describeAction(action);
}

function formatDetailValue(label: string, value: string) {
  if (label !== "Due") return value;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year:
      date.getFullYear() === new Date().getFullYear() ? undefined : "numeric",
  });
}

export function getPanelViewState(
  response: CatcherResponse | null,
  isPending: boolean,
) {
  const clarificationFields =
    response?.kind === "clarification" ? (response.fields ?? []) : [];
  const textClarifications = clarificationFields.filter(
    (field) => field.type === "text",
  );
  const useComposerForClarification =
    textClarifications.length === 1 && clarificationFields.length === 1;
  const textClarification = useComposerForClarification
    ? textClarifications[0]
    : undefined;
  const panelTextClarifications = useComposerForClarification
    ? []
    : textClarifications;
  const recordClarifications = clarificationFields.filter(
    (field) => field.type === "record_choice",
  );
  const recordChoiceGroups =
    response?.kind === "clarification"
      ? recordClarifications.map((field) => ({
          field,
          candidates: response.candidates.filter((candidate) =>
            field.options.some(
              (option) => option.value === candidate.id,
            ),
          ),
        }))
      : [];
  const singleChoiceClarifications = clarificationFields.filter(
    (field) => field.type === "single_choice",
  );
  const legacyChoices =
    response?.kind === "clarification" && response.candidates.length === 0
      ? (response.choices ?? [])
      : [];
  const legacyRecordCandidates =
    response?.kind === "clarification" && recordClarifications.length === 0
      ? response.candidates
      : [];
  const hasBodyClarificationControls =
    recordChoiceGroups.some((group) => group.candidates.length > 0) ||
    legacyRecordCandidates.length > 0 ||
    singleChoiceClarifications.some((field) => field.options.length > 0) ||
    panelTextClarifications.length > 0 ||
    legacyChoices.length > 0;
  const composerPrompt =
    textClarification?.label ??
    (response?.kind === "clarification"
      ? "Complete the clarification above"
      : "What would you like to capture?");
  const panelClarification =
    response?.kind === "clarification" && hasBodyClarificationControls;
  const focusComposer =
    !isPending &&
    (!response ||
      response.kind === "error" ||
      useComposerForClarification ||
      (response.kind === "clarification" &&
        !hasBodyClarificationControls));

  return {
    clarificationFields,
    useComposerForClarification,
    textClarification,
    panelTextClarifications,
    recordChoiceGroups,
    legacyRecordCandidates,
    singleChoiceClarifications,
    legacyChoices,
    composerPrompt,
    panelClarification,
    focusComposer,
    focusPanel: isPending || Boolean(response && !focusComposer),
  };
}

type PanelViewState = ReturnType<typeof getPanelViewState>;

type PanelProps = {
  response: CatcherResponse | null;
  viewState: PanelViewState;
  isPending: boolean;
  selectedActions: ReadonlySet<string>;
  executionResults: CatcherExecutionResult[];
  clarificationAnswers: Record<string, string>;
  onClarificationAnswerChange: (fieldId: string, value: string) => void;
  onSubmitChoice: (choice: CatcherChoice) => void;
  onContinue: (fields: CatcherClarificationField[]) => void;
  onToggleAction: (actionId: string) => void;
  onApprove: () => void;
  onDiscard: () => void;
};

export default function Panel({
  response,
  viewState,
  isPending,
  selectedActions,
  executionResults,
  clarificationAnswers,
  onClarificationAnswerChange,
  onSubmitChoice,
  onContinue,
  onToggleAction,
  onApprove,
  onDiscard,
}: PanelProps) {
  const {
    clarificationFields,
    useComposerForClarification,
    textClarification,
    panelTextClarifications,
    recordChoiceGroups,
    legacyRecordCandidates,
    singleChoiceClarifications,
    legacyChoices,
    panelClarification,
    focusPanel,
  } = viewState;

  return (
    <div
      className={`${Styles.body} ${focusPanel ? Styles.focusGradient : ""}`}
      onClick={(event) => event.stopPropagation()}
    >
      {(isPending || response) && (
        <div className={Styles.result} aria-live="polite">
          <header className={Styles.resultHeader}>
            <span className={Styles.resultSparkle} aria-hidden="true">
              <BotSparkleRegular fontSize={16} />
            </span>
            <span>
              {isPending
                ? "Working through your CRM"
                : response?.kind === "proposal"
                  ? "Here's what I found"
                  : response?.kind === "clarification"
                    ? "Just one more thing"
                    : response?.kind === "error"
                      ? "Something needs attention"
                      : "Quick Catcher"}
            </span>
            {isPending && <span className={Styles.processingDots} />}
          </header>

          {response?.kind === "clarification" && (
            <div className={Styles.responseBlock}>
              <p className={Styles.responseMessage}>{response.question}</p>

              {recordChoiceGroups.map(({ field, candidates }) => (
                <fieldset className={Styles.recordChoices} key={field.id}>
                  <legend>{field.label}</legend>
                  {candidates.map((candidate) => (
                    <label
                      className={`${Styles.recordChoice} ${clarificationAnswers[field.id] === candidate.id ? Styles.selectedChoice : ""}`}
                      key={candidate.id}
                    >
                      <input
                        type="radio"
                        name={field.id}
                        checked={
                          clarificationAnswers[field.id] === candidate.id
                        }
                        onChange={() =>
                          onClarificationAnswerChange(field.id, candidate.id)
                        }
                        disabled={isPending}
                      />
                      <span
                        className={Styles.moduleIcon}
                        style={{
                          backgroundColor:
                            candidate.moduleAccentColor || "#5670ff",
                        }}
                      >
                        <ModuleIcon
                          name={candidate.moduleIcon ?? "TargetFilled"}
                          size={14}
                        />
                      </span>
                      <span className={Styles.recordIdentity}>
                        <strong>{candidate.displayName}</strong>
                        <small>{candidate.moduleName}</small>
                      </span>
                      {candidate.summary.length > 0 && (
                        <span className={Styles.recordSummary}>
                          {candidate.summary.slice(0, 2).map((item) => (
                            <small key={`${item.label}:${item.value}`}>
                              <b>{item.label}</b> {item.value}
                            </small>
                          ))}
                        </span>
                      )}
                      <span className={Styles.radioMark} aria-hidden="true" />
                    </label>
                  ))}
                </fieldset>
              ))}

              {legacyRecordCandidates.length > 0 && (
                <div className={Styles.recordChoices}>
                  {legacyRecordCandidates.map((candidate) => (
                    <label className={Styles.recordChoice} key={candidate.id}>
                      <input
                        type="radio"
                        name="legacy-record-choice"
                        onChange={() => {
                          const choice = response.choices?.find(
                            (item) => item.recordId === candidate.id,
                          );
                          onSubmitChoice(
                            choice ?? {
                              recordId: candidate.id,
                              label: candidate.displayName,
                            },
                          );
                        }}
                        disabled={isPending}
                      />
                      <span className={Styles.recordIdentity}>
                        <strong>{candidate.displayName}</strong>
                        <small>{candidate.moduleName}</small>
                      </span>
                      <span className={Styles.radioMark} aria-hidden="true" />
                    </label>
                  ))}
                </div>
              )}

              {singleChoiceClarifications.map((field) => (
                <fieldset className={Styles.optionChoices} key={field.id}>
                  <legend>{field.label}</legend>
                  {field.options.map((option) => (
                    <label
                      className={`${Styles.optionChoice} ${clarificationAnswers[field.id] === option.value ? Styles.selectedChoice : ""}`}
                      key={option.value}
                    >
                      <input
                        type="radio"
                        name={field.id}
                        checked={
                          clarificationAnswers[field.id] === option.value
                        }
                        onChange={() =>
                          onClarificationAnswerChange(field.id, option.value)
                        }
                      />
                      <span>{option.label}</span>
                      <span className={Styles.radioMark} aria-hidden="true" />
                    </label>
                  ))}
                </fieldset>
              ))}

              {panelTextClarifications.length > 0 && (
                <div className={Styles.clarificationTextFields}>
                  {panelTextClarifications.map((field) => (
                    <label
                      className={Styles.clarificationTextField}
                      key={field.id}
                    >
                      <span>{field.label}</span>
                      <input
                        type="text"
                        value={clarificationAnswers[field.id] ?? ""}
                        onChange={(event) =>
                          onClarificationAnswerChange(
                            field.id,
                            event.target.value,
                          )
                        }
                        disabled={isPending}
                      />
                    </label>
                  ))}
                </div>
              )}

              {legacyChoices.length > 0 && (
                <div className={Styles.choices}>
                  {legacyChoices.map((choice) => (
                    <label className={Styles.choice} key={choice.recordId}>
                      <input
                        type="radio"
                        name="legacy-record-choice"
                        onChange={() => onSubmitChoice(choice)}
                        disabled={isPending}
                      />
                      <span>{choice.label}</span>
                      <span className={Styles.radioMark} aria-hidden="true" />
                    </label>
                  ))}
                </div>
              )}

              {useComposerForClarification && textClarification && (
                <p className={Styles.composerHint}>
                  Reply in the composer below.
                </p>
              )}

              {panelClarification && clarificationFields.length > 0 && (
                <button
                  className={Styles.approveButton}
                  type="button"
                  onClick={() => onContinue(clarificationFields)}
                  disabled={
                    isPending ||
                    clarificationFields.some(
                      (field) => !clarificationAnswers[field.id]?.trim(),
                    )
                  }
                >
                  Continue
                </button>
              )}
            </div>
          )}

          {response?.kind === "proposal" && (
            <div className={Styles.responseBlock}>
              <p className={Styles.responseMessage}>{response.summary}</p>
              <div className={Styles.actions}>
                {response.actions.map((action) => {
                  const presentation = action.presentation;
                  return (
                    <label
                      key={action.id}
                      className={`${Styles.action} ${selectedActions.has(action.id) ? Styles.selectedAction : ""}`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedActions.has(action.id)}
                        onChange={() => onToggleAction(action.id)}
                        disabled={isPending || executionResults.length > 0}
                      />
                      <span
                        className={`${Styles.actionIcon} ${presentation?.module ? Styles.moduleActionIcon : ""}`}
                        style={
                          presentation?.module
                            ? {
                                backgroundColor:
                                  presentation.module.accentColor || "#5670ff",
                              }
                            : undefined
                        }
                      >
                        {presentation?.module ? (
                          <ModuleIcon
                            name={presentation.module.icon}
                            size={14}
                          />
                        ) : action.type === "task.create" ? (
                          <TaskListSquareLtrRegular fontSize={16} />
                        ) : (
                          <NoteRegular fontSize={16} />
                        )}
                      </span>
                      <span className={Styles.actionContent}>
                        <small className={Styles.actionType}>
                          {ACTION_LABELS[action.type]}
                        </small>
                        <strong>{actionTitle(action)}</strong>
                        {presentation?.description && (
                          <span className={Styles.actionDescription}>
                            {presentation.description}
                          </span>
                        )}
                        {presentation && presentation.details.length > 0 && (
                          <span className={Styles.actionDetails}>
                            {presentation.details.map((detail) => (
                              <small key={`${detail.label}:${detail.value}`}>
                                <b>{detail.label}</b>
                                {formatDetailValue(
                                  detail.label,
                                  detail.value,
                                )}
                              </small>
                            ))}
                          </span>
                        )}
                      </span>
                      <span className={Styles.checkMark} aria-hidden="true" />
                    </label>
                  );
                })}
              </div>
              <div className={Styles.proposalButtons}>
                <button
                  className={Styles.approveButton}
                  type="button"
                  onClick={onApprove}
                  disabled={
                    selectedActions.size === 0 ||
                    isPending ||
                    executionResults.length > 0
                  }
                >
                  Create {selectedActions.size}{" "}
                  {selectedActions.size === 1 ? "action" : "actions"}
                </button>
                <button
                  className={Styles.discardButton}
                  type="button"
                  onClick={onDiscard}
                  disabled={isPending}
                >
                  Discard
                </button>
              </div>
              {executionResults.length > 0 && (
                <div className={Styles.executionResults}>
                  {executionResults.map((result) => (
                    <span key={result.actionId} data-status={result.status}>
                      {result.status === "completed"
                        ? `${ACTION_LABELS[result.type]} completed`
                        : `${ACTION_LABELS[result.type]} failed: ${result.error}`}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {response?.kind === "info" && (
            <p className={Styles.responseMessage}>{response.message}</p>
          )}
          {response?.kind === "error" && (
            <p className={`${Styles.responseMessage} ${Styles.error}`}>
              {response.error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}