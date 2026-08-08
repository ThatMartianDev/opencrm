import {
	ModuleFeature,
	RecordFieldType,
	RecordViewType,
} from "@/generated/prisma/enums";
import { z } from "zod";

export const moduleIconSchema = z.enum([
  "TargetFilled",
  "PeopleFilled",
  "MoneyFilled",
  "PersonFilled",
  "BuildingFilled",
  "DocumentFilled",
  "CalendarFilled",
  "TagFilled",
  "BoxFilled",
  "FolderFilled",
  "ChartMultipleFilled",
  "LocationFilled",
  "ShieldFilled",
  "StarFilled",
]);

export const supportedRecordFieldTypeSchema = z.enum([
  RecordFieldType.TEXT,
  RecordFieldType.NUMBER,
  RecordFieldType.CURRENCY,
  RecordFieldType.EMAIL,
  RecordFieldType.PHONE,
  RecordFieldType.DATE,
  RecordFieldType.DATETIME,
  RecordFieldType.SELECT,
  RecordFieldType.MULTI_SELECT,
  RecordFieldType.RELATIONSHIP,
]);

export const implementedModuleFeatureSchema = z.enum([
  ModuleFeature.NOTES,
  ModuleFeature.TASKS,
  ModuleFeature.FILES,
]);

export const linkableModuleFeatureSchema = z.enum([
  ModuleFeature.NOTES,
  ModuleFeature.TASKS,
]);

const fieldConfigSchema = z
  .object({
    options: z
      .array(
        z.object({
          label: z.string().trim().min(1).max(100),
          value: z.string().trim().min(1).max(200),
          color: z.string().trim().min(1).max(50),
        }),
      )
      .optional(),
    currency: z.string().trim().min(1).max(10).optional(),
    minimum: z.number().finite().optional(),
    maximum: z.number().finite().optional(),
    isPrimaryEmail: z.boolean().optional(),
  })
  .nullable();

export const fieldSchema = z
  .object({
    key: z
      .string()
      .trim()
      .min(1)
      .max(100)
      .regex(/^[a-z0-9_]+$/),
    label: z.string().trim().min(1).max(200),
    type: supportedRecordFieldTypeSchema,
    required: z.boolean(),
    unique: z.boolean(),
    defaultValue: z.json().nullable(),
    isPrimary: z.boolean(),
    position: z.number().int().nonnegative(),
    config: fieldConfigSchema,
    relationshipTargetModuleId: z
      .string()
      .cuid()
      .nullable()
      .optional()
      .default(null),
  })
  .superRefine((field, context) => {
    if (
      field.type === RecordFieldType.RELATIONSHIP &&
      !field.relationshipTargetModuleId
    ) {
      context.addIssue({
        code: "custom",
        path: ["relationshipTargetModuleId"],
        message: "Relationship fields require a target module.",
      });
    }
    if (
      field.type !== RecordFieldType.RELATIONSHIP &&
      field.relationshipTargetModuleId
    ) {
      context.addIssue({
        code: "custom",
        path: ["relationshipTargetModuleId"],
        message: "Only relationship fields can target another module.",
      });
    }
    if (field.type === RecordFieldType.RELATIONSHIP && field.unique) {
      context.addIssue({
        code: "custom",
        path: ["unique"],
        message: "Relationship fields cannot be marked unique.",
      });
    }
    if (
      field.isPrimary &&
      (field.type !== RecordFieldType.TEXT || !field.required)
    ) {
      context.addIssue({
        code: "custom",
        path: ["isPrimary"],
        message: "The record title must be a required text field.",
      });
    }

    const options = field.config?.options ?? [];
    if (
      field.type === RecordFieldType.SELECT ||
      field.type === RecordFieldType.MULTI_SELECT
    ) {
      if (options.length === 0) {
        context.addIssue({
          code: "custom",
          path: ["config", "options"],
          message: "Select fields require at least one option.",
        });
      }
      if (
        new Set(options.map((option) => option.value)).size !== options.length
      ) {
        context.addIssue({
          code: "custom",
          path: ["config", "options"],
          message: "Select option values must be unique.",
        });
      }
    }

    if (
      field.config?.minimum !== undefined &&
      field.config?.maximum !== undefined &&
      field.config.minimum > field.config.maximum
    ) {
      context.addIssue({
        code: "custom",
        path: ["config"],
        message: "Minimum cannot be greater than maximum.",
      });
    }

    if (field.defaultValue !== null) {
      const defaultValue = field.defaultValue;
      let isValidDefault = false;

      switch (field.type) {
        case RecordFieldType.NUMBER:
        case RecordFieldType.CURRENCY:
          isValidDefault =
            typeof defaultValue === "number" &&
            Number.isFinite(defaultValue) &&
            (field.config?.minimum === undefined ||
              defaultValue >= field.config.minimum) &&
            (field.config?.maximum === undefined ||
              defaultValue <= field.config.maximum);
          break;
        case RecordFieldType.EMAIL:
          isValidDefault = z.string().email().safeParse(defaultValue).success;
          break;
        case RecordFieldType.DATE:
        case RecordFieldType.DATETIME:
          isValidDefault =
            typeof defaultValue === "string" &&
            !Number.isNaN(Date.parse(defaultValue));
          break;
        case RecordFieldType.SELECT:
          isValidDefault =
            typeof defaultValue === "string" &&
            options.some((option) => option.value === defaultValue);
          break;
        case RecordFieldType.MULTI_SELECT:
          isValidDefault =
            Array.isArray(defaultValue) &&
            new Set(defaultValue).size === defaultValue.length &&
            defaultValue.every(
              (value) =>
                typeof value === "string" &&
                options.some((option) => option.value === value),
            );
          break;
        default:
          isValidDefault =
            typeof defaultValue === "string" && defaultValue.trim().length > 0;
      }

      if (!isValidDefault) {
        context.addIssue({
          code: "custom",
          path: ["defaultValue"],
          message: "The default value is invalid for this field.",
        });
      }
    }
  });

const listViewSchema = z.object({
  name: z.string().trim().min(1).max(100),
  type: z.literal(RecordViewType.LIST),
  position: z.number().int().nonnegative(),
  isDefault: z.boolean(),
  config: z.object({
    columns: z.array(z.string().min(1)).max(100),
  }),
});

const kanbanViewSchema = z.object({
  name: z.string().trim().min(1).max(100),
  type: z.literal(RecordViewType.KANBAN),
  position: z.number().int().nonnegative(),
  isDefault: z.boolean(),
  config: z.object({
    groupByField: z.string().min(1).nullable(),
    cardFields: z.array(z.string().min(1)).max(100),
  }),
});

export const createRecordModuleSchema = z
  .object({
    moduleDetails: z.object({
      name: z.string().trim().min(1, "Module name is required.").max(100),
      pluralName: z.string().trim().min(1, "Plural name is required.").max(100),
      icon: moduleIconSchema,
      accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Invalid color."),
    }),
    dataFields: z.array(fieldSchema).min(1, "Add at least one data field."),
    moduleViews: z
      .array(z.discriminatedUnion("type", [listViewSchema, kanbanViewSchema]))
      .min(1, "Enable at least one module view."),
    moduleFeatures: z.array(implementedModuleFeatureSchema).max(3),
  })
  .superRefine((data, context) => {
    const fieldKeys = new Set(data.dataFields.map((field) => field.key));
    if (fieldKeys.size !== data.dataFields.length) {
      context.addIssue({
        code: "custom",
        path: ["dataFields"],
        message: "Data field keys must be unique.",
      });
    }

    if (data.dataFields.filter((field) => field.isPrimary).length !== 1) {
      context.addIssue({
        code: "custom",
        path: ["dataFields"],
        message: "Choose exactly one record title field.",
      });
    }

    if (data.moduleViews.filter((view) => view.isDefault).length !== 1) {
      context.addIssue({
        code: "custom",
        path: ["moduleViews"],
        message: "Choose exactly one default view.",
      });
    }

    for (const view of data.moduleViews) {
      const referencedKeys =
        view.type === RecordViewType.LIST
          ? view.config.columns
          : [view.config.groupByField, ...view.config.cardFields].filter(
              (key): key is string => key !== null,
            );

      if (referencedKeys.some((key) => !fieldKeys.has(key))) {
        context.addIssue({
          code: "custom",
          path: ["moduleViews"],
          message: `The ${view.name} configuration references a missing field.`,
        });
      }

      if (view.type === RecordViewType.KANBAN && view.config.groupByField) {
        const groupField = data.dataFields.find(
          (field) => field.key === view.config.groupByField,
        );
        if (
          groupField?.type !== RecordFieldType.SELECT &&
          groupField?.type !== RecordFieldType.MULTI_SELECT
        ) {
          context.addIssue({
            code: "custom",
            path: ["moduleViews"],
            message:
              "Board views must group records by a select or multi-select field.",
          });
        }
      }
    }
  });


export const listColumnsSchema = z
	.array(z.string().trim().min(1))
	.max(100)
	.refine((columns) => new Set(columns).size === columns.length, {
		message: "A field can only appear once in a view.",
	});

export const recordPageQuerySchema = z.object({
	page: z.number().int().positive().default(1),
	pageSize: z.number().int().min(1).max(100).default(50),
	search: z.string().trim().max(200).default(""),
});
