import { Prisma } from "@/generated/prisma/client";
import { RecordFieldType, type ModuleFeature } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db/client";
import { NotificationsService } from "@/modules/notifications/service";
import type {
  RecordPageQuery,
  RecordRelationshipInput,
  RecordValueInput,
} from "./types";
import { RecordActivityService } from "./record.activity.service";

import {
  validateRelationships,
  valuesEqual,
  formatFieldValue,
  stringifySummaryValue,
} from "./helpers";

import { RecordRelationshipsService } from "./records.relationships.service";
import { RecordsManagementService } from "./records.manage.service";
import { RecordsGenericService } from "./records.generic.service";
import { RecordFieldsService } from "./records.fields.service";
import { RecordsSearchService } from "./records.search.service";

const RecordsService = {
    ...RecordRelationshipsService,
    ...RecordsManagementService,
    ...RecordsGenericService,
    ...RecordFieldsService,
    ...RecordsSearchService,


  async getModulePageData(
    moduleKey: string,
    organizationId: string,
    query: RecordPageQuery = { page: 1, pageSize: 50, search: "" },
  ) {
    const recordModule = await prisma.recordModule.findFirst({
      where: {
        key: moduleKey,
        organizationId,
        archivedAt: null,
      },
      include: {
        fields: {
          include: {
            relationshipDefinition: {
              include: {
                targetModule: {
                  select: { id: true, key: true, name: true, pluralName: true },
                },
              },
            },
          },
          orderBy: { position: "asc" },
        },
        views: { orderBy: { position: "asc" } },
      },
    });
    if (!recordModule) return null;

    const search = query.search.trim();
    const searchClause = search
      ? Prisma.sql`
                AND (
                    record_item."displayName" ILIKE ${`%${search}%`}
                    OR EXISTS (
                        SELECT 1
                        FROM "RecordFieldValue" AS field_value
                        WHERE field_value."recordId" = record_item."id"
                          AND field_value."value"::text ILIKE ${`%${search}%`}
                    )
                )
            `
      : Prisma.empty;

    const recordPage = await prisma.$transaction(async (transaction) => {
      const [countRow] = await transaction.$queryRaw<{ count: number }[]>(
        Prisma.sql`
                    SELECT COUNT(*)::integer AS "count"
                    FROM "RecordItem" AS record_item
                    WHERE record_item."moduleId" = ${recordModule.id}
                      AND record_item."organizationId" = ${organizationId}
                      AND record_item."archivedAt" IS NULL
                      ${searchClause}
                `,
      );
      const totalRecords = countRow?.count ?? 0;
      const totalPages = Math.max(1, Math.ceil(totalRecords / query.pageSize));
      const page = Math.min(query.page, totalPages);
      const offset = (page - 1) * query.pageSize;
      const recordIds = await transaction.$queryRaw<{ id: string }[]>(
        Prisma.sql`
                    SELECT record_item."id"
                    FROM "RecordItem" AS record_item
                    WHERE record_item."moduleId" = ${recordModule.id}
                      AND record_item."organizationId" = ${organizationId}
                      AND record_item."archivedAt" IS NULL
                      ${searchClause}
                    ORDER BY record_item."createdAt" DESC, record_item."id" DESC
                    LIMIT ${query.pageSize}
                    OFFSET ${offset}
                `,
      );
      const ids = recordIds.map((record) => record.id);
      const records =
        ids.length === 0
          ? []
          : await transaction.recordItem.findMany({
              where: { id: { in: ids } },
              include: {
                values: true,
                owner: {
                  select: {
                    id: true,
                    user: {
                      select: {
                        name: true,
                        email: true,
                        avatarUrl: true,
                      },
                    },
                  },
                },
                outgoingRelationships: {
                  include: {
                    targetRecord: {
                      select: { id: true, displayName: true },
                    },
                  },
                },
              },
            });
      const recordsById = new Map(records.map((record) => [record.id, record]));

      return {
        records: ids.flatMap((id) => {
          const record = recordsById.get(id);
          return record ? [record] : [];
        }),
        pagination: {
          page,
          pageSize: query.pageSize,
          totalRecords,
          totalPages,
          search,
        },
      };
    });

    return { ...recordModule, ...recordPage };
  },

};

export default RecordsService;