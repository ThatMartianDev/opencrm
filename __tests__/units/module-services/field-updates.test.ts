import { prisma } from "@/lib/db/client";
import { ActivityLogService } from "@/modules/activity-log/service";
import { assertCrmLinksBelongToOrganization } from "@/lib/dal/crm-links";
import { ContactsService } from "@/modules/contacts/service";
import { CompaniesService } from "@/modules/companies/service";
import { DealsService } from "@/modules/deals/service";

jest.mock("@/lib/db/client", () => ({
  prisma: {
    contact: { findFirst: jest.fn(), update: jest.fn() },
    company: { findFirst: jest.fn(), update: jest.fn() },
    deal: { findFirst: jest.fn(), update: jest.fn() },
  },
}));
jest.mock("@/modules/activity-log/service", () => ({
  ActivityLogService: { log: jest.fn() },
}));
jest.mock("@/modules/notifications/service", () => ({
  NotificationsService: {},
}));
jest.mock("@/lib/dal/crm-links", () => ({
  assertCrmLinksBelongToOrganization: jest.fn(),
}));

const cases = [
  {
    name: "contact",
    model: jest.mocked(prisma.contact),
    update: ContactsService.updateContactField,
    fields: ["name", "email", "phone", "jobTitle", "source"],
  },
  {
    name: "company",
    model: jest.mocked(prisma.company),
    update: CompaniesService.updateCompanyField,
    fields: ["name", "email", "phone", "website", "industry", "size", "address"],
  },
  {
    name: "deal",
    model: jest.mocked(prisma.deal),
    update: DealsService.updateDealField,
    fields: ["title", "value", "source", "lostReason"],
  },
];

describe.each(cases)("$name field updates", ({ name, model, update, fields }) => {
  beforeEach(() => {
    jest.clearAllMocks();
    model.findFirst.mockResolvedValue({ id: "entity_1" } as never);
    model.update.mockResolvedValue({ id: "entity_1" } as never);
  });

  test.each(["organizationId", "createdById", "id", "companyId", "__proto__"])(
    "rejects restricted field %s before database access",
    async (field) => {
      await expect(Reflect.apply(update, undefined, [
        "entity_1", field, "other_id", "org_1", "member_1",
      ])).rejects.toThrow();
      expect(model.findFirst).not.toHaveBeenCalled();
      expect(model.update).not.toHaveBeenCalled();
      expect(ActivityLogService.log).not.toHaveBeenCalled();
    },
  );

  test.each([{ set: "injected" }, null, 123])(
    "rejects a non-string value %p",
    async (value) => {
      await expect(Reflect.apply(update, undefined, [
        "entity_1", fields[0], value, "org_1", "member_1",
      ])).rejects.toThrow();
      expect(model.update).not.toHaveBeenCalled();
    },
  );

  test.each(fields)("preserves allowed field %s and scopes the write", async (field) => {
    await Reflect.apply(update, undefined, [
      "entity_1", field, "updated", "org_1", "member_1",
    ]);
    expect(model.update).toHaveBeenCalledWith({
      where: { id: "entity_1", organizationId: "org_1", deletedAt: null },
      data: { [field]: "updated" },
    });
    expect(ActivityLogService.log).toHaveBeenCalled();
  });

  test("preserves clearing optional fields", async () => {
    const field = fields.includes("source") ? "source" : "email";
    await Reflect.apply(update, undefined, [
      "entity_1", field, "", "org_1", "member_1",
    ]);
    expect(model.update).toHaveBeenCalledWith(expect.objectContaining({
      data: { [field]: null },
    }));
  });

  test("rejects missing or foreign entities", async () => {
    model.findFirst.mockResolvedValue(null);
    await expect(Reflect.apply(update, undefined, [
      "entity_1", fields[0], "updated", "org_1", "member_1",
    ])).rejects.toThrow(`${name[0].toUpperCase()}${name.slice(1)} not found`);
    expect(model.update).not.toHaveBeenCalled();
  });
});

describe("deal relationship updates", () => {
  beforeEach(() => jest.clearAllMocks());

  test.each(["organizationId", "assignedToId", "createdById"])(
    "rejects restricted relation field %s",
    async (field) => {
      await expect(Reflect.apply(DealsService.updateDealRelation, undefined, [
        "deal_1", field, "other_id", "Other", "org_1", "member_1",
      ])).rejects.toThrow();
      expect(assertCrmLinksBelongToOrganization).not.toHaveBeenCalled();
      expect(prisma.deal.update).not.toHaveBeenCalled();
    },
  );

  test.each(["contactId", "companyId"] as const)(
    "validates and updates allowed relation %s",
    async (field) => {
      jest.mocked(prisma.deal.findFirst).mockResolvedValue({ id: "deal_1" } as never);
      await DealsService.updateDealRelation("deal_1", field, "target_1", "Target", "org_1", "member_1");
      expect(assertCrmLinksBelongToOrganization).toHaveBeenCalledWith("org_1", { [field]: "target_1" });
      expect(prisma.deal.update).toHaveBeenCalledWith({
        where: { id: "deal_1", organizationId: "org_1", deletedAt: null },
        data: { [field]: "target_1" },
      });
    },
  );
});
