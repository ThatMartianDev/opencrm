import { prisma } from "@/lib/db/client";
import { getSupabaseAdmin } from "@/lib/supabase/client";
import { FilesService } from "@/modules/files/service";
import { RecordActivityService } from "@/modules/RecordModule/service/record.activity.service";

jest.mock("@/lib/db/client", () => ({
  prisma: {
    recordItem: { findFirst: jest.fn() },
    file: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

jest.mock("@/lib/dal/crm-links", () => ({
  assertCrmLinksBelongToOrganization: jest.fn(),
}));

const upload = jest.fn();
jest.mock("@/lib/supabase/client", () => ({
  STORAGE_BUCKET: "user-uploads",
  getSupabaseAdmin: jest.fn(() => ({
    storage: { from: jest.fn(() => ({ upload, remove: jest.fn() })) },
  })),
}));

jest.mock("@/modules/RecordModule/service/record-activity.service", () => ({
  RecordActivityService: {
    fileAdded: jest.fn(),
    fileDeleted: jest.fn(),
  },
}));

const mockFile = jest.mocked(prisma.file);
const mockRecord = jest.mocked(prisma.recordItem);
const mockRecordActivity = jest.mocked(RecordActivityService);

describe("FilesService RecordModule activity", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRecord.findFirst.mockResolvedValue({ id: "record_1" } as never);
    upload.mockResolvedValue({ error: null });
  });

  test("logs a successful file upload", async () => {
    const file = new File(["proposal"], "proposal.pdf", {
      type: "application/pdf",
    });
    mockFile.create.mockResolvedValue({
      id: "file_1",
      name: "proposal.pdf",
      type: "FILE",
      recordId: "record_1",
    } as never);

    await FilesService.uploadFile(
      "org_1",
      "member_1",
      file,
      { recordId: "record_1" },
      null,
    );

    expect(getSupabaseAdmin).toHaveBeenCalled();
    expect(mockRecordActivity.fileAdded).toHaveBeenCalledWith({
      organizationId: "org_1",
      memberId: "member_1",
      recordId: "record_1",
      fileName: "proposal.pdf",
    });
  });

  test("logs deletion of a linked file", async () => {
    const linkedFile = {
      id: "file_1",
      name: "proposal.pdf",
      type: "FILE",
      source: "GOOGLE_DRIVE",
      storagePath: null,
      uploadedById: "member_1",
      recordId: "record_1",
    };
    mockFile.findFirst.mockResolvedValue(linkedFile as never);
    mockFile.delete.mockResolvedValue(linkedFile as never);

    await FilesService.delete({
      fileId: "file_1",
      organizationId: "org_1",
      memberId: "member_1",
      canDeleteAny: false,
    });

    expect(mockRecordActivity.fileDeleted).toHaveBeenCalledWith({
      organizationId: "org_1",
      memberId: "member_1",
      recordId: "record_1",
      fileName: "proposal.pdf",
    });
  });

  test("does not log folder creation as a file event", async () => {
    mockFile.create.mockResolvedValue({
      id: "folder_1",
      name: "Contracts",
      type: "FOLDER",
      recordId: "record_1",
    } as never);

    await FilesService.createFolder("org_1", "member_1", {
      name: "Contracts",
      recordId: "record_1",
    });

    expect(mockRecordActivity.fileAdded).not.toHaveBeenCalled();
  });
});