import { FileSource, FileType } from "@/generated/prisma/enums";

export type FileRecord = {
  id: string;
  organizationId: string;
  name: string;
  type: FileType;
  source: FileSource;
  storagePath: string | null;
  fileSize: number | null;
  mimeType: string | null;
  externalUrl: string | null;
  externalId: string | null;
  parentId: string | null;
  dealId: string | null;
  contactId: string | null;
  companyId: string | null;
  uploadedById: string;
  createdAt: Date;
  updatedAt: Date;
};

export type FileWithChildren = FileRecord & {
  children: FileRecord[];
};

export type EntityScope = {
  dealId?: string;
  contactId?: string;
  companyId?: string;
};

export type CreateFolderInput = {
  name: string;
  parentId?: string;
} & EntityScope;

export type CreateExternalFileInput = {
  name: string;
  source: Exclude<FileSource, "SUPABASE">;
  externalUrl: string;
  externalId?: string;
  mimeType?: string;
  fileSize?: number;
  parentId?: string;
} & EntityScope;
