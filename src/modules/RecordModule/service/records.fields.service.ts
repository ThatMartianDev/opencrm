import { prisma } from "@/lib/db/client";
import { RecordActivityService } from "./record.activity.service";
import { RecordRelationshipInput, RecordValueInput } from "./types";
import {
  formatFieldValue,
  validateRelationships,
  valuesEqual,
} from "./helpers";
import { RecordFieldType } from "@/generated/prisma/enums";

export const RecordFieldsService = {
  async patchRecordFields(input: {
    organizationId: string;
    moduleId: string;
    recordId: string;
    values: RecordValueInput[];
    valueFieldIds: string[];
    relationships: RecordRelationshipInput[];
    relationshipFieldIds: string[];
    displayName?: string;
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
          values: {
            where: { fieldId: { in: input.valueFieldIds } },
            select: { fieldId: true, value: true },
          },
          outgoingRelationships: {
            where: { fieldId: { in: input.relationshipFieldIds } },
            select: {
              fieldId: true,
              targetRecordId: true,
              targetRecord: { select: { displayName: true } },
            },
          },
          module: {
            select: {
              fields: {
                where: {
                  id: {
                    in: [...input.valueFieldIds, ...input.relationshipFieldIds],
                  },
                },
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

      const relationshipTargets = await validateRelationships(
        transaction,
        input,
      );
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
        input.relationships.map((relationship) => [
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

      if (input.valueFieldIds.length > 0) {
        await transaction.recordFieldValue.deleteMany({
          where: {
            recordId: input.recordId,
            fieldId: { in: input.valueFieldIds },
          },
        });
      }
      if (input.values.length > 0) {
        await transaction.recordFieldValue.createMany({
          data: input.values.map((value) => ({
            recordId: input.recordId,
            ...value,
          })),
        });
      }
      if (input.relationshipFieldIds.length > 0) {
        await transaction.recordRelationship.deleteMany({
          where: {
            sourceRecordId: input.recordId,
            fieldId: { in: input.relationshipFieldIds },
          },
        });
      }
      if (input.relationships.length > 0) {
        await transaction.recordRelationship.createMany({
          data: input.relationships.map((relationship) => ({
            organizationId: input.organizationId,
            sourceRecordId: input.recordId,
            ...relationship,
          })),
        });
      }
      return transaction.recordItem
        .update({
          where: { id: input.recordId },
          data:
            input.displayName === undefined
              ? {}
              : { displayName: input.displayName },
        })
        .then((updatedRecord) => ({ record: updatedRecord, changes }));
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
