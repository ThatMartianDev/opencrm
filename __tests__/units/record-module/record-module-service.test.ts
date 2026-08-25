import { prisma } from "@/lib/db/client";
import RecordModuleService from "@/modules/RecordModule/service";
import { RecordActivityService } from "@/modules/RecordModule/service/record.activity.service";
import { NotificationsService } from "@/modules/notifications/service";

jest.mock("@/modules/RecordModule/service/record-activity.service", () => ({
  RecordActivityService: {
    created: jest.fn(),
    fieldsUpdated: jest.fn(),
    archived: jest.fn(),
    ownershipTransferred: jest.fn(),
  },
}));

jest.mock("@/modules/notifications/service", () => ({
  NotificationsService: {
    notifyRecordAssignment: jest.fn(),
  },
}));

jest.mock("@/lib/db/client", () => ({
  prisma: {
    $transaction: jest.fn(),
    recordModule: {
      findFirst: jest.fn(),
    },
    recordItem: {
      create: jest.fn(),
      findFirst: jest.fn(),
      updateMany: jest.fn(),
    },
    member: {
      findFirst: jest.fn(),
    },
  },
}));

const transaction = {
  $queryRaw: jest.fn(),
  recordFieldValue: {
    deleteMany: jest.fn(),
  },
  recordField: {
    findMany: jest.fn(),
  },
  recordRelationship: {
    createMany: jest.fn(),
    deleteMany: jest.fn(),
  },
  member: {
    findFirst: jest.fn(),
  },
  recordItem: {
    create: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
};

const mockPrisma = jest.mocked(prisma);
const mockRecordActivity = jest.mocked(RecordActivityService);
const mockNotifications = jest.mocked(NotificationsService);
const moduleRow = {
  id: "module_1",
  organizationId: "org_1",
  key: "projects",
  name: "Project",
  pluralName: "Projects",
  icon: "TargetFilled",
  accentColor: "#123456",
  features: [],
  createdAt: new Date("2026-08-01T00:00:00.000Z"),
  updatedAt: new Date("2026-08-01T00:00:00.000Z"),
  archivedAt: null,
  fields: [],
  views: [],
};

const record = (id: string) => ({
  id,
  organizationId: "org_1",
  moduleId: "module_1",
  displayName: id,
  createdById: "member_1",
  ownerId: "member_1",
  createdAt: new Date("2026-08-01T00:00:00.000Z"),
  updatedAt: new Date("2026-08-01T00:00:00.000Z"),
  archivedAt: null,
  values: [],
  module: { key: "projects" },
});

describe("RecordModuleService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    transaction.member.findFirst.mockResolvedValue({ id: "member_1" });
    mockPrisma.$transaction.mockImplementation(
      ((callback: (client: typeof transaction) => Promise<unknown>) =>
        callback(transaction)) as never,
    );
  });

  describe("getModulePageData", () => {
    test("scopes module lookup to the organization and skips record queries when absent", async () => {
      mockPrisma.recordModule.findFirst.mockResolvedValue(null);

      await expect(
        RecordModuleService.getModulePageData("projects", "org_1"),
      ).resolves.toBeNull();

      expect(mockPrisma.recordModule.findFirst).toHaveBeenCalledWith({
        where: {
          key: "projects",
          organizationId: "org_1",
          archivedAt: null,
        },
        include: {
          fields: {
            include: {
              relationshipDefinition: {
                include: {
                  targetModule: {
                    select: {
                      id: true,
                      key: true,
                      name: true,
                      pluralName: true,
                    },
                  },
                },
              },
            },
            orderBy: { position: "asc" },
          },
          views: { orderBy: { position: "asc" } },
        },
      });
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    test("returns a bounded page in the database-selected order", async () => {
      mockPrisma.recordModule.findFirst.mockResolvedValue(moduleRow as never);
      transaction.$queryRaw
        .mockResolvedValueOnce([{ count: 120 }])
        .mockResolvedValueOnce([{ id: "record_2" }, { id: "record_1" }]);
      transaction.recordItem.findMany.mockResolvedValue([
        record("record_1"),
        record("record_2"),
      ]);

      const result = await RecordModuleService.getModulePageData(
        "projects",
        "org_1",
        { page: 99, pageSize: 50, search: "" },
      );

      expect(result?.records.map((item) => item.id)).toEqual([
        "record_2",
        "record_1",
      ]);
      expect(result?.pagination).toEqual({
        page: 3,
        pageSize: 50,
        totalRecords: 120,
        totalPages: 3,
        search: "",
      });
      expect(transaction.recordItem.findMany).toHaveBeenCalledWith({
        where: { id: { in: ["record_2", "record_1"] } },
        include: {
          values: true,
          owner: {
            select: {
              id: true,
              user: {
                select: {
                  name: true,
                  email: true,
                  avatarUrl: true,
                },
              },
            },
          },
          outgoingRelationships: {
            include: {
              targetRecord: {
                select: { id: true, displayName: true },
              },
            },
          },
        },
      });

      const pageSql = transaction.$queryRaw.mock.calls[1]?.[0] as {
        values: unknown[];
      };
      expect(pageSql.values).toEqual([
        "module_1",
        "org_1",
        50,
        100,
      ]);
    });

    test("parameterizes search for display names and JSON field values", async () => {
      mockPrisma.recordModule.findFirst.mockResolvedValue(moduleRow as never);
      transaction.$queryRaw
        .mockResolvedValueOnce([{ count: 0 }])
        .mockResolvedValueOnce([]);

      const result = await RecordModuleService.getModulePageData(
        "projects",
        "org_1",
        { page: 1, pageSize: 25, search: "  Acme  " },
      );

      const countSql = transaction.$queryRaw.mock.calls[0]?.[0] as {
        values: unknown[];
      };
      const pageSql = transaction.$queryRaw.mock.calls[1]?.[0] as {
        values: unknown[];
      };
      expect(countSql.values).toEqual([
        "module_1",
        "org_1",
        "%Acme%",
        "%Acme%",
      ]);
      expect(pageSql.values).toEqual([
        "module_1",
        "org_1",
        "%Acme%",
        "%Acme%",
        25,
        0,
      ]);
      expect(result?.pagination.search).toBe("Acme");
      expect(transaction.recordItem.findMany).not.toHaveBeenCalled();
    });
  });

  describe("record writes", () => {
    test("creates records with organization, module, creator, and values intact", async () => {
      transaction.recordItem.create.mockResolvedValue(record("record_1"));
      const values = [{ fieldId: "field_title", value: "Apollo" }];

      await RecordModuleService.createRecord({
        organizationId: "org_1",
        moduleId: "module_1",
        createdById: "member_1",
        displayName: "Apollo",
        values,
      });

      expect(transaction.recordItem.create).toHaveBeenCalledWith({
        data: {
          organizationId: "org_1",
          moduleId: "module_1",
          createdById: "member_1",
          ownerId: "member_1",
          displayName: "Apollo",
          values: { create: values },
        },
        include: {
          values: true,
          module: { select: { key: true } },
        },
      });
      expect(mockRecordActivity.created).toHaveBeenCalledWith({
        organizationId: "org_1",
        memberId: "member_1",
        recordId: "record_1",
        recordName: "record_1",
      });
      expect(mockNotifications.notifyRecordAssignment).not.toHaveBeenCalled();
    });

    test("creates records for an explicitly selected organization member", async () => {
      transaction.member.findFirst.mockResolvedValue({ id: "member_2" });
      transaction.recordItem.create.mockResolvedValue({
        ...record("record_1"),
        ownerId: "member_2",
      });

      await RecordModuleService.createRecord({
        organizationId: "org_1",
        moduleId: "module_1",
        createdById: "member_1",
        ownerId: "member_2",
        displayName: "Apollo",
        values: [],
      });

      expect(transaction.member.findFirst).toHaveBeenCalledWith({
        where: { id: "member_2", organizationId: "org_1" },
        select: { id: true },
      });
      expect(transaction.recordItem.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ ownerId: "member_2" }),
        }),
      );
      expect(mockNotifications.notifyRecordAssignment).toHaveBeenCalledWith({
        organizationId: "org_1",
        moduleKey: "projects",
        recordId: "record_1",
        recordName: "record_1",
        assignedToId: "member_2",
        actorMemberId: "member_1",
      });
    });

    test("rejects a selected owner outside the organization", async () => {
      transaction.member.findFirst.mockResolvedValue(null);

      await expect(
        RecordModuleService.createRecord({
          organizationId: "org_1",
          moduleId: "module_1",
          createdById: "member_1",
          ownerId: "member_other_org",
          displayName: "Apollo",
          values: [],
        }),
      ).resolves.toBeNull();

      expect(transaction.recordItem.create).not.toHaveBeenCalled();
      expect(mockRecordActivity.created).not.toHaveBeenCalled();
    });

    test("validates and creates a single relationship edge", async () => {
      transaction.recordField.findMany.mockResolvedValue([
        {
          id: "field_contact",
          relationshipDefinition: { targetModuleId: "module_contacts" },
        },
      ]);
      transaction.recordItem.findMany.mockResolvedValue([
        { id: "contact_1", moduleId: "module_contacts" },
      ]);
      transaction.recordItem.create.mockResolvedValue(record("record_1"));
      transaction.recordRelationship.createMany.mockResolvedValue({ count: 1 });

      await RecordModuleService.createRecord({
        organizationId: "org_1",
        moduleId: "module_1",
        createdById: "member_1",
        displayName: "Apollo",
        values: [],
        relationships: [
          { fieldId: "field_contact", targetRecordId: "contact_1" },
        ],
      });

      expect(transaction.recordRelationship.createMany).toHaveBeenCalledWith({
        data: [
          {
            organizationId: "org_1",
            fieldId: "field_contact",
            sourceRecordId: "record_1",
            targetRecordId: "contact_1",
          },
        ],
      });
    });

    test("does not modify a record outside the requested organization and module", async () => {
      transaction.recordItem.findFirst.mockResolvedValue(null);

      await expect(
        RecordModuleService.updateRecord({
          organizationId: "org_1",
          moduleId: "module_1",
          recordId: "record_1",
          displayName: "Apollo",
          values: [],
          memberId: "member_1",
          canUpdateAny: false,
        }),
      ).resolves.toBeNull();

      expect(transaction.recordItem.findFirst).toHaveBeenCalledWith({
        where: {
          id: "record_1",
          moduleId: "module_1",
          organizationId: "org_1",
          archivedAt: null,
          ownerId: "member_1",
        },
        select: {
          id: true,
          values: { select: { fieldId: true, value: true } },
          outgoingRelationships: {
            select: {
              fieldId: true,
              targetRecordId: true,
              targetRecord: { select: { displayName: true } },
            },
          },
          module: {
            select: {
              fields: {
                select: {
                  id: true,
                  label: true,
                  type: true,
                  config: true,
                },
              },
            },
          },
        },
      });
      expect(transaction.recordFieldValue.deleteMany).not.toHaveBeenCalled();
      expect(transaction.recordItem.update).not.toHaveBeenCalled();
    });

    test("replaces field values atomically after verifying tenant scope", async () => {
      transaction.recordItem.findFirst.mockResolvedValue({
        id: "record_1",
        values: [
          { fieldId: "field_title", value: "Old Apollo" },
          { fieldId: "field_amount", value: 10 },
        ],
        outgoingRelationships: [],
        module: {
          fields: [
            { id: "field_title", label: "Title", type: "TEXT", config: null },
            { id: "field_amount", label: "Amount", type: "NUMBER", config: null },
          ],
        },
      });
      transaction.recordFieldValue.deleteMany.mockResolvedValue({ count: 2 });
      transaction.recordRelationship.deleteMany.mockResolvedValue({ count: 0 });
      transaction.recordItem.update.mockResolvedValue(record("record_1"));
      transaction.recordItem.findUnique.mockResolvedValue(record("record_1"));
      const values = [
        { fieldId: "field_title", value: "Apollo" },
        { fieldId: "field_amount", value: 42 },
      ];

      await RecordModuleService.updateRecord({
        organizationId: "org_1",
        moduleId: "module_1",
        recordId: "record_1",
        displayName: "Apollo",
        values,
        memberId: "member_1",
        canUpdateAny: true,
      });

      expect(transaction.recordFieldValue.deleteMany).toHaveBeenCalledWith({
        where: { recordId: "record_1" },
      });
      expect(transaction.recordRelationship.deleteMany).toHaveBeenCalledWith({
        where: { sourceRecordId: "record_1" },
      });
      expect(transaction.recordItem.update).toHaveBeenCalledWith({
        where: { id: "record_1" },
        data: {
          displayName: "Apollo",
          values: { create: values },
        },
      });
      expect(transaction.recordItem.findUnique).toHaveBeenCalledWith({
        where: { id: "record_1" },
        include: { values: true },
      });
      expect(
        transaction.recordFieldValue.deleteMany.mock.invocationCallOrder[0],
      ).toBeLessThan(transaction.recordItem.update.mock.invocationCallOrder[0]);
      expect(mockRecordActivity.fieldsUpdated).toHaveBeenCalledWith({
        organizationId: "org_1",
        memberId: "member_1",
        recordId: "record_1",
        changes: [
          {
            fieldName: "Title",
            previousValue: "Old Apollo",
            nextValue: "Apollo",
          },
          {
            fieldName: "Amount",
            previousValue: 10,
            nextValue: 42,
          },
        ],
      });
    });

    test("does not log field activity when submitted values are unchanged", async () => {
      transaction.recordItem.findFirst.mockResolvedValue({
        id: "record_1",
        values: [{ fieldId: "field_title", value: "Apollo" }],
        outgoingRelationships: [],
        module: {
          fields: [
            { id: "field_title", label: "Title", type: "TEXT", config: null },
          ],
        },
      });
      transaction.recordFieldValue.deleteMany.mockResolvedValue({ count: 1 });
      transaction.recordRelationship.deleteMany.mockResolvedValue({ count: 0 });
      transaction.recordItem.update.mockResolvedValue(record("record_1"));
      transaction.recordItem.findUnique.mockResolvedValue(record("record_1"));

      await RecordModuleService.updateRecord({
        organizationId: "org_1",
        moduleId: "module_1",
        recordId: "record_1",
        displayName: "Apollo",
        values: [{ fieldId: "field_title", value: "Apollo" }],
        memberId: "member_1",
        canUpdateAny: true,
      });

      expect(mockRecordActivity.fieldsUpdated).not.toHaveBeenCalled();
    });

    test("archives only records owned by a member without delete-any", async () => {
      mockPrisma.recordItem.findFirst.mockResolvedValue({
        id: "record_1",
        displayName: "Apollo",
      } as never);
      mockPrisma.recordItem.updateMany.mockResolvedValue({ count: 1 });

      await expect(
        RecordModuleService.archiveRecord({
          organizationId: "org_1",
          recordId: "record_1",
          memberId: "member_1",
          canDeleteAny: false,
        }),
      ).resolves.toBe(true);

      expect(mockPrisma.recordItem.updateMany).toHaveBeenCalledWith({
        where: {
          id: "record_1",
          organizationId: "org_1",
          archivedAt: null,
          ownerId: "member_1",
        },
        data: { archivedAt: expect.any(Date) },
      });
      expect(mockRecordActivity.archived).toHaveBeenCalledWith({
        organizationId: "org_1",
        memberId: "member_1",
        recordId: "record_1",
        recordName: "Apollo",
      });
    });

    test("transfers ownership only to a member in the organization", async () => {
      mockPrisma.member.findFirst.mockResolvedValue({
        id: "member_2",
        user: { name: "User Two", email: "two@example.com" },
      } as never);
      mockPrisma.recordItem.findFirst.mockResolvedValue({
        displayName: "Apollo",
        module: { key: "projects" },
        owner: {
          id: "member_1",
          user: { name: "User One", email: "one@example.com" },
        },
      } as never);
      mockPrisma.recordItem.updateMany.mockResolvedValue({ count: 1 });

      await expect(
        RecordModuleService.transferRecordOwnership({
          organizationId: "org_1",
          recordId: "record_1",
          ownerId: "member_2",
          memberId: "member_1",
          canUpdateAny: false,
        }),
      ).resolves.toBe(true);

      expect(mockPrisma.member.findFirst).toHaveBeenCalledWith({
        where: { id: "member_2", organizationId: "org_1" },
        select: {
          id: true,
          user: { select: { name: true, email: true } },
        },
      });
      expect(mockPrisma.recordItem.updateMany).toHaveBeenCalledWith({
        where: {
          id: "record_1",
          organizationId: "org_1",
          archivedAt: null,
          ownerId: "member_1",
        },
        data: { ownerId: "member_2" },
      });
      expect(mockRecordActivity.ownershipTransferred).toHaveBeenCalledWith({
        organizationId: "org_1",
        memberId: "member_1",
        recordId: "record_1",
        previousOwnerId: "member_1",
        previousOwnerName: "User One",
        nextOwnerId: "member_2",
        nextOwnerName: "User Two",
      });
      expect(mockNotifications.notifyRecordAssignment).toHaveBeenCalledWith({
        organizationId: "org_1",
        moduleKey: "projects",
        recordId: "record_1",
        recordName: "Apollo",
        assignedToId: "member_2",
        actorMemberId: "member_1",
      });
    });
  });
});
