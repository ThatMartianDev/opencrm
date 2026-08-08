ALTER TABLE "accounts" ADD COLUMN "organizationId" TEXT;

-- Preserve the workspace that already owns each connected service cache.
UPDATE "accounts" AS account
SET "organizationId" = COALESCE(
    (
        SELECT email."organizationId"
        FROM "emails" AS email
        WHERE email."userId" = account."userId"
          AND email."provider" = account."provider"
        ORDER BY email."createdAt" ASC
        LIMIT 1
    ),
    (
        SELECT event."organizationId"
        FROM "calendar_events" AS event
        WHERE event."userId" = account."userId"
          AND account."provider" = 'google_calendar'
        ORDER BY event."createdAt" ASC
        LIMIT 1
    ),
    (
        SELECT member."organizationId"
        FROM "members" AS member
        WHERE member."userId" = account."userId"
        ORDER BY member."joinedAt" ASC, member."id" ASC
        LIMIT 1
    )
)
WHERE account."provider" <> 'google';

DROP INDEX IF EXISTS "accounts_userId_provider_providerAccountId_key";
DROP INDEX IF EXISTS "emails_userId_provider_providerMessageId_key";
DROP INDEX IF EXISTS "calendar_events_userId_googleEventId_key";

CREATE UNIQUE INDEX "accounts_userId_organizationId_provider_providerAccountId_key"
ON "accounts"("userId", "organizationId", "provider", "providerAccountId");

CREATE UNIQUE INDEX "accounts_login_provider_providerAccountId_key"
ON "accounts"("provider", "providerAccountId")
WHERE "organizationId" IS NULL;

CREATE INDEX "accounts_organizationId_idx" ON "accounts"("organizationId");

CREATE UNIQUE INDEX "emails_userId_organizationId_provider_providerMessageId_key"
ON "emails"("userId", "organizationId", "provider", "providerMessageId");

CREATE UNIQUE INDEX "calendar_events_userId_organizationId_googleEventId_key"
ON "calendar_events"("userId", "organizationId", "googleEventId");

ALTER TABLE "accounts"
ADD CONSTRAINT "accounts_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
ON DELETE CASCADE ON UPDATE CASCADE;