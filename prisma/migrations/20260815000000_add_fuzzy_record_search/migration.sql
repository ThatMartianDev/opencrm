CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX "RecordItem_displayName_trgm_idx"
ON "RecordItem" USING GIN ("displayName" gin_trgm_ops);