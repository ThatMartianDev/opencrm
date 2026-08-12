import { prisma } from "@/lib/db/client";
import { TasksService } from "@/modules/tasks/service";
import { RecordActivityService } from "@/modules/RecordModule/service/record-activity.service";

jest.mock("@/modules/RecordModule/service/record-activity.service", () => ({
  RecordActivityService: {
    taskCreated: jest.fn(),
    taskUpdated: jest.fn(),
    taskStatusChanged: jest.fn(),
    taskDeleted: jest.fn(),
  },
}));

jest.mock("@/lib/db/client", () => ({
  prisma: {
    task: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    recordItem: { findFirst: jest.fn() },
  },
}));

jest.mock("@/modules/notifications/service", () => ({
  NotificationsService: {
    notifyTaskAssignment: jest.fn(),
    cancelPendingTaskNotifications: jest.fn(),
  },
}));

jest.mock("@/modules/activity-log/service", () => ({
  ActivityLogService: {},
}));

const mockTask = jest.mocked(prisma.task);
const mockRecord = jest.mocked(prisma.recordItem);
const mockRecordActivity = jest.mocked(RecordActivityService);

describe("TasksService authorization", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTask.findMany.mockResolvedValue([]);
  });

  test("limits the sidebar list to created or assigned tasks", async () => {
    await TasksService.getTasksForMember("org_1", "member_1", {
      page: 1,
      pageSize: 20,
    });

    expect(mockTask.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          organizationId: "org_1",
          deletedAt: null,
          OR: [
            { createdById: "member_1" },
            { assignedToId: "member_1" },
          ],
        },
      }),
    );
  });

  test("allows direct reads for participants or linked tasks", async () => {
    mockTask.findFirst.mockResolvedValue(null);

    await TasksService.getTaskById("task_1", "org_1", "member_1");

    expect(mockTask.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: "task_1",
          organizationId: "org_1",
          deletedAt: null,
          OR: [
            { createdById: "member_1" },
            { assignedToId: "member_1" },
            {
              OR: [
                { recordId: { not: null } },
                { dealId: { not: null } },
                { contactId: { not: null } },
                { companyId: { not: null } },
              ],
            },
          ],
        },
      }),
    );
  });

  test("limits full updates to the creator when update-any is absent", async () => {
    mockTask.findFirst.mockResolvedValue(null);

    await expect(
      TasksService.updateTask(
        "task_1",
        { name: "Renamed" },
        "org_1",
        "member_1",
        false,
      ),
    ).rejects.toThrow("Task not found or you do not own it");

    expect(mockTask.findFirst).toHaveBeenCalledWith({
      where: {
        id: "task_1",
        organizationId: "org_1",
        deletedAt: null,
        createdById: "member_1",
      },
    });
  });

  test("allows assignees to update task status", async () => {
    mockTask.findFirst.mockResolvedValue(null);

    await expect(
      TasksService.updateTaskStatus(
        "task_1",
        "COMPLETED",
        "org_1",
        "member_1",
        false,
      ),
    ).rejects.toThrow("Task not found or you do not own it");

    expect(mockTask.findFirst).toHaveBeenCalledWith({
      where: {
        id: "task_1",
        organizationId: "org_1",
        deletedAt: null,
        OR: [
          { createdById: "member_1" },
          { assignedToId: "member_1" },
        ],
      },
    });
  });

  test("logs status changes for RecordModule-linked tasks", async () => {
    mockTask.findFirst.mockResolvedValue({
      id: "task_1",
      name: "Send proposal",
      status: "TODO",
      recordId: "record_1",
    } as never);
    mockTask.update.mockResolvedValue({
      id: "task_1",
      name: "Send proposal",
      status: "IN_PROGRESS",
      recordId: "record_1",
      dealId: null,
    } as never);

    await TasksService.updateTaskStatus(
      "task_1",
      "IN_PROGRESS",
      "org_1",
      "member_1",
      true,
    );

    expect(mockRecordActivity.taskStatusChanged).toHaveBeenCalledWith({
      organizationId: "org_1",
      memberId: "member_1",
      recordId: "record_1",
      taskName: "Send proposal",
      previousStatus: "TODO",
      nextStatus: "IN_PROGRESS",
    });
  });

  test("logs creation of a RecordModule-linked task", async () => {
    mockRecord.findFirst.mockResolvedValue({ id: "record_1" } as never);
    mockTask.create.mockResolvedValue({
      id: "task_1",
      name: "Send proposal",
      description: null,
      dueDate: null,
      assignedToId: null,
      dealId: null,
      recordId: "record_1",
    } as never);

    await TasksService.createTask({
      name: "Send proposal",
      recordId: "record_1",
      organizationId: "org_1",
    }, "member_1");

    expect(mockRecordActivity.taskCreated).toHaveBeenCalledWith({
      organizationId: "org_1",
      memberId: "member_1",
      recordId: "record_1",
      taskName: "Send proposal",
    });
  });
});