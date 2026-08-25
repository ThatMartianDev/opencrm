import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/client";
import { formatFieldValue, stringifySummaryValue } from "./helpers";

export const RecordsSearchService = {
  async searchAllRecords(input: {
    organizationId: string;
    moduleId: string;
    query: string;
    limit?: number;
  }) {
    const recordModule = await prisma.recordModule.findFirst({
      where: {
        id: input.moduleId,
        organizationId: input.organizationId,
        archivedAt: null,
      },
      select: { id: true },
    });
    if (!recordModule) return null;

    const query = input.query.trim();
    if (!query) return [];

    const limit = Math.min(Math.max(input.limit ?? 5, 1), 10);
    const containsQuery = `%${query}%`;
    const startsWithQuery = `${query}%`;
    const matchedRecords = await prisma.$queryRaw<
      { id: string; similarity: number }[]
    >(
      Prisma.sql`
                    SELECT
                        record_item."id",
                        similarity(record_item."displayName", ${query}) AS "similarity"
                    FROM "RecordItem" AS record_item
                    WHERE record_item."moduleId" = ${input.moduleId}
                      AND record_item."organizationId" = ${input.organizationId}
                      AND record_item."archivedAt" IS NULL
                      AND (
                          record_item."displayName" ILIKE ${containsQuery}
                          OR EXISTS (
                              SELECT 1
                              FROM "RecordFieldValue" AS field_value
                              WHERE field_value."recordId" = record_item."id"
                                AND field_value."value"::text ILIKE ${containsQuery}
                          )
                                                OR similarity(record_item."displayName", ${query}) >= 0.35
                      )
                    ORDER BY
                        CASE WHEN record_item."displayName" ILIKE ${startsWithQuery}
                            THEN 0 ELSE 1 END,
                                            similarity(record_item."displayName", ${query}) DESC,
                        record_item."displayName" ASC,
                        record_item."id" ASC
                    LIMIT ${limit}
                `,
    );
    const ids = matchedRecords.map((record) => record.id);
    const similarityById = new Map(
      matchedRecords.map((record) => [record.id, Number(record.similarity)]),
    );
    if (ids.length === 0) return [];

    const records = await prisma.recordItem.findMany({
      where: {
        id: { in: ids },
        moduleId: input.moduleId,
        organizationId: input.organizationId,
        archivedAt: null,
      },
      select: {
        id: true,
        moduleId: true,
        displayName: true,
        values: {
          select: {
            value: true,
            field: {
              select: {
                label: true,
                type: true,
                config: true,
                isPrimary: true,
                position: true,
              },
            },
          },
          orderBy: { field: { position: "asc" } },
        },
      },
    });
    const recordsById = new Map(records.map((record) => [record.id, record]));

    return ids.flatMap((id) => {
      const record = recordsById.get(id);
      if (!record) return [];

      const normalizedQuery = query.toLocaleLowerCase();
      const normalizedName = record.displayName.toLocaleLowerCase();
      const nameSimilarity = similarityById.get(record.id) ?? 0;
      const matchedFields = record.values.flatMap(({ field, value }) => {
        const formatted = stringifySummaryValue(formatFieldValue(field, value));
        return formatted?.toLocaleLowerCase().includes(normalizedQuery)
          ? [field.label]
          : [];
      });
      const match =
        normalizedName === normalizedQuery
          ? { score: 1, matchReason: "exact_name" as const }
          : normalizedName.startsWith(normalizedQuery)
            ? { score: 0.9, matchReason: "name_prefix" as const }
            : normalizedName.includes(normalizedQuery)
              ? { score: 0.8, matchReason: "name_contains" as const }
              : nameSimilarity >= 0.35
                ? {
                    score: Math.min(0.79, 0.55 + nameSimilarity * 0.25),
                    matchReason: "fuzzy_name" as const,
                  }
                : { score: 0.6, matchReason: "field_value" as const };
      const summary = record.values
        .flatMap(({ field, value }) => {
          if (field.isPrimary) return [];
          const formatted = stringifySummaryValue(
            formatFieldValue(field, value),
          );
          return formatted ? [{ label: field.label, value: formatted }] : [];
        })
        .slice(0, 4);

      return [
        {
          id: record.id,
          moduleId: record.moduleId,
          displayName: record.displayName,
          ...match,
          matchedFields:
            match.matchReason === "fuzzy_name"
              ? record.values.flatMap(({ field }) =>
                  field.isPrimary ? [field.label] : [],
                )
              : [...new Set(matchedFields)],
          summary,
        },
      ];
    });
  },
};
