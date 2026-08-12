-- AddColumn
ALTER TABLE "RecordFieldValue"
ADD COLUMN "normalizedValue" TEXT;

-- Normalize values for fields marked unique. Keeping this in PostgreSQL ensures
-- every write path uses the same representation before uniqueness is checked.
CREATE FUNCTION set_record_field_value_normalized()
RETURNS TRIGGER AS $$
DECLARE
    field_is_unique BOOLEAN;
BEGIN
    SELECT "unique"
    INTO field_is_unique
    FROM "RecordField"
    WHERE "id" = NEW."fieldId";

    IF field_is_unique THEN
        CASE jsonb_typeof(NEW."value")
            WHEN 'string' THEN
                NEW."normalizedValue" := lower(btrim(NEW."value" #>> '{}'));
            WHEN 'array' THEN
                NEW."normalizedValue" := (
                    SELECT COALESCE(jsonb_agg(item ORDER BY item), '[]'::jsonb)::text
                    FROM jsonb_array_elements(NEW."value") AS item
                );
            ELSE
                NEW."normalizedValue" := NEW."value"::text;
        END CASE;
    ELSE
        NEW."normalizedValue" := NULL;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_record_field_value_normalized_trigger
BEFORE INSERT OR UPDATE OF "fieldId", "value"
ON "RecordFieldValue"
FOR EACH ROW
EXECUTE FUNCTION set_record_field_value_normalized();

-- Recompute existing values through the same trigger before adding the index.
UPDATE "RecordFieldValue"
SET "value" = "value";

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM "RecordFieldValue"
        WHERE "normalizedValue" IS NOT NULL
        GROUP BY "fieldId", "normalizedValue"
        HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION 'Unique record fields contain duplicate values. Resolve them before applying this migration.';
    END IF;
END;
$$;

-- CreateIndex
CREATE UNIQUE INDEX "RecordFieldValue_fieldId_normalizedValue_key"
ON "RecordFieldValue"("fieldId", "normalizedValue");

-- Keep normalization correct if field uniqueness becomes editable later.
CREATE FUNCTION refresh_record_field_value_normalization()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE "RecordFieldValue"
    SET "value" = "value"
    WHERE "fieldId" = NEW."id";

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER refresh_record_field_value_normalization_trigger
AFTER UPDATE OF "unique"
ON "RecordField"
FOR EACH ROW
WHEN (OLD."unique" IS DISTINCT FROM NEW."unique")
EXECUTE FUNCTION refresh_record_field_value_normalization();
