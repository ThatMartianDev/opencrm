import { prisma } from "@/lib/db/client";
import { NotesService } from "@/modules/notes/service";

jest.mock("@/lib/db/client", () => ({
  prisma: {
    note: {
      deleteMany: jest.fn(),
      findFirst: jest.fn(),
    },
  },
}));

const mockNote = jest.mocked(prisma.note);

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
    expect(mockNote.findFirst).not.toHaveBeenCalled();
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
    expect(mockNote.findFirst).not.toHaveBeenCalled();
  });

  test("tells a member when the note exists but they are not allowed to delete it", async () => {
    mockNote.deleteMany.mockResolvedValue({ count: 0 });
    mockNote.findFirst.mockResolvedValue({ id: "note_1" });

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
      select: { id: true },
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
      select: { id: true },
    });
  });
});
