/*
  Warnings:

  - You are about to drop the `activities` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "ActivitySource" AS ENUM ('MANUAL', 'SYSTEM', 'AUTOMATION', 'INTEGRATION', 'AI');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('CALL', 'MESSAGE', 'EMAIL', 'MEETING', 'NOTE', 'TASK', 'STATUS_CHANGE', 'ASSIGNMENT', 'FILE', 'SYSTEM');

-- CreateEnum
CREATE TYPE "ActivityChannel" AS ENUM ('PHONE', 'WHATSAPP', 'GMAIL', 'OUTLOOK', 'MANUAL');

-- CreateEnum
CREATE TYPE "ActivityOutcome" AS ENUM ('NO_ANSWER', 'VOICEMAIL', 'ANSWERED', 'DELIVERED', 'OPENED', 'READ', 'REPLIED', 'SCHEDULED', 'COMPLETED', 'CANCELED', 'RESCHEDULED', 'FOLLOWUP_REQUIRED', 'SUCCESS', 'FAILED');

-- DropForeignKey
ALTER TABLE "activities" DROP CONSTRAINT "activities_customerId_fkey";

-- DropForeignKey
ALTER TABLE "activities" DROP CONSTRAINT "activities_leadId_fkey";

-- DropForeignKey
ALTER TABLE "activities" DROP CONSTRAINT "activities_memberId_fkey";

-- DropForeignKey
ALTER TABLE "activities" DROP CONSTRAINT "activities_requestId_fkey";

-- DropTable
DROP TABLE "activities";

-- CreateTable
CREATE TABLE "Activity" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "memberId" TEXT,
    "source" "ActivitySource" NOT NULL DEFAULT 'MANUAL',
    "activityType" "ActivityType" NOT NULL,
    "channel" "ActivityChannel",
    "outcome" "ActivityOutcome",
    "title" TEXT NOT NULL,
    "description" TEXT,
    "metadata" JSONB,
    "leadId" TEXT,
    "customerId" TEXT,
    "requestId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Activity_organizationId_idx" ON "Activity"("organizationId");

-- CreateIndex
CREATE INDEX "Activity_memberId_idx" ON "Activity"("memberId");

-- CreateIndex
CREATE INDEX "Activity_leadId_idx" ON "Activity"("leadId");

-- CreateIndex
CREATE INDEX "Activity_customerId_idx" ON "Activity"("customerId");

-- CreateIndex
CREATE INDEX "Activity_requestId_idx" ON "Activity"("requestId");

-- CreateIndex
CREATE INDEX "Activity_activityType_idx" ON "Activity"("activityType");

-- CreateIndex
CREATE INDEX "Activity_channel_idx" ON "Activity"("channel");

-- CreateIndex
CREATE INDEX "Activity_outcome_idx" ON "Activity"("outcome");

-- CreateIndex
CREATE INDEX "Activity_source_idx" ON "Activity"("source");

-- CreateIndex
CREATE INDEX "Activity_createdAt_idx" ON "Activity"("createdAt");

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
