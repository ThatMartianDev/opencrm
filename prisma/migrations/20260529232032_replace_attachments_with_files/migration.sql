/*
  Warnings:

  - You are about to drop the `attachments` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "FileType" AS ENUM ('FILE', 'FOLDER');

-- CreateEnum
CREATE TYPE "FileSource" AS ENUM ('SUPABASE', 'GOOGLE_DRIVE', 'DROPBOX', 'ONEDRIVE');

-- DropForeignKey
ALTER TABLE "attachments" DROP CONSTRAINT "attachments_companyId_fkey";

-- DropForeignKey
ALTER TABLE "attachments" DROP CONSTRAINT "attachments_contactId_fkey";

-- DropForeignKey
ALTER TABLE "attachments" DROP CONSTRAINT "attachments_dealId_fkey";

-- DropTable
DROP TABLE "attachments";

-- CreateTable
CREATE TABLE "files" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "FileType" NOT NULL DEFAULT 'FILE',
    "source" "FileSource" NOT NULL DEFAULT 'SUPABASE',
    "storagePath" TEXT,
    "fileSize" INTEGER,
    "mimeType" TEXT,
    "externalUrl" TEXT,
    "externalId" TEXT,
    "parentId" TEXT,
    "dealId" TEXT,
    "contactId" TEXT,
    "companyId" TEXT,
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "files_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "files_parentId_idx" ON "files"("parentId");

-- CreateIndex
CREATE INDEX "files_organizationId_dealId_idx" ON "files"("organizationId", "dealId");

-- CreateIndex
CREATE INDEX "files_organizationId_contactId_idx" ON "files"("organizationId", "contactId");

-- CreateIndex
CREATE INDEX "files_organizationId_companyId_idx" ON "files"("organizationId", "companyId");

-- AddForeignKey
ALTER TABLE "files" ADD CONSTRAINT "files_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "files" ADD CONSTRAINT "files_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "files" ADD CONSTRAINT "files_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "deals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "files" ADD CONSTRAINT "files_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "files" ADD CONSTRAINT "files_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
