/*
  Warnings:

  - A unique constraint covering the columns `[organizationId,recipientId,type,dedupeKey]` on the table `notifications` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "data" JSONB,
ADD COLUMN     "dedupeKey" TEXT,
ADD COLUMN     "scheduledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "sentAt" TIMESTAMP(3),
ADD COLUMN     "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING';

-- CreateTable
CREATE TABLE "notification_deliveries" (
    "id" TEXT NOT NULL,
    "notificationId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3),
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notification_deliveries_notificationId_idx" ON "notification_deliveries"("notificationId");

-- CreateIndex
CREATE INDEX "notifications_organizationId_scheduledAt_status_idx" ON "notifications"("organizationId", "scheduledAt", "status");

-- CreateIndex
CREATE UNIQUE INDEX "notifications_organizationId_recipientId_type_dedupeKey_key" ON "notifications"("organizationId", "recipientId", "type", "dedupeKey");

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "notifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
