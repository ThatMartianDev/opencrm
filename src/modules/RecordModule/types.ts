import type {
  getRecordModulePage,
  getRecordModuleRecord,
} from "./actions";

export type RecordModulePageData = NonNullable<
  Awaited<ReturnType<typeof getRecordModulePage>>
>;

export type RecordModuleRecordData = NonNullable<
  Awaited<ReturnType<typeof getRecordModuleRecord>>
>;

export type RecordModuleField = RecordModulePageData["fields"][number];
export type RecordModuleItem = RecordModulePageData["records"][number];
export type RecordModuleView = RecordModulePageData["views"][number];
export type RecordValueState = Record<string, unknown>;

export type SelectFieldOption = {
  label: string;
  value: string;
  color?: string;
};
