/** @jest-environment node */

import { createTask } from "@/modules/tasks/actions";
import { executeCatcherAction } from "@/modules/ai/features/catcher/executor";

jest.mock("@/lib/db/client", () => ({ prisma: {} }));
jest.mock("@/modules/notes/actions", () => ({ createNote: jest.fn() }));
jest.mock("@/modules/tasks/actions", () => ({ createTask: jest.fn() }));
jest.mock("@/modules/RecordModule/actions/records.actions", () => ({
  createModuleRecord: jest.fn(),
  patchModuleRecordFields: jest.fn(),
}));

const mockCreateTask = jest.mocked(createTask);

describe("catcher action dependencies", () => {
  test("links a task to the record produced by an earlier action", async () => {
    mockCreateTask.mockResolvedValue({ id: "task_1" } as never);

    const result = await executeCatcherAction(
      {
        id: "action_task",
        type: "task.create",
        name: "Follow up",
        description: null,
        dueDate: "2026-08-17",
        recordId: null,
        recordActionId: "action_record",
      },
      "org_1",
      new Map([["action_record", "record_1"]]),
    );

    expect(result.status).toBe("completed");
    expect(mockCreateTask).toHaveBeenCalledWith(expect.objectContaining({
      recordId: "record_1",
    }));
  });
});