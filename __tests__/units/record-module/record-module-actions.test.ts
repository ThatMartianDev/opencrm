import { Prisma } from "@/generated/prisma/client";
import {
  ModuleFeature,
  RecordFieldType,
  RecordViewType,
} from "@/generated/prisma/enums";
import { getSessionClaims } from "@/lib/auth/session";
import { createQueryContext } from "@/lib/dal/scoped-query";
import {
  createModuleRecord,
  createRecordModule,
  getRecordModuleBuilder,
  getRecordModulePage,
  getRecordModuleRecord,
  updateRecordModule,
  updateModuleRecord,
} from "@/modules/RecordModule/actions";
import RecordModuleService from "@/modules/RecordModule/service";

jest.mock("@/lib/auth/session", () => ({
  getSessionClaims: jest.fn(),
}));

jest.mock("@/lib/dal/scoped-query", () => ({
  createQueryContext: jest.fn(),
}));

jest.mock("@/modules/RecordModule/service", () => ({
  __esModule: true,
  default: {
    createRecord: jest.fn(),
    createRecordModule: jest.fn(),
    getModuleBuilderData: jest.fn(),
    getModulePageData: jest.fn(),
    getRecord: jest.fn(),
    updateRecord: jest.fn(),
    updateRecordModule: jest.fn(),
  },
}));

const mockGetSessionClaims = jest.mocked(getSessionClaims);
const mockCreateQueryContext = jest.mocked(createQueryContext);
const mockService = jest.mocked(RecordModuleService);
const assertCan = jest.fn();
const can = jest.fn();

const session = {
  organizationId: "org_1",
  memberId: "member_1",
  userId: "user_1",
  role: "OWNER",
};

const titleField = {
  id: "field_title",
  moduleId: "module_1",
  key: "title",
  label: "Title",
  type: RecordFieldType.TEXT,
  required: true,
  unique: false,
  isPrimary: true,
  isSystem: false,
  position: 1,
  config: null,
  defaultValue: null,
  createdAt: new Date("2026-08-01T00:00:00.000Z"),
  updatedAt: new Date("2026-08-01T00:00:00.000Z"),
};

const amountField = {
  ...titleField,
  id: "field_amount",
  key: "amount",
  label: "Amount",
  type: RecordFieldType.NUMBER,
  required: false,
  isPrimary: false,
  position: 2,
  config: { minimum: 10, maximum: 100 },
  defaultValue: 25,
};

const statusField = {
  ...titleField,
  id: "field_status",
  key: "status",
  label: "Status",
  type: RecordFieldType.SELECT,
  required: false,
  isPrimary: false,
  position: 3,
  config: {
    options: [
      { label: "Open", value: "open", color: "#00aa00" },
      { label: "Closed", value: "closed", color: "#aa0000" },
    ],
  },
  defaultValue: null,
};

const relationshipField = {
  ...titleField,
  id: "field_contact",
  key: "contact",
  label: "Contact",
  type: RecordFieldType.RELATIONSHIP,
  required: true,
  isPrimary: false,
  position: 4,
  relationshipDefinition: {
    fieldId: "field_contact",
    targetModuleId: "module_contacts",
  },
};

const pageData = (
  fields: Record<string, unknown>[] = [titleField, amountField, statusField],
) => ({
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
  fields,
  views: [],
  records: [],
  pagination: {
    page: 1,
    pageSize: 50,
    totalRecords: 0,
    totalPages: 1,
    search: "",
  },
});

describe("RecordModule actions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    assertCan.mockReset();
    can.mockReset();
    can.mockImplementation((permission: string) => permission.endsWith(".any"));
    mockGetSessionClaims.mockResolvedValue(session as never);
    mockCreateQueryContext.mockReturnValue({
      assertCan,
      can,
      orgId: session.organizationId,
      memberId: session.memberId,
      role: session.role,
    } as never);
    mockService.getModulePageData.mockResolvedValue(pageData() as never);
  });

  test("requires record read permission and normalizes pagination input", async () => {
    mockService.getModulePageData.mockResolvedValue(null);

    await getRecordModulePage("projects", {
      page: 2,
      pageSize: 25,
      search: "  Acme  ",
    });

    expect(assertCan).toHaveBeenCalledWith("records.read");
    expect(mockService.getModulePageData).toHaveBeenCalledWith(
      "projects",
      "org_1",
      { page: 2, pageSize: 25, search: "Acme" },
    );
  });

  test("loads module builder data within the current organization", async () => {
    mockService.getModuleBuilderData.mockResolvedValue(null);

    await getRecordModuleBuilder("module_1");

    expect(assertCan).toHaveBeenCalledWith("workspace.manage");
    expect(mockService.getModuleBuilderData).toHaveBeenCalledWith(
      "module_1",
      "org_1",
    );
  });

  test("allows members with update-own to reassign a record they own", async () => {
    can.mockImplementation((permission: string) => permission === "records.update.own");
    mockService.getRecord.mockResolvedValue({
      id: "record_1",
      ownerId: "member_1",
    } as never);

    await expect(
      getRecordModuleRecord("projects", "record_1"),
    ).resolves.toEqual(
      expect.objectContaining({ canTransferOwnership: true }),
    );
  });

  test("keeps another member's record assignment read-only without update-any", async () => {
    can.mockImplementation((permission: string) => permission === "records.update.own");
    mockService.getRecord.mockResolvedValue({
      id: "record_1",
      ownerId: "member_2",
    } as never);

    await expect(
      getRecordModuleRecord("projects", "record_1"),
    ).resolves.toEqual(
      expect.objectContaining({ canTransferOwnership: false }),
    );
  });

  test("applies defaults and validated values when creating a record", async () => {
    mockService.createRecord.mockResolvedValue({ id: "record_1" } as never);

    await expect(
      createModuleRecord("projects", { title: "  Project Apollo  ", status: "open" }),
    ).resolves.toEqual({ success: true, recordId: "record_1" });

    expect(assertCan).toHaveBeenCalledWith("records.create");
    expect(mockService.createRecord).toHaveBeenCalledWith({
      organizationId: "org_1",
      moduleId: "module_1",
      createdById: "member_1",
      ownerId: "member_1",
      displayName: "Project Apollo",
      values: [
        { fieldId: "field_title", value: "Project Apollo" },
        { fieldId: "field_amount", value: 25 },
        { fieldId: "field_status", value: "open" },
      ],
      relationships: [],
    });
  });

  test("creates a record for the selected workspace member", async () => {
    mockService.createRecord.mockResolvedValue({ id: "record_1" } as never);

    await expect(
      createModuleRecord("projects", { title: "Apollo" }, "member_2"),
    ).resolves.toEqual({ success: true, recordId: "record_1" });

    expect(can).toHaveBeenCalledWith("records.update.any");
    expect(mockService.createRecord).toHaveBeenCalledWith(
      expect.objectContaining({ ownerId: "member_2" }),
    );
  });

  test("parses relationship fields into record links instead of JSON values", async () => {
    mockService.getModulePageData.mockResolvedValue(
      pageData([titleField, relationshipField]) as never,
    );
    mockService.createRecord.mockResolvedValue({ id: "record_1" } as never);

    await createModuleRecord("projects", {
      title: "Apollo",
      contact: "record_contact_1",
    });

    expect(mockService.createRecord).toHaveBeenCalledWith({
      organizationId: "org_1",
      moduleId: "module_1",
      createdById: "member_1",
      ownerId: "member_1",
      displayName: "Apollo",
      values: [{ fieldId: "field_title", value: "Apollo" }],
      relationships: [
        { fieldId: "field_contact", targetRecordId: "record_contact_1" },
      ],
    });
  });

  test("rejects whitespace-only required text", async () => {
    await expect(
      createModuleRecord("projects", { title: "   " }),
    ).resolves.toEqual({ success: false, error: "Title is required." });

    expect(mockService.createRecord).not.toHaveBeenCalled();
  });

  test("enforces configured numeric bounds", async () => {
    await expect(
      createModuleRecord("projects", { title: "Apollo", amount: 101 }),
    ).resolves.toEqual({
      success: false,
      error: "Amount must be at most 100.",
    });

    expect(mockService.createRecord).not.toHaveBeenCalled();
  });

  test("rejects values outside configured select options", async () => {
    await expect(
      createModuleRecord("projects", { title: "Apollo", status: "unknown" }),
    ).resolves.toEqual({
      success: false,
      error: "Choose a valid Status option.",
    });

    expect(mockService.createRecord).not.toHaveBeenCalled();
  });

  test("does not reapply defaults when updating a record", async () => {
    mockService.updateRecord.mockResolvedValue({ id: "record_1" } as never);

    await updateModuleRecord("projects", "record_1", { title: "Apollo" });

    expect(can).toHaveBeenCalledWith("records.update.any");
    expect(mockService.updateRecord).toHaveBeenCalledWith({
      organizationId: "org_1",
      moduleId: "module_1",
      recordId: "record_1",
      displayName: "Apollo",
      values: [{ fieldId: "field_title", value: "Apollo" }],
      relationships: [],
      memberId: "member_1",
      canUpdateAny: true,
    });
  });

  test("returns a useful error when a unique field conflicts", async () => {
    mockService.createRecord.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
        clientVersion: "7.8.0",
      }),
    );

    await expect(
      createModuleRecord("projects", { title: "Apollo" }),
    ).resolves.toEqual({
      success: false,
      error: "A record already uses a value that must be unique.",
    });
  });

  test("translates denied create permission without calling the service", async () => {
    assertCan.mockImplementation(() => {
      throw new Error('Forbidden: requires "records.create"');
    });

    await expect(
      createModuleRecord("projects", { title: "Apollo" }),
    ).resolves.toEqual({
      success: false,
      error: "You do not have permission to create records.",
    });

    expect(mockService.getModulePageData).not.toHaveBeenCalled();
    expect(mockService.createRecord).not.toHaveBeenCalled();
  });

  test("rejects unfinished module features at the action boundary", async () => {
    const result = await createRecordModule({
      moduleDetails: {
        name: "Project",
        pluralName: "Projects",
        icon: "TargetFilled",
        accentColor: "#123456",
      },
      dataFields: [
        {
          key: "title",
          label: "Title",
          type: RecordFieldType.TEXT,
          required: true,
          unique: false,
          defaultValue: null,
          isPrimary: true,
          position: 0,
          config: null,
        },
      ],
      moduleViews: [
        {
          name: "List View",
          type: RecordViewType.LIST,
          position: 0,
          isDefault: true,
          config: { columns: ["title"] },
        },
      ],
      moduleFeatures: [ModuleFeature.EMAILS],
    });

    expect(result.success).toBe(false);
    expect(mockService.createRecordModule).not.toHaveBeenCalled();
  });

  test("rejects unsupported field types in module payloads", async () => {
    const result = await createRecordModule({
      moduleDetails: {
        name: "Project",
        pluralName: "Projects",
        icon: "TargetFilled",
        accentColor: "#123456",
      },
      dataFields: [
        {
          key: "attachment",
          label: "Attachment",
          type: RecordFieldType.FILE,
          required: true,
          unique: false,
          defaultValue: null,
          isPrimary: true,
          position: 0,
          config: null,
        },
      ],
      moduleViews: [
        {
          name: "List View",
          type: RecordViewType.LIST,
          position: 0,
          isDefault: true,
          config: { columns: ["attachment"] },
        },
      ],
      moduleFeatures: [],
    });

    expect(result.success).toBe(false);
    expect(mockService.createRecordModule).not.toHaveBeenCalled();
  });

  test("validates and updates module builder data", async () => {
    const payload = {
      moduleDetails: {
        name: "Project",
        pluralName: "Projects",
        icon: "TargetFilled" as const,
        accentColor: "#123456",
      },
      dataFields: [
        {
          key: "title",
          label: "Title",
          type: RecordFieldType.TEXT,
          required: true,
          unique: false,
          defaultValue: null,
          isPrimary: true,
          position: 0,
          config: null,
        },
      ],
      moduleViews: [
        {
          name: "List View",
          type: RecordViewType.LIST,
          position: 0,
          isDefault: true,
          config: { columns: ["title"] },
        },
      ],
      moduleFeatures: [ModuleFeature.NOTES],
    };
    mockService.updateRecordModule.mockResolvedValue({ id: "module_1" });

    await expect(updateRecordModule("module_1", payload)).resolves.toEqual({
      success: true,
    });
    expect(assertCan).toHaveBeenCalledWith("workspace.manage");
    expect(mockService.updateRecordModule).toHaveBeenCalledWith({
      moduleId: "module_1",
      organizationId: "org_1",
      createdById: "member_1",
      ...payload,
      dataFields: [
        {
          ...payload.dataFields[0],
          relationshipTargetModuleId: null,
        },
      ],
    });
  });
});
