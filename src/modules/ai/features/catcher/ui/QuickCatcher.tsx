"use client";

import { useEffect, useState, useTransition } from "react";

import {
  ApproveCatcher,
  DiscardCatcher,
  GetActiveCatcher,
  InitiateCatcher,
} from "../actions";
import type {
  CatcherClarificationField,
  CatcherChoice,
  CatcherExecutionResult,
  CatcherInputType,
  CatcherResponse,
} from "../types";
import Styles from "./QuickCatcher.module.css";
import QuickCatcherComposer from "./components/Composer/Composer";
import Panel, { getPanelViewState } from "./components/Panel/Panel";

export default function QuickCatcher({ onClose }: { onClose: () => void }) {
  const [threadId, setThreadId] = useState<string>();
  const [input, setInput] = useState("");
  const [inputType, setInputType] = useState<CatcherInputType>("command");
  const [response, setResponse] = useState<CatcherResponse | null>(null);
  const [selectedActions, setSelectedActions] = useState<Set<string>>(
    new Set(),
  );
  const [executionResults, setExecutionResults] = useState<
    CatcherExecutionResult[]
  >([]);
  const [clarificationAnswers, setClarificationAnswers] = useState<
    Record<string, string>
  >({});
  const [isRestoring, setIsRestoring] = useState(true);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    GetActiveCatcher()
      .then((result) => {
        if (cancelled || !result.success) return;
        setThreadId(result.threadId ?? undefined);
        setInputType(result.inputType);
        setResponse(result.response);
        setExecutionResults(result.executionResults);
        if (result.response?.kind === "proposal") {
          setSelectedActions(
            new Set(result.response.actions.map((action) => action.id)),
          );
        }
      })
      .finally(() => {
        if (!cancelled) setIsRestoring(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function submit(choice?: CatcherChoice) {
    const prompt = choice?.label ?? input.trim();
    if (!prompt || isPending || isRestoring) return;

    if (!choice && response?.kind === "clarification" && response.fields) {
      const textFields = response.fields.filter(
        (field) => field.type === "text",
      );
      const textField = textFields[0];
      if (
        textFields.length === 1 &&
        response.fields.length === 1 &&
        textField
      ) {
        const answers = {
          ...clarificationAnswers,
          [textField.id]: prompt,
        };
        submitClarification(response.fields, answers);
        return;
      }
    }

    setResponse(null);
    setExecutionResults([]);
    startTransition(async () => {
      const now = new Date();
      const result = await InitiateCatcher({
        threadId,
        selection: choice ? { recordId: choice.recordId } : undefined,
        input: prompt,
        context: {
          inputType,
          current_page: window.location.pathname,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          localDatetime: now.toISOString(),
        },
      });

      if (!result.success) {
        setResponse({ kind: "error", error: result.error });
        return;
      }

      setThreadId(result.threadId);
      setInput("");
      setResponse(result.response);
      if (result.response.kind === "proposal") {
        setSelectedActions(
          new Set(result.response.actions.map((action) => action.id)),
        );
      }
    });
  }

  function submitClarification(
    fields: CatcherClarificationField[],
    answers = clarificationAnswers,
  ) {
    if (
      isPending ||
      isRestoring ||
      fields.some((field) => !answers[field.id]?.trim())
    )
      return;

    setResponse(null);
    setExecutionResults([]);
    startTransition(async () => {
      const now = new Date();
      const result = await InitiateCatcher({
        threadId,
        clarification: { answers },
        input: "Clarification answers",
        context: {
          inputType,
          current_page: window.location.pathname,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          localDatetime: now.toISOString(),
        },
      });
      if (!result.success) {
        setResponse({ kind: "error", error: result.error });
        return;
      }
      setThreadId(result.threadId);
      setInput("");
      setClarificationAnswers({});
      setResponse(result.response);
      if (result.response.kind === "proposal") {
        setSelectedActions(
          new Set(result.response.actions.map((action) => action.id)),
        );
      }
    });
  }

  function toggleAction(actionId: string) {
    setSelectedActions((current) => {
      const next = new Set(current);
      const actions = response?.kind === "proposal" ? response.actions : [];
      const action = actions.find((candidate) => candidate.id === actionId);
      if (next.has(actionId)) {
        next.delete(actionId);
        for (const candidate of actions) {
          if (
            (candidate.type === "task.create" ||
              candidate.type === "note.create") &&
            candidate.recordActionId === actionId
          )
            next.delete(candidate.id);
        }
      } else {
        next.add(actionId);
        if (
          action &&
          (action.type === "task.create" || action.type === "note.create") &&
          action.recordActionId
        )
          next.add(action.recordActionId);
      }
      return next;
    });
  }

  function approve() {
    if (
      response?.kind !== "proposal" ||
      selectedActions.size === 0 ||
      isPending
    )
      return;
    setExecutionResults([]);
    startTransition(async () => {
      const result = await ApproveCatcher({
        runId: response.runId,
        actionIds: Array.from(selectedActions),
      });
      if (!result.success) {
        setResponse({
          kind: "error",
          runId: response.runId,
          error: result.error,
        });
        return;
      }
      setExecutionResults(result.results);
    });
  }

  function discard() {
    if (isPending) return;
    startTransition(async () => {
      const result = await DiscardCatcher();
      if (!result.success) {
        setResponse({ kind: "error", error: result.error });
        return;
      }
      setThreadId(undefined);
      setInput("");
      setInputType("command");
      setResponse(null);
      setSelectedActions(new Set());
      setExecutionResults([]);
      setClarificationAnswers({});
    });
  }

  const panelViewState = getPanelViewState(response, isPending, executionResults);
  const { composerPrompt, panelClarification, focusComposer } = panelViewState;

  return (
    <div className={Styles.quickCatcher} onClick={onClose}>
      <div className={Styles.rim} aria-hidden="true">
        <span className={Styles.rimTop} />
        <span className={Styles.rimLeft} />
        <span className={Styles.rimRight} />
        <span className={Styles.rimBottom} />
      </div>
      <section className={Styles.content} aria-label="Quick Catcher">
        <Panel
          response={response}
          viewState={panelViewState}
          isPending={isPending}
          selectedActions={selectedActions}
          executionResults={executionResults}
          clarificationAnswers={clarificationAnswers}
          onClarificationAnswerChange={(fieldId, value) =>
            setClarificationAnswers((current) => ({
              ...current,
              [fieldId]: value,
            }))
          }
          onSubmitChoice={submit}
          onContinue={submitClarification}
          onToggleAction={toggleAction}
          onApprove={approve}
          onDiscard={discard}
        />

        <QuickCatcherComposer
          input={input}
          inputType={inputType}
          prompt={composerPrompt}
          focused={focusComposer}
          disabled={isPending || isRestoring || panelClarification}
          inputTypeDisabled={
            isPending || isRestoring || response?.kind === "clarification"
          }
          onInputChange={setInput}
          onInputTypeChange={setInputType}
          onSubmit={() => submit()}
        />
      </section>
    </div>
  );
}
