import { assertCrmLinksBelongToOrganization } from "@/lib/dal/crm-links";
import { prisma } from "@/lib/db/client";

jest.mock("@/lib/db/client", () => ({
  prisma: {
    deal: { findFirst: jest.fn() },
    contact: { findFirst: jest.fn() },
    company: { findFirst: jest.fn() },
  },
}));

const mockDeal = jest.mocked(prisma.deal);
const mockContact = jest.mocked(prisma.contact);
const mockCompany = jest.mocked(prisma.company);

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
});