-- CreateEnum
CREATE TYPE "ModuleFeature" AS ENUM ('NOTES', 'TASKS', 'FILES', 'EMAILS', 'CALENDAR');

-- CreateEnum
CREATE TYPE "RecordViewType" AS ENUM ('LIST', 'KANBAN', 'CALENDAR', 'GALLERY', 'GANTT');

-- CreateEnum
CREATE TYPE "RecordFieldType" AS ENUM ('TEXT', 'LONG_TEXT', 'NUMBER', 'CURRENCY', 'PERCENT', 'BOOLEAN', 'DATE', 'DATETIME', 'EMAIL', 'PHONE', 'URL', 'SELECT', 'MULTI_SELECT', 'RELATIONSHIP', 'USER', 'FILE');

-- AlterTable
ALTER TABLE "files" ADD COLUMN     "recordId" TEXT;

-- AlterTable
ALTER TABLE "notes" ADD COLUMN     "recordId" TEXT;

-- AlterTable
ALTER TABLE "tasks" ADD COLUMN     "recordId" TEXT;

-- CreateTable
CREATE TABLE "RecordModule" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "pluralName" TEXT,
    "icon" TEXT NOT NULL,
    "accentColor" TEXT,
    "features" "ModuleFeature"[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "RecordModule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecordModuleView" (
    "id" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "RecordViewType" NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "config" JSONB,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecordModuleView_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecordField" (
    "id" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" "RecordFieldType" NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "unique" BOOLEAN NOT NULL DEFAULT false,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL DEFAULT 0,
    "config" JSONB,
    "defaultValue" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecordField_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecordItem" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "RecordItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecordFieldValue" (
    "id" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "fieldId" TEXT NOT NULL,
    "value" JSONB NOT NULL,

    CONSTRAINT "RecordFieldValue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RecordModule_organizationId_idx" ON "RecordModule"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "RecordModule_organizationId_key_key" ON "RecordModule"("organizationId", "key");

-- CreateIndex
CREATE INDEX "RecordModuleView_moduleId_idx" ON "RecordModuleView"("moduleId");

-- CreateIndex
CREATE INDEX "RecordField_moduleId_idx" ON "RecordField"("moduleId");

-- CreateIndex
CREATE INDEX "RecordField_moduleId_position_idx" ON "RecordField"("moduleId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "RecordField_moduleId_key_key" ON "RecordField"("moduleId", "key");

-- CreateIndex
CREATE INDEX "RecordItem_organizationId_idx" ON "RecordItem"("organizationId");

-- CreateIndex
CREATE INDEX "RecordItem_moduleId_idx" ON "RecordItem"("moduleId");

-- CreateIndex
CREATE INDEX "RecordItem_organizationId_moduleId_idx" ON "RecordItem"("organizationId", "moduleId");

-- CreateIndex
CREATE INDEX "RecordFieldValue_recordId_idx" ON "RecordFieldValue"("recordId");

-- CreateIndex
CREATE INDEX "RecordFieldValue_fieldId_idx" ON "RecordFieldValue"("fieldId");

-- CreateIndex
CREATE UNIQUE INDEX "RecordFieldValue_recordId_fieldId_key" ON "RecordFieldValue"("recordId", "fieldId");

-- CreateIndex
CREATE INDEX "files_organizationId_recordId_idx" ON "files"("organizationId", "recordId");

-- CreateIndex
CREATE INDEX "notes_organizationId_recordId_idx" ON "notes"("organizationId", "recordId");

-- CreateIndex
CREATE INDEX "tasks_organizationId_recordId_idx" ON "tasks"("organizationId", "recordId");

-- AddForeignKey
ALTER TABLE "RecordModule" ADD CONSTRAINT "RecordModule_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecordModuleView" ADD CONSTRAINT "RecordModuleView_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "RecordModule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecordModuleView" ADD CONSTRAINT "RecordModuleView_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecordField" ADD CONSTRAINT "RecordField_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "RecordModule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecordItem" ADD CONSTRAINT "RecordItem_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "RecordModule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecordItem" ADD CONSTRAINT "RecordItem_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecordItem" ADD CONSTRAINT "RecordItem_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecordFieldValue" ADD CONSTRAINT "RecordFieldValue_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "RecordItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecordFieldValue" ADD CONSTRAINT "RecordFieldValue_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "RecordField"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "RecordItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notes" ADD CONSTRAINT "notes_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "RecordItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "files" ADD CONSTRAINT "files_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "RecordItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
