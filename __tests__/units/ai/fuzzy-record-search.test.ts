/** @jest-environment node */

import { prisma } from "@/lib/db/client";
import RecordModuleService from "@/modules/RecordModule/service";

jest.mock("@/lib/db/client", () => ({
  prisma: {
    recordModule: { findFirst: jest.fn() },
    recordItem: { findMany: jest.fn() },
    $queryRaw: jest.fn(),
  },
}));

jest.mock("@/modules/notifications/service", () => ({
  NotificationsService: {},
}));

jest.mock("@/modules/RecordModule/service/record.activity.service", () => ({
  RecordActivityService: {},
}));

const mockPrisma = jest.mocked(prisma);

describe("fuzzy record search", () => {
  test("returns a close display-name typo with fuzzy evidence", async () => {
    mockPrisma.recordModule.findFirst.mockResolvedValue({ id: "module_contacts" } as never);
    mockPrisma.$queryRaw.mockResolvedValue([
      { id: "contact_dave", similarity: 0.92 },
    ] as never);
    mockPrisma.recordItem.findMany.mockResolvedValue([
      {
        id: "contact_dave",
        moduleId: "module_contacts",
        displayName: "Dave Davidson",
        values: [
          {
            value: "Dave Davidson",
            field: {
              label: "Name",
              type: "TEXT",
              config: null,
              isPrimary: true,
              position: 0,
            },
          },
        ],
      },
    ] as never);

    const results = await RecordModuleService.searchAllRecords({
      organizationId: "org_1",
      moduleId: "module_contacts",
      query: "Dave Davison",
      limit: 5,
    });

    expect(results).toEqual([
      expect.objectContaining({
        id: "contact_dave",
        displayName: "Dave Davidson",
        matchReason: "fuzzy_name",
        matchedFields: ["Name"],
      }),
    ]);
    expect(results?.[0].score).toBeGreaterThan(0.6);
    expect(results?.[0].score).toBeLessThan(0.8);
  });
});