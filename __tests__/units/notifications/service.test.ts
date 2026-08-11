import { prisma } from "@/lib/db/client";
import { notificationDelivery, NotificationsService } from "@/modules/notifications/service";

jest.mock("@/lib/db/client", () => ({
  prisma: {
    member: { findFirst: jest.fn() },
    notification: {},
  },
}));

jest.mock("@/lib/queue", () => ({
  boss: { createQueue: jest.fn() },
  ensureQueueStarted: jest.fn(),
}));

jest.mock("@/modules/notifications/delivery", () => ({
  DELIVER_NOTIFICATION_QUEUE: "deliver-notification",
  NotificationDelivery: jest.fn().mockImplementation(() => ({
    notify: jest.fn(),
  })),
}));

jest.mock("@/modules/notifications/adapters/email.adapter", () => ({
  EmailAdapter: jest.fn(),
}));

jest.mock("@/modules/notifications/adapters/in-app.adapter", () => ({
  InAppAdapter: jest.fn(),
}));

const mockMember = jest.mocked(prisma.member);
const mockNotify = jest.mocked(notificationDelivery.notify);

describe("NotificationsService.notifyRecordAssignment", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("enqueues in-app and email delivery with a direct record link", async () => {
    const assignee = {
      id: "member_2",
      organizationId: "org_1",
      user: { id: "user_2", name: "User Two", email: "two@example.com" },
    };
    mockMember.findFirst.mockResolvedValue(assignee as never);

    await NotificationsService.notifyRecordAssignment({
      organizationId: "org_1",
      moduleKey: "projects",
      recordId: "record_1",
      recordName: "Apollo",
      assignedToId: "member_2",
      actorMemberId: "member_1",
    });

    expect(mockMember.findFirst).toHaveBeenCalledWith({
      where: { id: "member_2", organizationId: "org_1" },
      include: { user: true },
    });
    expect(mockNotify).toHaveBeenCalledWith({
      member: assignee,
      type: "record_assigned",
      title: "Record assigned to you: Apollo",
      body: "You are now the owner of this record.",
      link: "/app/org_1/projects/record_1",
      data: { recordId: "record_1", moduleKey: "projects" },
      channels: ["in_app", "email"],
    });
  });

  test("skips self-assignment", async () => {
    await NotificationsService.notifyRecordAssignment({
      organizationId: "org_1",
      moduleKey: "projects",
      recordId: "record_1",
      recordName: "Apollo",
      assignedToId: "member_1",
      actorMemberId: "member_1",
    });

    expect(mockMember.findFirst).not.toHaveBeenCalled();
    expect(mockNotify).not.toHaveBeenCalled();
  });
});