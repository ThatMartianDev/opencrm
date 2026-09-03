import { prisma } from "@/lib/db/client";
import { RecordActivityService } from "./record.activity.service";
import { RecordRelationshipInput, RecordValueInput } from "./types";
import {
  formatFieldValue,
  validateRelationships,
  valuesEqual,
} from "./helpers";
import { NotificationsService } from "@/modules/notifications/service";
import { RecordFieldType } from "@/generated/prisma/enums";

export const RecordsGenericService = {
  async getRecord(moduleKey: string, recordId: string, organizationId: string) {
    return prisma.recordItem.findFirst({
      where: {
        id: recordId,
        organizationId,
        archivedAt: null,
        module: {
          key: moduleKey,
          archivedAt: null,
        },
      },
      include: {
        values: true,
        outgoingRelationships: {
          include: {
            targetRecord: {
              select: {
                id: true,
                displayName: true,
                module: { select: { id: true, key: true, name: true } },
              },
            },
          },
        },
        incomingRelationships: {
          where: {
            sourceRecord: {
              archivedAt: null,
              module: { archivedAt: null },
            },
          },
          include: {
            field: { select: { id: true, label: true } },
            sourceRecord: {
              select: {
                id: true,
                displayName: true,
                module: {
                  select: {
                    id: true,
                    key: true,
                    name: true,
                    pluralName: true,
                    icon: true,
                    accentColor: true,
                  },
                },
              },
            },
          },
        },
        module: {
          include: {
            fields: {
              include: {
                relationshipDefinition: {
                  include: {
                    targetModule: {
                      select: {
                        id: true,
                        key: true,
                        name: true,
                        pluralName: true,
                      },
                    },
                  },
                },
              },
              orderBy: { position: "asc" },
            },
          },
        },
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
      },
    });
  },

  async createRecord(input: {
    organizationId: string;
    moduleId: string;
    createdById: string;
    ownerId?: string;
    displayName: string;
    values: RecordValueInput[];
    relationships?: RecordRelationshipInput[];
  }) {
    const record = await prisma.$transaction(async (transaction) => {
      const relationships = input.relationships ?? [];
      await validateRelationships(transaction, { ...input, relationships });
      const ownerId = input.ownerId ?? input.createdById;
      const owner = await transaction.member.findFirst({
        where: { id: ownerId, organizationId: input.organizationId },
        select: { id: true },
      });
      if (!owner) return null;

      const record = await transaction.recordItem.create({
        data: {
          organizationId: input.organizationId,
          moduleId: input.moduleId,
          createdById: input.createdById,
          ownerId,
          displayName: input.displayName,
          values: { create: input.values },
        },
        include: {
          values: true,
          module: { select: { key: true } },
        },
      });
      if (relationships.length > 0) {
        await transaction.recordRelationship.createMany({
          data: relationships.map((relationship) => ({
            organizationId: input.organizationId,
            fieldId: relationship.fieldId,
            sourceRecordId: record.id,
            targetRecordId: relationship.targetRecordId,
          })),
        });
      }
      return record;
    });
    if (record) {
      await RecordActivityService.created({
        organizationId: input.organizationId,
        memberId: input.createdById,
        recordId: record.id,
        recordName: record.displayName,
      });
      if (record.ownerId !== input.createdById) {
        try {
          await NotificationsService.notifyRecordAssignment({
            organizationId: input.organizationId,
            moduleKey: record.module.key,
            recordId: record.id,
            recordName: record.displayName,
            assignedToId: record.ownerId,
            actorMemberId: input.createdById,
          });
        } catch (error) {
          console.error("[records] failed to enqueue assignment notification", {
            recordId: record.id,
            error,
          });
        }
      }
    }
    return record;
  },

  async updateRecord(input: {
    organizationId: string;
    moduleId: string;
    recordId: string;
    displayName: string;
    values: RecordValueInput[];
    relationships?: RecordRelationshipInput[];
    memberId: string;
    canUpdateAny: boolean;
  }) {
    const result = await prisma.$transaction(async (transaction) => {
      const record = await transaction.recordItem.findFirst({
        where: {
          id: input.recordId,
          moduleId: input.moduleId,
          organizationId: input.organizationId,
          archivedAt: null,
          ...(input.canUpdateAny ? {} : { ownerId: input.memberId }),
        },
        select: {
          id: true,
          values: { select: { fieldId: true, value: true } },
          outgoingRelationships: {
            select: {
              fieldId: true,
              targetRecordId: true,
              targetRecord: { select: { displayName: true } },
            },
          },
          module: {
            select: {
              fields: {
                select: {
                  id: true,
                  label: true,
                  type: true,
                  config: true,
                },
              },
            },
          },
        },
      });

      if (!record) return null;

      const relationships = input.relationships ?? [];
      const relationshipTargets = await validateRelationships(transaction, {
        ...input,
        relationships,
      });
      const previousValues = new Map(
        record.values.map((value) => [value.fieldId, value.value]),
      );
      const nextValues = new Map(
        input.values.map((value) => [value.fieldId, value.value]),
      );
      const previousRelationships = new Map(
        record.outgoingRelationships.map((relationship) => [
          relationship.fieldId,
          relationship,
        ]),
      );
      const nextRelationships = new Map(
        relationships.map((relationship) => [
          relationship.fieldId,
          relationship,
        ]),
      );
      const changes = record.module.fields.flatMap((field) => {
        if (field.type === RecordFieldType.RELATIONSHIP) {
          const previous = previousRelationships.get(field.id);
          const next = nextRelationships.get(field.id);
          if (previous?.targetRecordId === next?.targetRecordId) return [];
          return [
            {
              fieldName: field.label,
              previousValue: previous?.targetRecord.displayName ?? null,
              nextValue: next
                ? (relationshipTargets.get(next.targetRecordId)?.displayName ??
                  null)
                : null,
            },
          ];
        }

        const previousValue = previousValues.get(field.id) ?? null;
        const nextValue = nextValues.get(field.id) ?? null;
        if (valuesEqual(previousValue, nextValue)) return [];
        return [
          {
            fieldName: field.label,
            previousValue: formatFieldValue(field, previousValue),
            nextValue: formatFieldValue(field, nextValue),
          },
        ];
      });

      await transaction.recordFieldValue.deleteMany({
        where: { recordId: input.recordId },
      });
      await transaction.recordRelationship.deleteMany({
        where: { sourceRecordId: input.recordId },
      });

      await transaction.recordItem.update({
        where: { id: input.recordId },
        data: {
          displayName: input.displayName,
          values: { create: input.values },
        },
      });

      if (relationships.length > 0) {
        await transaction.recordRelationship.createMany({
          data: relationships.map((relationship) => ({
            organizationId: input.organizationId,
            fieldId: relationship.fieldId,
            sourceRecordId: input.recordId,
            targetRecordId: relationship.targetRecordId,
          })),
        });
      }

      const updatedRecord = await transaction.recordItem.findUnique({
        where: { id: input.recordId },
        include: { values: true },
      });
      return { record: updatedRecord, changes };
    });
    if (result?.record && result.changes.length > 0) {
      await RecordActivityService.fieldsUpdated({
        organizationId: input.organizationId,
        memberId: input.memberId,
        recordId: input.recordId,
        changes: result.changes,
      });
    }
    return result?.record ?? null;
  },
};
