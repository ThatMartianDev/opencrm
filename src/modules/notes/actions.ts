"use server";

import { getSessionClaims } from "@/lib/auth/session";
import { createQueryContext } from "@/lib/dal/scoped-query";
import {
    parsePaginationInput,
    type PaginationInput,
} from "@/lib/pagination";
import { NotesService } from "./service";

export const getNotes = async (query?: PaginationInput) => {
    const session = await getSessionClaims();
    const ctx = createQueryContext(session);
    ctx.assertCan("notes.read");

    return NotesService.getAllNotes(
        session.organizationId,
        parsePaginationInput(query),
    );
};

export const getNotesForDeal = async (dealId: string, query?: PaginationInput) => {
    const session = await getSessionClaims();
    const ctx = createQueryContext(session);
    ctx.assertCan("notes.read");

    return NotesService.getNotesForDeal(
        dealId,
        session.organizationId,
        parsePaginationInput(query),
    );
};

export const getNotesForContact = async (
    contactId: string,
    query?: PaginationInput,
) => {
    const session = await getSessionClaims();
    const ctx = createQueryContext(session);
    ctx.assertCan("notes.read");

    return NotesService.getNotesForContact(
        contactId,
        session.organizationId,
        parsePaginationInput(query),
    );
};

export const getNotesForCompany = async (
    companyId: string,
    query?: PaginationInput,
) => {
    const session = await getSessionClaims();
    const ctx = createQueryContext(session);
    ctx.assertCan("notes.read");

    return NotesService.getNotesForCompany(
        companyId,
        session.organizationId,
        parsePaginationInput(query),
    );
};

export const getNotesForRecord = async (
    recordId: string,
    query?: PaginationInput,
) => {
    const session = await getSessionClaims();
    const ctx = createQueryContext(session);
    ctx.assertCan("notes.read");

    return NotesService.getNotesForRecord(
        recordId,
        session.organizationId,
        parsePaginationInput(query),
    );
};

export const getNoteById = async (noteId: string) => {
    const session = await getSessionClaims();
    const ctx = createQueryContext(session);
    ctx.assertCan("notes.read");

    return NotesService.getNoteById(noteId, session.organizationId);
};

export const createNote = async (data: {
    title?: string;
    content: string;
    dealId?: string;
    contactId?: string;
    companyId?: string;
    recordId?: string;
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
        recordId: data.recordId,
        organizationId: session.organizationId,
        createdById: session.memberId,
    });
};

export const updateNote = async (
    noteId: string,
    data: {
        title?: string;
        content?: string;
        dealId?: string | null;
        contactId?: string | null;
        companyId?: string | null;
        recordId?: string | null;
    },
) => {
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
