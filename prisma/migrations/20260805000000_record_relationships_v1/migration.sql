-- CreateTable
CREATE TABLE "RecordRelationshipDefinition" (
    "fieldId" TEXT NOT NULL,
    "targetModuleId" TEXT NOT NULL,

    CONSTRAINT "RecordRelationshipDefinition_pkey" PRIMARY KEY ("fieldId")
);

-- CreateTable
CREATE TABLE "RecordRelationship" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "fieldId" TEXT NOT NULL,
    "sourceRecordId" TEXT NOT NULL,
    "targetRecordId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecordRelationship_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RecordRelationshipDefinition_targetModuleId_idx" ON "RecordRelationshipDefinition"("targetModuleId");

-- CreateIndex
CREATE UNIQUE INDEX "RecordRelationship_fieldId_sourceRecordId_key" ON "RecordRelationship"("fieldId", "sourceRecordId");

-- CreateIndex
CREATE INDEX "RecordRelationship_sourceRecordId_idx" ON "RecordRelationship"("sourceRecordId");

-- CreateIndex
CREATE INDEX "RecordRelationship_targetRecordId_idx" ON "RecordRelationship"("targetRecordId");

-- CreateIndex
CREATE INDEX "RecordRelationship_organizationId_idx" ON "RecordRelationship"("organizationId");

-- AddForeignKey
ALTER TABLE "RecordRelationshipDefinition" ADD CONSTRAINT "RecordRelationshipDefinition_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "RecordField"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecordRelationshipDefinition" ADD CONSTRAINT "RecordRelationshipDefinition_targetModuleId_fkey" FOREIGN KEY ("targetModuleId") REFERENCES "RecordModule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecordRelationship" ADD CONSTRAINT "RecordRelationship_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecordRelationship" ADD CONSTRAINT "RecordRelationship_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "RecordField"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecordRelationship" ADD CONSTRAINT "RecordRelationship_sourceRecordId_fkey" FOREIGN KEY ("sourceRecordId") REFERENCES "RecordItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecordRelationship" ADD CONSTRAINT "RecordRelationship_targetRecordId_fkey" FOREIGN KEY ("targetRecordId") REFERENCES "RecordItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;