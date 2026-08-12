import { prisma } from "@/lib/db/client";
import { NotesService } from "@/modules/notes/service";
import { RecordActivityService } from "@/modules/RecordModule/service/record-activity.service";

jest.mock("@/modules/RecordModule/service/record-activity.service", () => ({
  RecordActivityService: {
    noteCreated: jest.fn(),
    noteUpdated: jest.fn(),
    noteDeleted: jest.fn(),
  },
}));

jest.mock("@/lib/db/client", () => ({
  prisma: {
    note: {
      create: jest.fn(),
      deleteMany: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      updateMany: jest.fn(),
    },
    recordItem: { findFirst: jest.fn() },
  },
}));

const mockNote = jest.mocked(prisma.note);
const mockRecord = jest.mocked(prisma.recordItem);
const mockRecordActivity = jest.mocked(RecordActivityService);

describe("NotesService reads", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNote.findMany.mockResolvedValue([]);
  });

  test("limits the sidebar list to notes created by the member", async () => {
    await NotesService.getAllNotes("org_1", "member_1", {
      page: 1,
      pageSize: 20,
    });

    expect(mockNote.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { organizationId: "org_1", createdById: "member_1" },
      }),
    );
  });

  test("allows direct reads only for the creator or a linked note", async () => {
    mockNote.findFirst.mockResolvedValue(null);

    await NotesService.getNoteById("note_1", "org_1", "member_1");

    expect(mockNote.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: "note_1",
          organizationId: "org_1",
          OR: [
            { createdById: "member_1" },
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
});

describe("NotesService.deleteNote", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("deletes only notes created by the member when delete-any is not allowed", async () => {
    mockNote.deleteMany.mockResolvedValue({ count: 1 });

    await expect(
      NotesService.deleteNote({
        noteId: "note_1",
        organizationId: "org_1",
        memberId: "member_1",
        canDeleteAny: false,
      }),
    ).resolves.toEqual({ success: true });

    expect(mockNote.deleteMany).toHaveBeenCalledWith({
      where: {
        id: "note_1",
        organizationId: "org_1",
        createdById: "member_1",
      },
    });
    expect(mockNote.findFirst).toHaveBeenCalledWith({
      where: { id: "note_1", organizationId: "org_1" },
      select: { id: true, recordId: true, title: true },
    });
  });

  test("allows elevated users to delete any note in their organization", async () => {
    mockNote.deleteMany.mockResolvedValue({ count: 1 });

    await expect(
      NotesService.deleteNote({
        noteId: "note_1",
        organizationId: "org_1",
        memberId: "manager_1",
        canDeleteAny: true,
      }),
    ).resolves.toEqual({ success: true });

    expect(mockNote.deleteMany).toHaveBeenCalledWith({
      where: {
        id: "note_1",
        organizationId: "org_1",
      },
    });
    expect(mockNote.findFirst).toHaveBeenCalledWith({
      where: { id: "note_1", organizationId: "org_1" },
      select: { id: true, recordId: true, title: true },
    });
  });

  test("tells a member when the note exists but they are not allowed to delete it", async () => {
    mockNote.deleteMany.mockResolvedValue({ count: 0 });
    mockNote.findFirst.mockResolvedValue({
      id: "note_1",
      organizationId: "org_1",
      createdById: "member_2",
      title: "Test Note",
      content: "Test content",
      createdAt: new Date(),
      updatedAt: new Date(),
      companyId: null,
      contactId: null,
      dealId: null,
      recordId: null,
    });

    await expect(
      NotesService.deleteNote({
        noteId: "note_1",
        organizationId: "org_1",
        memberId: "member_1",
        canDeleteAny: false,
      }),
    ).rejects.toThrow("You can only delete notes you created.");

    expect(mockNote.findFirst).toHaveBeenCalledWith({
      where: {
        id: "note_1",
        organizationId: "org_1",
      },
      select: { id: true, recordId: true, title: true },
    });
  });

  test("returns not found when the note does not exist in the organization", async () => {
    mockNote.deleteMany.mockResolvedValue({ count: 0 });
    mockNote.findFirst.mockResolvedValue(null);

    await expect(
      NotesService.deleteNote({
        noteId: "missing_note",
        organizationId: "org_1",
        memberId: "member_1",
        canDeleteAny: false,
      }),
    ).rejects.toThrow("Note not found.");

    expect(mockNote.findFirst).toHaveBeenCalledWith({
      where: {
        id: "missing_note",
        organizationId: "org_1",
      },
      select: { id: true, recordId: true, title: true },
    });
  });
});

describe("NotesService.updateNote", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("limits member updates to notes they created", async () => {
    mockNote.updateMany.mockResolvedValue({ count: 1 });
    mockNote.findUnique.mockResolvedValue({ id: "note_1" } as never);

    await NotesService.updateNote("note_1", {
      title: "Private",
      organizationId: "org_1",
      memberId: "member_1",
      canUpdateAny: false,
    });

    expect(mockNote.updateMany).toHaveBeenCalledWith({
      where: {
        id: "note_1",
        organizationId: "org_1",
        createdById: "member_1",
      },
      data: {
        title: "Private",
        content: undefined,
        dealId: undefined,
        contactId: undefined,
        companyId: undefined,
        recordId: undefined,
      },
    });
  });

  test("logs updates for RecordModule-linked notes", async () => {
    mockNote.updateMany.mockResolvedValue({ count: 1 });
    mockNote.findUnique.mockResolvedValue({
      id: "note_1",
      title: "Project context",
      recordId: "record_1",
    } as never);

    await NotesService.updateNote("note_1", {
      title: "Project context",
      organizationId: "org_1",
      memberId: "member_1",
      canUpdateAny: true,
    });

    expect(mockRecordActivity.noteUpdated).toHaveBeenCalledWith({
      organizationId: "org_1",
      memberId: "member_1",
      recordId: "record_1",
      noteTitle: "Project context",
    });
  });
});

describe("NotesService RecordModule activity", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRecord.findFirst.mockResolvedValue({ id: "record_1" } as never);
  });

  test("logs creation of a RecordModule-linked note", async () => {
    mockNote.create.mockResolvedValue({
      id: "note_1",
      title: "Project context",
      recordId: "record_1",
    } as never);

    await NotesService.createNote({
      title: "Project context",
      content: "Details",
      recordId: "record_1",
      organizationId: "org_1",
      createdById: "member_1",
    });

    expect(mockRecordActivity.noteCreated).toHaveBeenCalledWith({
      organizationId: "org_1",
      memberId: "member_1",
      recordId: "record_1",
      noteTitle: "Project context",
    });
  });

  test("logs deletion of a RecordModule-linked note", async () => {
    mockNote.findFirst.mockResolvedValue({
      id: "note_1",
      title: "Project context",
      recordId: "record_1",
    } as never);
    mockNote.deleteMany.mockResolvedValue({ count: 1 });

    await NotesService.deleteNote({
      noteId: "note_1",
      organizationId: "org_1",
      memberId: "member_1",
      canDeleteAny: true,
    });

    expect(mockRecordActivity.noteDeleted).toHaveBeenCalledWith({
      organizationId: "org_1",
      memberId: "member_1",
      recordId: "record_1",
      noteTitle: "Project context",
    });
  });
});
