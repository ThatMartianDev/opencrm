import { ModuleFeature } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db/client";

const noteInclude = {
  createdBy: {
    include: {
      user: { select: { id: true, name: true, avatarUrl: true } },
    },
  },
  deal: { select: { id: true, title: true } },
  contact: { select: { id: true, name: true } },
  company: { select: { id: true, name: true } },
} as const;

export const NotesService = {
  async getAllNotes(organizationId: string) {
    return prisma.note.findMany({
      where: { organizationId },
      include: noteInclude,
      orderBy: { createdAt: "desc" },
    });
  },

  async getNotesForDeal(dealId: string, organizationId: string) {
    return prisma.note.findMany({
      where: { dealId, organizationId },
      include: noteInclude,
      orderBy: { createdAt: "desc" },
    });
  },

  async getNotesForContact(contactId: string, organizationId: string) {
    return prisma.note.findMany({
      where: { contactId, organizationId },
      include: noteInclude,
      orderBy: { createdAt: "desc" },
    });
  },

  async getNotesForCompany(companyId: string, organizationId: string) {
    return prisma.note.findMany({
      where: { companyId, organizationId },
      include: noteInclude,
      orderBy: { createdAt: "desc" },
    });
  },

  async getNotesForRecord(recordId: string, organizationId: string) {
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

    return prisma.note.findMany({
      where: { recordId, organizationId },
      include: noteInclude,
      orderBy: { createdAt: "desc" },
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
      const record = await prisma.recordItem.findFirst({
        where: {
          id: data.recordId,
          organizationId: data.organizationId,
          archivedAt: null,
          module: {
            archivedAt: null,
            features: { has: ModuleFeature.NOTES },
          },
        },
        select: { id: true },
      });
      if (!record) throw new Error("Record not found or notes are not enabled.");
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
    data: { title?: string; content?: string; organizationId: string },
  ) {
    return prisma.note.update({
      where: { id: noteId, organizationId: data.organizationId },
      data,
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
