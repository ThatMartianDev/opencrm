import { act, render, screen } from "@testing-library/react";

import Panel, { getPanelViewState } from "@/modules/ai/features/catcher/ui/components/Panel/Panel";
import Composer from "@/modules/ai/features/catcher/ui/components/Composer/Composer";
import type { CatcherExecutionResult, CatcherResponse } from "@/modules/ai/features/catcher/types";

const proposal: CatcherResponse = {
  kind: "proposal",
  runId: "run_1",
  summary: "Create two tasks",
  actions: ["Meeting with Ahmed", "Send quote"].map((name, index) => ({
    id: `action_${index}`,
    type: "task.create" as const,
    name,
    description: null,
    dueDate: null,
    recordId: null,
  })),
};

function renderPanel(results: CatcherExecutionResult[], response = proposal) {
  return render(
    <Panel
      response={response}
      viewState={getPanelViewState(response, false, results)}
      isPending={false}
      selectedActions={new Set(["action_0"])}
      executionResults={results}
      clarificationAnswers={{}}
      onClarificationAnswerChange={jest.fn()}
      onSubmitChoice={jest.fn()}
      onContinue={jest.fn()}
      onToggleAction={jest.fn()}
      onApprove={jest.fn()}
      onDiscard={jest.fn()}
    />,
  );
}

describe("Quick Catcher execution feedback", () => {
  test("replaces a successful selected subset with a compact receipt", () => {
    const results: CatcherExecutionResult[] = [{ actionId: "action_0", type: "task.create", status: "completed" }];
    renderPanel(results);
    expect(screen.getByRole("status")).toHaveTextContent("Task created");
    expect(screen.getByText("Meeting with Ahmed")).toBeInTheDocument();
    expect(screen.queryByText("Send quote")).not.toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Create|Discard/ })).not.toBeInTheDocument();
    expect(getPanelViewState(proposal, false, results).focusComposer).toBe(true);
  });

  test("summarizes multiple successful actions", () => {
    renderPanel([
      { actionId: "action_0", type: "task.create", status: "completed" },
      { actionId: "action_1", type: "task.create", status: "completed" },
    ]);
    expect(screen.getByRole("status")).toHaveTextContent("2 actions completed");
  });

  test("keeps failures visible and collapses successful details", () => {
    renderPanel([
      { actionId: "action_0", type: "task.create", status: "completed" },
      { actionId: "action_1", type: "task.create", status: "failed", error: "Permission denied" },
    ]);
    expect(screen.getByRole("status")).toHaveTextContent("1 of 2 actions completed");
    expect(screen.getByText("Send quote")).toBeVisible();
    expect(screen.getByText("Permission denied")).toBeVisible();
    expect(screen.getByText("Meeting with Ahmed").closest("details")).not.toHaveAttribute("open");
    expect(screen.queryByRole("button", { name: /Create/ })).not.toBeInTheDocument();
  });

  test("does not report success when every action fails", () => {
    renderPanel([{ actionId: "action_0", type: "task.create", status: "failed" }]);
    expect(screen.getByRole("status")).toHaveTextContent("No actions completed");
    expect(screen.getByText("This action could not be completed.")).toBeVisible();
  });

  test("keeps unexecuted proposals awaiting approval", () => {
    renderPanel([]);
    expect(screen.getByRole("button", { name: "Create 1 action" })).toBeEnabled();
    expect(getPanelViewState(proposal, false).focusComposer).toBe(false);
    expect(getPanelViewState(proposal, true, [{ actionId: "action_0", type: "task.create", status: "completed" }]).focusComposer).toBe(false);
  });

  test("announces request errors", () => {
    renderPanel([], { kind: "error", error: "Unable to connect" });
    expect(screen.getByRole("alert")).toHaveTextContent("Unable to connect");
  });

  test("focuses the expanded composer when execution finishes", () => {
    jest.useFakeTimers();
    const props = {
      input: "",
      inputType: "command" as const,
      prompt: "What would you like to capture?",
      focused: false,
      disabled: true,
      inputTypeDisabled: false,
      onInputChange: jest.fn(),
      onInputTypeChange: jest.fn(),
      onSubmit: jest.fn(),
    };
    const { rerender } = render(<Composer {...props} />);
    act(() => jest.advanceTimersByTime(900));
    rerender(<Composer {...props} focused disabled={false} />);
    expect(screen.getByRole("textbox")).toHaveFocus();
    jest.useRealTimers();
  });
});