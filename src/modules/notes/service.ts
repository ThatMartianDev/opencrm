import { Prisma } from "@/generated/prisma/client";
import { ModuleFeature } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db/client";
import {
  createPaginatedResult,
  type PaginationQuery,
} from "@/lib/pagination";

const noteInclude = {
  createdBy: {
    include: {
      user: { select: { id: true, name: true, avatarUrl: true } },
    },
  },
  deal: { select: { id: true, title: true } },
  contact: { select: { id: true, name: true } },
  company: { select: { id: true, name: true } },
  record: {
    select: {
      id: true,
      displayName: true,
      module: {
        select: { id: true, key: true, name: true, icon: true, accentColor: true },
      },
    },
  },
} as const;

const assertRecordNotesEnabled = async (
  recordId: string,
  organizationId: string,
) => {
  const record = await prisma.recordItem.findFirst({
    where: {
      id: recordId,
      organizationId,
      archivedAt: null,
      module: {
        archivedAt: null,
        features: { has: ModuleFeature.NOTES },
      },
    },
    select: { id: true },
  });
  if (!record) throw new Error("Record not found or notes are not enabled.");
};

const getNotesPage = async (
  where: Prisma.NoteWhereInput,
  pagination: PaginationQuery,
) => {
  const rows = await prisma.note.findMany({
    where,
    include: noteInclude,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    skip: (pagination.page - 1) * pagination.pageSize,
    take: pagination.pageSize + 1,
  });

  return createPaginatedResult(rows, pagination);
};

export const NotesService = {
  async getAllNotes(organizationId: string, pagination: PaginationQuery) {
    return getNotesPage({ organizationId }, pagination);
  },

  async getNotesForDeal(
    dealId: string,
    organizationId: string,
    pagination: PaginationQuery,
  ) {
    return getNotesPage({ dealId, organizationId }, pagination);
  },

  async getNotesForContact(
    contactId: string,
    organizationId: string,
    pagination: PaginationQuery,
  ) {
    return getNotesPage({ contactId, organizationId }, pagination);
  },

  async getNotesForCompany(
    companyId: string,
    organizationId: string,
    pagination: PaginationQuery,
  ) {
    return getNotesPage({ companyId, organizationId }, pagination);
  },

  async getNotesForRecord(
    recordId: string,
    organizationId: string,
    pagination: PaginationQuery,
  ) {
    const record = await prisma.recordItem.findFirst({
      where: {
        id: recordId,
        organizationId,
        archivedAt: null,
        module: {
          archivedAt: null,
          features: { has: ModuleFeature.NOTES },
        },
      },
      select: { id: true },
    });
    if (!record) throw new Error("Record not found or notes are not enabled.");

    return getNotesPage({ recordId, organizationId }, pagination);
  },

  async getNoteById(noteId: string, organizationId: string) {
    return prisma.note.findFirst({
      where: { id: noteId, organizationId },
      include: noteInclude,
    });
  },

  async createNote(data: {
    title?: string;
    content: string;
    dealId?: string;
    contactId?: string;
    companyId?: string;
    recordId?: string;
    organizationId: string;
    createdById: string;
  }) {
    if (data.recordId) {
      await assertRecordNotesEnabled(data.recordId, data.organizationId);
    }

    return prisma.note.create({
      data: {
        title: data.title || "",
        content: data.content,
        dealId: data.dealId,
        contactId: data.contactId,
        companyId: data.companyId,
        recordId: data.recordId,
        organizationId: data.organizationId,
        createdById: data.createdById,
      },
    });
  },

  async updateNote(
    noteId: string,
    data: {
      title?: string;
      content?: string;
      dealId?: string | null;
      contactId?: string | null;
      companyId?: string | null;
      recordId?: string | null;
      organizationId: string;
    },
  ) {
    if (data.recordId) {
      await assertRecordNotesEnabled(data.recordId, data.organizationId);
    }

    return prisma.note.update({
      where: { id: noteId, organizationId: data.organizationId },
      data: {
        title: data.title,
        content: data.content,
        dealId: data.dealId,
        contactId: data.contactId,
        companyId: data.companyId,
        recordId: data.recordId,
      },
    });
  },

  async deleteNote(data: {
    noteId: string;
    organizationId: string;
    memberId: string;
    canDeleteAny: boolean;
  }) {
    const result = await prisma.note.deleteMany({
      where: {
        id: data.noteId,
        organizationId: data.organizationId,
        ...(data.canDeleteAny ? {} : { createdById: data.memberId }),
      },
    });

    if (result.count > 0) {
      return { success: true };
    }

    const noteExists = await prisma.note.findFirst({
      where: {
        id: data.noteId,
        organizationId: data.organizationId,
      },
      select: { id: true },
    });

    if (noteExists) {
      throw new Error("You can only delete notes you created.");
    }

    throw new Error("Note not found.");
  },
};
