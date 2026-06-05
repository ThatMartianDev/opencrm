-- AlterTable
ALTER TABLE "accounts" ADD COLUMN     "syncToken" TEXT;

-- CreateTable
CREATE TABLE "calendar_events" (
    "id" TEXT NOT NULL,
    "googleEventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "calendarId" TEXT NOT NULL DEFAULT 'primary',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "location" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "allDay" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT,
    "htmlLink" TEXT,
    "attendees" JSONB,
    "dealId" TEXT,
    "contactId" TEXT,
    "companyId" TEXT,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calendar_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "calendar_events_organizationId_startTime_idx" ON "calendar_events"("organizationId", "startTime");

-- CreateIndex
CREATE INDEX "calendar_events_organizationId_dealId_idx" ON "calendar_events"("organizationId", "dealId");

-- CreateIndex
CREATE INDEX "calendar_events_organizationId_contactId_idx" ON "calendar_events"("organizationId", "contactId");

-- CreateIndex
CREATE INDEX "calendar_events_organizationId_companyId_idx" ON "calendar_events"("organizationId", "companyId");

-- CreateIndex
CREATE INDEX "calendar_events_userId_startTime_idx" ON "calendar_events"("userId", "startTime");

-- CreateIndex
CREATE UNIQUE INDEX "calendar_events_userId_googleEventId_key" ON "calendar_events"("userId", "googleEventId");

-- AddForeignKey
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "deals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
