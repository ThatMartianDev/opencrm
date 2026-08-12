import { ActivitySource, ActivityType } from "@/generated/prisma/enums";
import { RecordActivityService } from "@/modules/RecordModule/service/record-activity.service";
import { ActivityLogService } from "@/modules/activity-log/service";

jest.mock("@/modules/activity-log/service", () => ({
  ActivityLogService: { log: jest.fn() },
}));

const mockActivityLog = jest.mocked(ActivityLogService);
const input = {
  organizationId: "org_1",
  memberId: "member_1",
  recordId: "record_1",
};

describe("RecordActivityService", () => {
  beforeEach(() => jest.clearAllMocks());

  test.each([
    ["created", ActivityType.CREATION, "Record \"Apollo\" created"],
    ["archived", ActivityType.DELETION, "Record \"Apollo\" archived"],
  ] as const)("logs %s as a named system event", async (method, activityType, title) => {
    await RecordActivityService[method]({ ...input, recordName: "Apollo" });

    expect(mockActivityLog.log).toHaveBeenCalledWith({
      organizationId: "org_1",
      memberId: "member_1",
      entity: { entityType: "record", entityId: "record_1" },
      source: ActivitySource.SYSTEM,
      activityType,
      title,
    });
  });

  test("logs one meaningful event for every changed field", async () => {
    await RecordActivityService.fieldsUpdated({
      ...input,
      changes: [
        { fieldName: "Status", previousValue: "Open", nextValue: "Closed" },
        { fieldName: "Amount", previousValue: 10, nextValue: 25 },
      ],
    });

    expect(mockActivityLog.log).toHaveBeenNthCalledWith(1, expect.objectContaining({
      activityType: ActivityType.STATUS_CHANGE,
      title: "Record Status has been updated from \"Open\" to \"Closed\"",
    }));
    expect(mockActivityLog.log).toHaveBeenNthCalledWith(2, expect.objectContaining({
      title: "Record Amount has been updated from \"10\" to \"25\"",
    }));
  });

  test("records the new owner on ownership transfers", async () => {
    await RecordActivityService.ownershipTransferred({
      ...input,
      previousOwnerId: "member_1",
      previousOwnerName: "User One",
      nextOwnerId: "member_2",
      nextOwnerName: "User Two",
    });

    expect(mockActivityLog.log).toHaveBeenCalledWith(
      expect.objectContaining({
        activityType: ActivityType.ASSIGNMENT,
        title: "Record ownership transferred from User One to User Two",
        metadata: {
          previousOwnerId: "member_1",
          nextOwnerId: "member_2",
        },
        source: ActivitySource.SYSTEM,
      }),
    );
  });

  test.each([
    ["taskCreated", ActivityType.TASK, { taskName: "Send proposal" }, "Task added: \"Send proposal\""],
    ["noteCreated", ActivityType.NOTE, { noteTitle: "Project context" }, "Note added: \"Project context\""],
    ["fileAdded", ActivityType.FILE, { fileName: "proposal.pdf" }, "File added: \"proposal.pdf\""],
  ] as const)("formats %s events", async (method, activityType, details, title) => {
    await RecordActivityService[method]({ ...input, ...details } as never);

    expect(mockActivityLog.log).toHaveBeenCalledWith(expect.objectContaining({
      activityType,
      title,
      source: ActivitySource.SYSTEM,
    }));
  });
});