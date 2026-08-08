import { prisma } from "@/lib/db/client";
import { TasksService } from "@/modules/tasks/service";

jest.mock("@/lib/db/client", () => ({
  prisma: {
    task: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
  },
}));

jest.mock("@/modules/notifications/service", () => ({
  NotificationsService: {},
}));

jest.mock("@/modules/activity-log/service", () => ({
  ActivityLogService: {},
}));

const mockTask = jest.mocked(prisma.task);

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
});