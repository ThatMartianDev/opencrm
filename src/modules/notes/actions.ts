"use server";

import { getSessionClaims } from "@/lib/auth/session";
import { createQueryContext } from "@/lib/dal/scoped-query";
import { NotesService } from "./service";

export const getNotes = async () => {
    const session = await getSessionClaims();
    const ctx = createQueryContext(session);
    ctx.assertCan("notes.read");

    return NotesService.getAllNotes(session.organizationId);
};

export const getNotesForDeal = async (dealId: string) => {
    const session = await getSessionClaims();
    const ctx = createQueryContext(session);
    ctx.assertCan("notes.read");

    return NotesService.getNotesForDeal(dealId, session.organizationId);
};

export const getNotesForContact = async (contactId: string) => {
    const session = await getSessionClaims();
    const ctx = createQueryContext(session);
    ctx.assertCan("notes.read");

    return NotesService.getNotesForContact(contactId, session.organizationId);
};

export const getNotesForCompany = async (companyId: string) => {
    const session = await getSessionClaims();
    const ctx = createQueryContext(session);
    ctx.assertCan("notes.read");

    return NotesService.getNotesForCompany(companyId, session.organizationId);
};

export const createNote = async (data: {
    title?: string;
    content: string;
    dealId?: string;
    contactId?: string;
    companyId?: string;
}) => {
    const session = await getSessionClaims();
    const ctx = createQueryContext(session);
    ctx.assertCan("notes.create");

    return NotesService.createNote({
        title: data.title,
        content: data.content,
        dealId: data.dealId,
        contactId: data.contactId,
        companyId: data.companyId,
        organizationId: session.organizationId,
        createdById: session.memberId,
    });
};

export const updateNote = async (noteId: string, data: { title?: string; content?: string }) => {
    const session = await getSessionClaims();
    const ctx = createQueryContext(session);
    ctx.assertCan("notes.update");

    return NotesService.updateNote(noteId, { ...data, organizationId: session.organizationId });
};

export const deleteNote = async (noteId: string) => {
  const session = await getSessionClaims();
  const ctx = createQueryContext(session);

  const canDeleteAny = ctx.can("notes.delete.any");

  if (!canDeleteAny) {
    ctx.assertCan("notes.delete.own");
  }

  return NotesService.deleteNote({
    noteId,
    organizationId: session.organizationId,
    memberId: session.memberId,
    canDeleteAny,
  });
};
