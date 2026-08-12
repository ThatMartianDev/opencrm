import { ActivityType } from "@/generated/prisma/enums";
import { getSessionClaims } from "@/lib/auth/session";
import { createQueryContext } from "@/lib/dal/scoped-query";
import { prisma } from "@/lib/db/client";
import { getActivities, logActivity } from "@/modules/activity-log/actions";
import { ActivityLogService } from "@/modules/activity-log/service";

jest.mock("@/lib/auth/session", () => ({ getSessionClaims: jest.fn() }));
jest.mock("@/lib/dal/scoped-query", () => ({ createQueryContext: jest.fn() }));
jest.mock("@/lib/db/client", () => ({
  prisma: { recordItem: { findFirst: jest.fn() } },
}));
jest.mock("@/modules/activity-log/service", () => ({
  ActivityLogService: { getActivities: jest.fn(), log: jest.fn() },
}));

const mockGetSessionClaims = jest.mocked(getSessionClaims);
const mockCreateQueryContext = jest.mocked(createQueryContext);
const mockRecord = jest.mocked(prisma.recordItem);
const mockActivityLog = jest.mocked(ActivityLogService);
const assertCan = jest.fn();
const can = jest.fn();
const session = {
  organizationId: "org_1",
  memberId: "member_1",
  userId: "user_1",
  role: "MEMBER",
};

describe("RecordModule activity actions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSessionClaims.mockResolvedValue(session as never);
    mockCreateQueryContext.mockReturnValue({ assertCan, can } as never);
  });

  test("requires record read access before loading the organization-scoped feed", async () => {
    mockActivityLog.getActivities.mockResolvedValue([]);

    await getActivities("record", "record_1");

    expect(assertCan).toHaveBeenCalledWith("records.read");
    expect(mockActivityLog.getActivities).toHaveBeenCalledWith(
      { entityType: "record", entityId: "record_1" },
      "org_1",
    );
  });

  test("allows an owner with update-own permission to log activity", async () => {
    can.mockReturnValue(false);
    mockRecord.findFirst.mockResolvedValue({ id: "record_1" } as never);
    mockActivityLog.log.mockResolvedValue({ id: "activity_1" } as never);

    await logActivity({
      entityType: "record",
      entityId: "record_1",
      activityType: ActivityType.CALL,
      title: "Call Attempt",
    });

    expect(assertCan).toHaveBeenCalledWith("records.update.own");
    expect(mockRecord.findFirst).toHaveBeenCalledWith({
      where: {
        id: "record_1",
        organizationId: "org_1",
        archivedAt: null,
        ownerId: "member_1",
      },
      select: { id: true },
    });
    expect(mockActivityLog.log).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org_1",
        memberId: "member_1",
        entity: { entityType: "record", entityId: "record_1" },
      }),
    );
  });

  test("does not log when the record is outside the writable scope", async () => {
    can.mockReturnValue(false);
    mockRecord.findFirst.mockResolvedValue(null);

    await expect(
      logActivity({
        entityType: "record",
        entityId: "record_2",
        activityType: ActivityType.CALL,
        title: "Call Attempt",
      }),
    ).rejects.toThrow("Record not found or you do not own it.");

    expect(mockActivityLog.log).not.toHaveBeenCalled();
  });
});