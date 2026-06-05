/*
  Warnings:

  - The values [CONVERSION] on the enum `ActivityType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `customerId` on the `Activity` table. All the data in the column will be lost.
  - You are about to drop the column `leadId` on the `Activity` table. All the data in the column will be lost.
  - You are about to drop the column `requestId` on the `Activity` table. All the data in the column will be lost.
  - You are about to drop the column `customerId` on the `attachments` table. All the data in the column will be lost.
  - You are about to drop the column `leadId` on the `attachments` table. All the data in the column will be lost.
  - You are about to drop the column `requestId` on the `attachments` table. All the data in the column will be lost.
  - You are about to drop the column `leadId` on the `follow_ups` table. All the data in the column will be lost.
  - You are about to drop the column `customerId` on the `notes` table. All the data in the column will be lost.
  - You are about to drop the column `leadId` on the `notes` table. All the data in the column will be lost.
  - You are about to drop the column `requestId` on the `notes` table. All the data in the column will be lost.
  - You are about to drop the column `customerId` on the `tag_assignments` table. All the data in the column will be lost.
  - You are about to drop the column `leadId` on the `tag_assignments` table. All the data in the column will be lost.
  - You are about to drop the column `leadId` on the `tasks` table. All the data in the column will be lost.
  - You are about to drop the column `requestId` on the `tasks` table. All the data in the column will be lost.
  - You are about to drop the `customers` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `leads` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `requests` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `dealId` to the `follow_ups` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "DealStage" AS ENUM ('PROSPECT', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST');

-- AlterEnum
BEGIN;
CREATE TYPE "ActivityType_new" AS ENUM ('CALL', 'MESSAGE', 'EMAIL', 'MEETING', 'NOTE', 'TASK', 'STATUS_CHANGE', 'STAGE_CHANGE', 'ASSIGNMENT', 'CREATION', 'DELETION', 'FILE', 'SYSTEM');
ALTER TABLE "Activity" ALTER COLUMN "activityType" TYPE "ActivityType_new" USING ("activityType"::text::"ActivityType_new");
ALTER TYPE "ActivityType" RENAME TO "ActivityType_old";
ALTER TYPE "ActivityType_new" RENAME TO "ActivityType";
DROP TYPE "public"."ActivityType_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "Activity" DROP CONSTRAINT "Activity_customerId_fkey";

-- DropForeignKey
ALTER TABLE "Activity" DROP CONSTRAINT "Activity_leadId_fkey";

-- DropForeignKey
ALTER TABLE "Activity" DROP CONSTRAINT "Activity_requestId_fkey";

-- DropForeignKey
ALTER TABLE "attachments" DROP CONSTRAINT "attachments_customerId_fkey";

-- DropForeignKey
ALTER TABLE "attachments" DROP CONSTRAINT "attachments_leadId_fkey";

-- DropForeignKey
ALTER TABLE "attachments" DROP CONSTRAINT "attachments_requestId_fkey";

-- DropForeignKey
ALTER TABLE "customers" DROP CONSTRAINT "customers_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "follow_ups" DROP CONSTRAINT "follow_ups_leadId_fkey";

-- DropForeignKey
ALTER TABLE "leads" DROP CONSTRAINT "leads_assignedToId_fkey";

-- DropForeignKey
ALTER TABLE "leads" DROP CONSTRAINT "leads_customerId_fkey";

-- DropForeignKey
ALTER TABLE "leads" DROP CONSTRAINT "leads_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "requests" DROP CONSTRAINT "requests_assignedToId_fkey";

-- DropForeignKey
ALTER TABLE "requests" DROP CONSTRAINT "requests_customerId_fkey";

-- DropForeignKey
ALTER TABLE "requests" DROP CONSTRAINT "requests_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "tag_assignments" DROP CONSTRAINT "tag_assignments_customerId_fkey";

-- DropForeignKey
ALTER TABLE "tag_assignments" DROP CONSTRAINT "tag_assignments_leadId_fkey";

-- DropForeignKey
ALTER TABLE "tasks" DROP CONSTRAINT "tasks_leadId_fkey";

-- DropForeignKey
ALTER TABLE "tasks" DROP CONSTRAINT "tasks_requestId_fkey";

-- DropIndex
DROP INDEX "Activity_customerId_idx";

-- DropIndex
DROP INDEX "Activity_leadId_idx";

-- DropIndex
DROP INDEX "Activity_requestId_idx";

-- DropIndex
DROP INDEX "notes_organizationId_customerId_idx";

-- DropIndex
DROP INDEX "notes_organizationId_leadId_idx";

-- AlterTable
ALTER TABLE "Activity" DROP COLUMN "customerId",
DROP COLUMN "leadId",
DROP COLUMN "requestId",
ADD COLUMN     "companyId" TEXT,
ADD COLUMN     "contactId" TEXT,
ADD COLUMN     "dealId" TEXT;

-- AlterTable
ALTER TABLE "attachments" DROP COLUMN "customerId",
DROP COLUMN "leadId",
DROP COLUMN "requestId",
ADD COLUMN     "companyId" TEXT,
ADD COLUMN     "contactId" TEXT,
ADD COLUMN     "dealId" TEXT;

-- AlterTable
ALTER TABLE "follow_ups" DROP COLUMN "leadId",
ADD COLUMN     "dealId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "notes" DROP COLUMN "customerId",
DROP COLUMN "leadId",
DROP COLUMN "requestId",
ADD COLUMN     "companyId" TEXT,
ADD COLUMN     "contactId" TEXT,
ADD COLUMN     "dealId" TEXT;

-- AlterTable
ALTER TABLE "tag_assignments" DROP COLUMN "customerId",
DROP COLUMN "leadId",
ADD COLUMN     "companyId" TEXT,
ADD COLUMN     "contactId" TEXT,
ADD COLUMN     "dealId" TEXT;

-- AlterTable
ALTER TABLE "tasks" DROP COLUMN "leadId",
DROP COLUMN "requestId",
ADD COLUMN     "dealId" TEXT;

-- DropTable
DROP TABLE "customers";

-- DropTable
DROP TABLE "leads";

-- DropTable
DROP TABLE "requests";

-- DropEnum
DROP TYPE "LeadStage";

-- DropEnum
DROP TYPE "RequestStatus";

-- CreateTable
CREATE TABLE "companies" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "website" TEXT,
    "industry" TEXT,
    "size" TEXT,
    "address" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contacts" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "jobTitle" TEXT,
    "source" TEXT,
    "companyId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deals" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "value" DECIMAL(12,2),
    "currency" TEXT DEFAULT 'USD',
    "stage" "DealStage" NOT NULL DEFAULT 'PROSPECT',
    "status" TEXT,
    "source" TEXT,
    "category" TEXT,
    "expectedClose" TIMESTAMP(3),
    "wonAt" TIMESTAMP(3),
    "lostAt" TIMESTAMP(3),
    "lostReason" TEXT,
    "contactId" TEXT,
    "companyId" TEXT,
    "assignedToId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "deals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "companies_organizationId_idx" ON "companies"("organizationId");

-- CreateIndex
CREATE INDEX "companies_organizationId_name_idx" ON "companies"("organizationId", "name");

-- CreateIndex
CREATE INDEX "contacts_organizationId_idx" ON "contacts"("organizationId");

-- CreateIndex
CREATE INDEX "contacts_organizationId_companyId_idx" ON "contacts"("organizationId", "companyId");

-- CreateIndex
CREATE INDEX "contacts_organizationId_name_idx" ON "contacts"("organizationId", "name");

-- CreateIndex
CREATE INDEX "deals_organizationId_stage_idx" ON "deals"("organizationId", "stage");

-- CreateIndex
CREATE INDEX "deals_organizationId_assignedToId_idx" ON "deals"("organizationId", "assignedToId");

-- CreateIndex
CREATE INDEX "deals_organizationId_contactId_idx" ON "deals"("organizationId", "contactId");

-- CreateIndex
CREATE INDEX "deals_organizationId_companyId_idx" ON "deals"("organizationId", "companyId");

-- CreateIndex
CREATE INDEX "deals_organizationId_createdAt_idx" ON "deals"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "Activity_dealId_idx" ON "Activity"("dealId");

-- CreateIndex
CREATE INDEX "Activity_contactId_idx" ON "Activity"("contactId");

-- CreateIndex
CREATE INDEX "Activity_companyId_idx" ON "Activity"("companyId");

-- CreateIndex
CREATE INDEX "notes_organizationId_dealId_idx" ON "notes"("organizationId", "dealId");

-- CreateIndex
CREATE INDEX "notes_organizationId_contactId_idx" ON "notes"("organizationId", "contactId");

-- CreateIndex
CREATE INDEX "notes_organizationId_companyId_idx" ON "notes"("organizationId", "companyId");

-- AddForeignKey
ALTER TABLE "companies" ADD CONSTRAINT "companies_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deals" ADD CONSTRAINT "deals_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deals" ADD CONSTRAINT "deals_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deals" ADD CONSTRAINT "deals_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deals" ADD CONSTRAINT "deals_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "deals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "deals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "deals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tag_assignments" ADD CONSTRAINT "tag_assignments_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "deals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tag_assignments" ADD CONSTRAINT "tag_assignments_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tag_assignments" ADD CONSTRAINT "tag_assignments_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "deals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
