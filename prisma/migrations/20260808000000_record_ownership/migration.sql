-- Add owner separately from the immutable creator audit field.
ALTER TABLE "RecordItem" ADD COLUMN "ownerId" TEXT;

-- Existing records stay with their creator. Legacy records without a creator
-- fall back to the organization owner, then to its earliest member.
UPDATE "RecordItem" AS record
SET "ownerId" = COALESCE(
    (
        SELECT creator."id"
        FROM "members" AS creator
        WHERE creator."id" = record."createdById"
          AND creator."organizationId" = record."organizationId"
    ),
    (
        SELECT member."id"
        FROM "members" AS member
        WHERE member."organizationId" = record."organizationId"
        ORDER BY
            CASE WHEN member."role" = 'OWNER' THEN 0 ELSE 1 END,
            member."joinedAt" ASC,
            member."id" ASC
        LIMIT 1
    )
);

ALTER TABLE "RecordItem" ALTER COLUMN "ownerId" SET NOT NULL;

CREATE INDEX "RecordItem_organizationId_ownerId_idx"
ON "RecordItem"("organizationId", "ownerId");

CREATE INDEX "RecordItem_moduleId_ownerId_idx"
ON "RecordItem"("moduleId", "ownerId");

ALTER TABLE "RecordItem"
ADD CONSTRAINT "RecordItem_ownerId_fkey"
FOREIGN KEY ("ownerId") REFERENCES "members"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;