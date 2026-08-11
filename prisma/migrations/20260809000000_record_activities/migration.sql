-- AlterTable
ALTER TABLE "Activity" ADD COLUMN "recordId" TEXT;

-- CreateIndex
CREATE INDEX "Activity_recordId_idx" ON "Activity"("recordId");

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "RecordItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;