import { assertCrmLinksBelongToOrganization } from "@/lib/dal/crm-links";
import { prisma } from "@/lib/db/client";

jest.mock("@/lib/db/client", () => ({
  prisma: {
    deal: { findFirst: jest.fn() },
    contact: { findFirst: jest.fn() },
    company: { findFirst: jest.fn() },
    recordItem: { findFirst: jest.fn() },
  },
}));

const mockDeal = jest.mocked(prisma.deal);
const mockContact = jest.mocked(prisma.contact);
const mockCompany = jest.mocked(prisma.company);
const mockRecord = jest.mocked(prisma.recordItem);

describe("assertCrmLinksBelongToOrganization", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("checks every supplied target against the active organization", async () => {
    mockDeal.findFirst.mockResolvedValue({ id: "deal_1" } as never);
    mockContact.findFirst.mockResolvedValue({ id: "contact_1" } as never);
    mockCompany.findFirst.mockResolvedValue({ id: "company_1" } as never);

    await expect(
      assertCrmLinksBelongToOrganization("org_1", {
        dealId: "deal_1",
        contactId: "contact_1",
        companyId: "company_1",
      }),
    ).resolves.toBeUndefined();

    expect(mockDeal.findFirst).toHaveBeenCalledWith({
      where: { id: "deal_1", organizationId: "org_1", deletedAt: null },
      select: { id: true },
    });
    expect(mockContact.findFirst).toHaveBeenCalledWith({
      where: { id: "contact_1", organizationId: "org_1", deletedAt: null },
      select: { id: true },
    });
    expect(mockCompany.findFirst).toHaveBeenCalledWith({
      where: { id: "company_1", organizationId: "org_1", deletedAt: null },
      select: { id: true },
    });
  });

  test("rejects a target outside the active organization", async () => {
    mockContact.findFirst.mockResolvedValue(null);

    await expect(
      assertCrmLinksBelongToOrganization("org_1", { contactId: "contact_2" }),
    ).rejects.toThrow("CRM link target not found in this organization.");
  });

  test("can include soft-deleted targets for activity history", async () => {
    mockDeal.findFirst.mockResolvedValue({ id: "deal_1" } as never);

    await assertCrmLinksBelongToOrganization(
      "org_1",
      { dealId: "deal_1" },
      { includeDeleted: true },
    );

    expect(mockDeal.findFirst).toHaveBeenCalledWith({
      where: { id: "deal_1", organizationId: "org_1" },
      select: { id: true },
    });
  });

  test("scopes active RecordModule targets to the organization", async () => {
    mockRecord.findFirst.mockResolvedValue({ id: "record_1" } as never);

    await assertCrmLinksBelongToOrganization("org_1", {
      recordId: "record_1",
    });

    expect(mockRecord.findFirst).toHaveBeenCalledWith({
      where: {
        id: "record_1",
        organizationId: "org_1",
        archivedAt: null,
      },
      select: { id: true },
    });
  });

  test("can include archived RecordModule targets in activity history", async () => {
    mockRecord.findFirst.mockResolvedValue({ id: "record_1" } as never);

    await assertCrmLinksBelongToOrganization(
      "org_1",
      { recordId: "record_1" },
      { includeDeleted: true },
    );

    expect(mockRecord.findFirst).toHaveBeenCalledWith({
      where: { id: "record_1", organizationId: "org_1" },
      select: { id: true },
    });
  });
});