import type { Prisma } from "@/generated/prisma/client";
import type { ModuleFeature } from "@/generated/prisma/enums";
import type {
  ModuleDetails,
  RecordFieldDraft,
  ModuleViewDraft,
} from "../ui/RecordModuleBuilder/types";

export type CreateRecordModulePayload = {
  moduleDetails: ModuleDetails;
  dataFields: RecordFieldDraft[];
  moduleViews: ModuleViewDraft[];
  moduleFeatures: ModuleFeature[];
};

export type CreateRecordModuleResult =
  | { success: true; moduleId: string }
  | { success: false; error: string };

export type UpdateRecordModuleResult =
  | { success: true }
  | { success: false; error: string };

export type SaveRecordResult =
  | { success: true; recordId: string }
  | { success: false; error: string };

export type MutateRecordResult =
  | { success: true }
  | { success: false; error: string };

export type SaveListViewResult =
  | { success: true }
  | { success: false; error: string };

export type CreateRecordFieldResult =
  | { success: true; fieldId: string }
  | { success: false; error: string };

export type ParsedRecordValues =
  | {
      success: true;
      values: {
        fieldId: string;
        value: Prisma.InputJsonValue;
      }[];
      relationships: {
        fieldId: string;
        targetRecordId: string;
      }[];
      displayName: string;
    }
  | { success: false; error: string };
