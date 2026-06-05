"use server";

import { FilesService } from "./service";
import { getSessionClaims } from "@/lib/auth/session";
import { createQueryContext } from "@/lib/dal/scoped-query";
import type { CreateFolderInput, CreateExternalFileInput, EntityScope } from "./types";

export async function listFiles(scope: EntityScope, parentId: string | null) {
  const session = await getSessionClaims();
  const ctx = createQueryContext(session);
  ctx.assertCan("files.read");

  return FilesService.listFiles(session.organizationId, scope, parentId);
}

export async function getFileById(fileId: string) {
  const session = await getSessionClaims();
  const ctx = createQueryContext(session);
  ctx.assertCan("files.read");

  return FilesService.getById(fileId, session.organizationId);
}

export async function createFolder(input: CreateFolderInput) {
  const session = await getSessionClaims();
  const ctx = createQueryContext(session);
  ctx.assertCan("files.create");

  return FilesService.createFolder(session.organizationId, session.memberId, input);
}

export async function addExternalFile(input: CreateExternalFileInput) {
  const session = await getSessionClaims();
  const ctx = createQueryContext(session);
  ctx.assertCan("files.create");

  return FilesService.addExternalFile(session.organizationId, session.memberId, input);
}

export async function getDownloadUrl(fileId: string) {
  const session = await getSessionClaims();
  const ctx = createQueryContext(session);
  ctx.assertCan("files.read");

  return FilesService.getDownloadUrl(fileId, session.organizationId);
}

export async function renameFile(fileId: string, newName: string) {
  const session = await getSessionClaims();
  const ctx = createQueryContext(session);
  ctx.assertCan("files.update");

  return FilesService.rename(fileId, session.organizationId, newName);
}

export async function deleteFile(fileId: string) {
  const session = await getSessionClaims();
  const ctx = createQueryContext(session);

  const canDeleteAny = ctx.can("files.delete.any");
  if (!canDeleteAny) ctx.assertCan("files.delete.own");

  return FilesService.delete({
    fileId,
    organizationId: session.organizationId,
    memberId: session.memberId,
    canDeleteAny,
  });
}

export async function getBreadcrumbs(fileId: string) {
  const session = await getSessionClaims();
  const ctx = createQueryContext(session);
  ctx.assertCan("files.read");

  return FilesService.getBreadcrumbs(fileId, session.organizationId);
}

export async function getImageUrls(fileIds: string[]) {
  const session = await getSessionClaims();
  const ctx = createQueryContext(session);
  ctx.assertCan("files.read");

  return FilesService.getImageUrls(fileIds, session.organizationId);
}

export async function searchFiles(scope: EntityScope, query: string) {
  const session = await getSessionClaims();
  const ctx = createQueryContext(session);
  ctx.assertCan("files.read");

  return FilesService.searchFiles(session.organizationId, scope, query);
}
