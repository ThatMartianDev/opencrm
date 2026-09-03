import { Prisma, RecordFieldType } from "@/generated/prisma/client";
import { RecordRelationshipInput } from "./types";

export const validateRelationships = async (
  transaction: Prisma.TransactionClient,
  input: {
    organizationId: string;
    moduleId: string;
    relationships: RecordRelationshipInput[];
  },
) => {
  if (input.relationships.length === 0)
    return new Map<
      string,
      {
        id: string;
        moduleId: string;
        displayName: string;
      }
    >();

  const fieldIds = input.relationships.map(
    (relationship) => relationship.fieldId,
  );
  if (new Set(fieldIds).size !== fieldIds.length) {
    throw new Error("A relationship field can link only one record.");
  }

  const fields = await transaction.recordField.findMany({
    where: {
      id: { in: fieldIds },
      moduleId: input.moduleId,
      type: RecordFieldType.RELATIONSHIP,
      module: {
        organizationId: input.organizationId,
        archivedAt: null,
      },
    },
    include: { relationshipDefinition: true },
  });
  if (fields.length !== fieldIds.length) {
    throw new Error("A relationship field is invalid.");
  }

  const targetIds = input.relationships.map(
    (relationship) => relationship.targetRecordId,
  );
  const targets = await transaction.recordItem.findMany({
    where: {
      id: { in: targetIds },
      organizationId: input.organizationId,
      archivedAt: null,
      module: { archivedAt: null },
    },
    select: { id: true, moduleId: true, displayName: true },
  });
  const targetsById = new Map(targets.map((target) => [target.id, target]));
  const fieldsById = new Map(fields.map((field) => [field.id, field]));

  for (const relationship of input.relationships) {
    const field = fieldsById.get(relationship.fieldId);
    const target = targetsById.get(relationship.targetRecordId);
    if (
      !field?.relationshipDefinition ||
      !target ||
      target.moduleId !== field.relationshipDefinition.targetModuleId
    ) {
      throw new Error("A relationship target is invalid.");
    }
  }

  return targetsById;
};

export const valuesEqual = (left: unknown, right: unknown) =>
  JSON.stringify(left ?? null) === JSON.stringify(right ?? null);

export const getConfiguredOptions = (config: Prisma.JsonValue | null) => {
  if (!config || typeof config !== "object" || Array.isArray(config)) return [];
  const options = (config as { options?: unknown }).options;
  if (!Array.isArray(options)) return [];
  return options.filter(
    (option): option is { label: string; value: string } =>
      typeof option === "object" &&
      option !== null &&
      typeof (option as { label?: unknown }).label === "string" &&
      typeof (option as { value?: unknown }).value === "string",
  );
};

export const formatFieldValue = (
  field: { type: RecordFieldType; config: Prisma.JsonValue | null },
  value: unknown,
) => {
  if (value === null || value === undefined || value === "") return null;
  const options = getConfiguredOptions(field.config);
  if (field.type === RecordFieldType.SELECT && typeof value === "string") {
    return options.find((option) => option.value === value)?.label ?? value;
  }
  if (field.type === RecordFieldType.MULTI_SELECT && Array.isArray(value)) {
    return value
      .map(
        (item) =>
          options.find((option) => option.value === item)?.label ??
          String(item),
      )
      .join(", ");
  }
  if (field.type === RecordFieldType.BOOLEAN) return value ? "Yes" : "No";
  return value;
};

export const stringifySummaryValue = (value: unknown) => {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) return value.map(String).join(", ");
  return null;
};
