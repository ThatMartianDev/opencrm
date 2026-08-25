-- CreateEnum
CREATE TYPE "AiThreadStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AiRunStatus" AS ENUM ('PENDING', 'RUNNING', 'AWAITING_INPUT', 'AWAITING_APPROVAL', 'EXECUTING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AiRunActionStatus" AS ENUM ('PROPOSED', 'APPROVED', 'REJECTED', 'EXECUTING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "AiThread" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "feature" TEXT NOT NULL,
    "title" TEXT,
    "status" "AiThreadStatus" NOT NULL DEFAULT 'ACTIVE',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiThread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiRun" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "status" "AiRunStatus" NOT NULL DEFAULT 'PENDING',
    "input" JSONB NOT NULL,
    "context" JSONB NOT NULL DEFAULT '{}',
    "response" JSONB,
    "error" TEXT,
    "model" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiRunAction" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "actionKey" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "ordinal" INTEGER NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "AiRunActionStatus" NOT NULL DEFAULT 'PROPOSED',
    "idempotencyKey" TEXT NOT NULL,
    "result" JSONB,
    "error" TEXT,
    "approvedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiRunAction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AiThread_organizationId_memberId_feature_status_idx" ON "AiThread"("organizationId", "memberId", "feature", "status");

-- CreateIndex
CREATE INDEX "AiThread_memberId_updatedAt_idx" ON "AiThread"("memberId", "updatedAt");

-- CreateIndex
CREATE INDEX "AiRun_threadId_createdAt_idx" ON "AiRun"("threadId", "createdAt");

-- CreateIndex
CREATE INDEX "AiRun_status_createdAt_idx" ON "AiRun"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AiRunAction_idempotencyKey_key" ON "AiRunAction"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "AiRunAction_runId_actionKey_key" ON "AiRunAction"("runId", "actionKey");

-- CreateIndex
CREATE UNIQUE INDEX "AiRunAction_runId_ordinal_key" ON "AiRunAction"("runId", "ordinal");

-- CreateIndex
CREATE INDEX "AiRunAction_runId_status_idx" ON "AiRunAction"("runId", "status");

-- AddForeignKey
ALTER TABLE "AiThread" ADD CONSTRAINT "AiThread_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiThread" ADD CONSTRAINT "AiThread_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiRun" ADD CONSTRAINT "AiRun_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "AiThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiRunAction" ADD CONSTRAINT "AiRunAction_runId_fkey" FOREIGN KEY ("runId") REFERENCES "AiRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
