import type { RecordField, RecordModuleView } from "@/generated/prisma/browser";
import { RecordViewType, type ModuleFeature } from "@/generated/prisma/enums";
import type { RecordFieldConfig } from "./tabs/DataFields/types";

export type ListViewConfig = {
  columns: string[];
};

export type KanbanViewConfig = {
  groupByField: string | null;
  cardFields: string[];
};

export type ModuleIcon =
  | "TargetFilled"
  | "PeopleFilled"
  | "MoneyFilled"
  | "PersonFilled"
  | "BuildingFilled"
  | "DocumentFilled"
  | "CalendarFilled"
  | "TagFilled"
  | "BoxFilled"
  | "FolderFilled"
  | "ChartMultipleFilled"
  | "LocationFilled"
  | "ShieldFilled"
  | "StarFilled";

export type ModuleDetails = {
  name: string;
  pluralName: string;
  icon: ModuleIcon;
  accentColor: string;
};

export type RecordFieldDraft = Omit<
  Pick<
    RecordField,
    | "key"
    | "label"
    | "type"
    | "required"
    | "unique"
    | "defaultValue"
    | "isPrimary"
    | "position"
    | "config"
  >,
  "config"
> & {
  config: RecordFieldConfig | null;
  relationshipTargetModuleId?: string | null;
};

type ModuleViewDraftBase = Pick<
  RecordModuleView,
  "name" | "position" | "isDefault"
>;

export type ModuleViewDraft =
  | (ModuleViewDraftBase & {
      type: typeof RecordViewType.LIST;
      config: ListViewConfig;
    })
  | (ModuleViewDraftBase & {
      type: typeof RecordViewType.KANBAN;
      config: KanbanViewConfig;
    });

export type RecordModuleBuilderData = {
  moduleDetails: ModuleDetails;
  dataFields: RecordFieldDraft[];
  moduleViews: ModuleViewDraft[];
  moduleFeatures: ModuleFeature[];
};