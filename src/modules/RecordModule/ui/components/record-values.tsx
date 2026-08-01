import { RecordFieldType } from "@/generated/prisma/enums";
import type {
  RecordModuleField,
  RecordModuleItem,
  RecordValueState,
  SelectFieldOption,
} from "../../types";

export const getFieldOptions = (field: RecordModuleField): SelectFieldOption[] => {
  if (!field.config || typeof field.config !== "object" || Array.isArray(field.config)) {
    return [];
  }

  const options = (field.config as { options?: unknown }).options;
  if (!Array.isArray(options)) return [];

  return options.filter(
    (option): option is SelectFieldOption =>
      typeof option === "object" &&
      option !== null &&
      typeof (option as SelectFieldOption).label === "string" &&
      typeof (option as SelectFieldOption).value === "string",
  );
};

export const getRecordFieldValue = (
  record: RecordModuleItem,
  fieldId: string,
) => record.values.find((value) => value.fieldId === fieldId)?.value;

export const createInitialValues = (
  fields: RecordModuleField[],
  values?: { fieldId: string; value: unknown }[],
): RecordValueState =>
  Object.fromEntries(
    fields.map((field) => {
      const savedValue = values?.find((value) => value.fieldId === field.id)?.value;
      if (savedValue !== undefined) return [field.key, savedValue];
      if (field.defaultValue !== null) return [field.key, field.defaultValue];
      if (field.type === RecordFieldType.BOOLEAN) return [field.key, false];
      if (field.type === RecordFieldType.MULTI_SELECT) return [field.key, []];
      return [field.key, ""];
    }),
  );

const formatDate = (value: string, includeTime: boolean) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return includeTime ? date.toLocaleString() : date.toLocaleDateString();
};

export const formatRecordValue = (
  field: RecordModuleField,
  value: unknown,
): string => {
  if (value === null || value === undefined || value === "") return "—";

  if (field.type === RecordFieldType.SELECT) {
    return getFieldOptions(field).find((option) => option.value === value)?.label ?? String(value);
  }

  if (field.type === RecordFieldType.MULTI_SELECT && Array.isArray(value)) {
    const options = getFieldOptions(field);
    return value
      .map((item) => options.find((option) => option.value === item)?.label ?? String(item))
      .join(", ");
  }

  if (field.type === RecordFieldType.BOOLEAN) return value ? "Yes" : "No";
  if (field.type === RecordFieldType.DATE && typeof value === "string") {
    return formatDate(value, false);
  }
  if (field.type === RecordFieldType.DATETIME && typeof value === "string") {
    return formatDate(value, true);
  }
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};
