import "server-only";
import { z } from "zod";

import { ModuleFeature } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db/client";
import { assertCrmLinksBelongToOrganization } from "@/lib/dal/crm-links";
import { getSupabaseAdmin, STORAGE_BUCKET } from "@/lib/supabase/client";
import { RecordActivityService } from "@/modules/RecordModule/service/record.activity.service";
import type {
  CreateFolderInput,
  CreateExternalFileInput,
  EntityScope,
} from "./types";

const entityScopeSchema = z.strictObject({
  dealId: z.string().min(1).optional(),
  contactId: z.string().min(1).optional(),
  companyId: z.string().min(1).optional(),
  recordId: z.string().min(1).optional(),
});

const assertRecordFilesEnabled = async (
  organizationId: string,
  scope: EntityScope,
) => {
  if (!scope.recordId) return;

  const record = await prisma.recordItem.findFirst({
    where: {
      id: scope.recordId,
      organizationId,
      archivedAt: null,
      module: {
        archivedAt: null,
        features: { has: ModuleFeature.FILES },
      },
    },
    select: { id: true },
  });
  if (!record) throw new Error("Record not found or files are not enabled.");
};

const assertFileScope = async (organizationId: string, scope: EntityScope) => {
  await Promise.all([
    assertCrmLinksBelongToOrganization(organizationId, scope),
    assertRecordFilesEnabled(organizationId, scope),
  ]);
};

const assertParentFolderMatchesScope = async (
  organizationId: string,
  parentId: string | null | undefined,
  scope: EntityScope,
) => {
  if (!parentId) return;

  const parent = await prisma.file.findFirst({
    where: {
      id: parentId,
      organizationId,
      type: "FOLDER",
      dealId: scope.dealId ?? null,
      contactId: scope.contactId ?? null,
      companyId: scope.companyId ?? null,
      recordId: scope.recordId ?? null,
    },
    select: { id: true },
  });
  if (!parent) throw new Error("Invalid parent folder for this file scope");
};

export const FilesService = {
  /**
   * Search files by name across the entire entity scope (ignores folder nesting).
   */
  async searchFiles(organizationId: string, scope: EntityScope, query: string) {
    scope = entityScopeSchema.parse(scope);
    query = z.string().parse(query);
    await assertFileScope(organizationId, scope);
    return prisma.file.findMany({
      where: {
        ...scope,
        organizationId,
        name: { contains: query, mode: "insensitive" },
      },
      orderBy: [{ type: "asc" }, { name: "asc" }],
    });
  },

  /**
   * List files/folders at a given level (parentId=null for root).
   */
  async listFiles(
    organizationId: string,
    scope: EntityScope,
    parentId: string | null,
  ) {
    scope = entityScopeSchema.parse(scope);
    parentId = z.string().min(1).nullable().parse(parentId);
    await assertFileScope(organizationId, scope);
    await assertParentFolderMatchesScope(organizationId, parentId, scope);
    return prisma.file.findMany({
      where: {
        ...scope,
        organizationId,
        parentId: parentId ?? null,
      },
      orderBy: [{ type: "asc" }, { name: "asc" }], // Folders first, then alphabetical
    });
  },

  /**
   * Get a single file/folder by ID (with children for breadcrumb/tree).
   */
  async getById(fileId: string, organizationId: string) {
    return prisma.file.findFirst({
      where: { id: fileId, organizationId },
      include: { children: { orderBy: [{ type: "asc" }, { name: "asc" }] } },
    });
  },

  /**
   * Create a folder.
   */
  async createFolder(
    organizationId: string,
    memberId: string,
    input: CreateFolderInput,
  ) {
    await assertFileScope(organizationId, input);
    await assertParentFolderMatchesScope(organizationId, input.parentId, input);

    return prisma.file.create({
      data: {
        organizationId,
        name: input.name,
        type: "FOLDER",
        source: "SUPABASE",
        parentId: input.parentId ?? null,
        dealId: input.dealId ?? null,
        contactId: input.contactId ?? null,
        companyId: input.companyId ?? null,
        recordId: input.recordId ?? null,
        uploadedById: memberId,
      },
    });
  },

  /**
   * Upload a file to Supabase Storage and create the DB record.
   */
  async uploadFile(
    organizationId: string,
    memberId: string,
    file: File,
    scope: EntityScope,
    parentId: string | null,
  ) {
    await assertFileScope(organizationId, scope);
    await assertParentFolderMatchesScope(organizationId, parentId, scope);

    // Build the storage path
    const entityType = scope.dealId
      ? "deals"
      : scope.contactId
        ? "contacts"
        : scope.companyId
          ? "companies"
          : scope.recordId
            ? "records"
            : "general";
    const entityId =
      scope.dealId ??
      scope.contactId ??
      scope.companyId ??
      scope.recordId ??
      "shared";
    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storagePath = `${organizationId}/${entityType}/${entityId}/${timestamp}_${sanitizedName}`;

    // Upload to Supabase Storage
    const { error } = await getSupabaseAdmin()
      .storage.from(STORAGE_BUCKET)
      .upload(storagePath, file, {
        contentType: file.type,
        upsert: false,
      });

    if (error) {
      throw new Error(`Storage upload failed: ${error.message}`);
    }

    // Create DB record
    const uploadedFile = await prisma.file.create({
      data: {
        organizationId,
        name: file.name,
        type: "FILE",
        source: "SUPABASE",
        storagePath,
        fileSize: file.size,
        mimeType: file.type,
        parentId: parentId ?? null,
        dealId: scope.dealId ?? null,
        contactId: scope.contactId ?? null,
        companyId: scope.companyId ?? null,
        recordId: scope.recordId ?? null,
        uploadedById: memberId,
      },
    });
    if (uploadedFile.recordId) {
      await RecordActivityService.fileAdded({
        organizationId,
        memberId,
        recordId: uploadedFile.recordId,
        fileName: uploadedFile.name,
      });
    }
    return uploadedFile;
  },

  /**
   * Add an external file reference (Google Drive, Dropbox, etc.)
   */
  async addExternalFile(
    organizationId: string,
    memberId: string,
    input: CreateExternalFileInput,
  ) {
    await assertFileScope(organizationId, input);
    await assertParentFolderMatchesScope(organizationId, input.parentId, input);

    const externalFile = await prisma.file.create({
      data: {
        organizationId,
        name: input.name,
        type: "FILE",
        source: input.source,
        externalUrl: input.externalUrl,
        externalId: input.externalId ?? null,
        mimeType: input.mimeType ?? null,
        fileSize: input.fileSize ?? null,
        parentId: input.parentId ?? null,
        dealId: input.dealId ?? null,
        contactId: input.contactId ?? null,
        companyId: input.companyId ?? null,
        recordId: input.recordId ?? null,
        uploadedById: memberId,
      },
    });
    if (externalFile.recordId) {
      await RecordActivityService.fileAdded({
        organizationId,
        memberId,
        recordId: externalFile.recordId,
        fileName: externalFile.name,
      });
    }
    return externalFile;
  },

  /**
   * Get a signed download URL for a Supabase-hosted file.
   */
  async getDownloadUrl(fileId: string, organizationId: string) {
    const file = await prisma.file.findFirst({
      where: { id: fileId, organizationId, type: "FILE" },
    });

    if (!file) throw new Error("File not found");

    if (file.source !== "SUPABASE" || !file.storagePath) {
      // External file — return the external URL directly
      return file.externalUrl;
    }

    const { data, error } = await getSupabaseAdmin()
      .storage.from(STORAGE_BUCKET)
      .createSignedUrl(file.storagePath, 3600, { download: file.name }); // 1 hour expiry, forces download

    if (error)
      throw new Error(`Failed to generate download URL: ${error.message}`);
    return data.signedUrl;
  },

  /**
   * Get signed URLs for multiple image files (for thumbnails).
   */
  async getImageUrls(
    fileIds: string[],
    organizationId: string,
  ): Promise<Record<string, string>> {
    const files = await prisma.file.findMany({
      where: {
        id: { in: fileIds },
        organizationId,
        type: "FILE",
      },
      select: { id: true, storagePath: true, source: true, externalUrl: true },
    });

    const urls: Record<string, string> = {};

    for (const file of files) {
      if (file.source !== "SUPABASE" || !file.storagePath) {
        if (file.externalUrl) urls[file.id] = file.externalUrl;
        continue;
      }
      const { data } = await getSupabaseAdmin()
        .storage.from(STORAGE_BUCKET)
        .createSignedUrl(file.storagePath, 3600);
      if (data?.signedUrl) urls[file.id] = data.signedUrl;
    }

    return urls;
  },

  /**
   * Rename a file or folder.
   */
  async rename(fileId: string, organizationId: string, newName: string) {
    return prisma.file.update({
      where: { id: fileId, organizationId },
      data: { name: newName },
    });
  },

  /**
   * Delete a file/folder. For folders, recursively deletes children.
   * For Supabase files, also removes from storage.
   */
  async delete(data: {
    fileId: string;
    organizationId: string;
    memberId: string;
    canDeleteAny: boolean;
  }) {
    const file = await prisma.file.findFirst({
      where: { id: data.fileId, organizationId: data.organizationId },
    });

    if (!file) throw new Error("File not found.");
    if (!data.canDeleteAny && file.uploadedById !== data.memberId) {
      throw new Error("You can only delete files you uploaded.");
    }

    if (file.type === "FOLDER") {
      // Recursively delete children (folder owner can delete all contents)
      const children = await prisma.file.findMany({
        where: { parentId: data.fileId, organizationId: data.organizationId },
      });
      for (const child of children) {
        await this.delete({ ...data, fileId: child.id, canDeleteAny: true });
      }
    }

    // Delete from storage if it's a Supabase file
    if (file.source === "SUPABASE" && file.storagePath) {
      await getSupabaseAdmin()
        .storage.from(STORAGE_BUCKET)
        .remove([file.storagePath]);
    }

    // Delete the DB record
    const deletedFile = await prisma.file.delete({
      where: { id: data.fileId },
    });
    if (deletedFile.type === "FILE" && deletedFile.recordId) {
      await RecordActivityService.fileDeleted({
        organizationId: data.organizationId,
        memberId: data.memberId,
        recordId: deletedFile.recordId,
        fileName: deletedFile.name,
      });
    }
    return deletedFile;
  },

  /**
   * Build breadcrumb path from a file/folder to root.
   */
  async getBreadcrumbs(
    fileId: string,
    organizationId: string,
  ): Promise<{ id: string; name: string }[]> {
    const breadcrumbs: { id: string; name: string }[] = [];
    let currentId: string | null = fileId;

    while (currentId) {
      const record: {
        id: string;
        name: string;
        parentId: string | null;
      } | null = await prisma.file.findFirst({
        where: { id: currentId, organizationId },
        select: { id: true, name: true, parentId: true },
      });
      if (!record) break;
      breadcrumbs.unshift({ id: record.id, name: record.name });
      currentId = record.parentId;
    }

    return breadcrumbs;
  },
};
