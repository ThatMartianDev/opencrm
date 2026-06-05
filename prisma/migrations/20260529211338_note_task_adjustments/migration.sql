-- AlterTable
ALTER TABLE "notes" ADD COLUMN     "title" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "tasks" ADD COLUMN     "companyId" TEXT,
ADD COLUMN     "contactId" TEXT;

-- CreateIndex
CREATE INDEX "tasks_organizationId_contactId_idx" ON "tasks"("organizationId", "contactId");

-- CreateIndex
CREATE INDEX "tasks_organizationId_companyId_idx" ON "tasks"("organizationId", "companyId");

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
