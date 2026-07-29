import { RecordField } from "@/generated/prisma/client";

export interface SelectOption {
  label: string;
  value: string;
  color: string;
}

export interface RecordFieldConfig {
  options?: SelectOption[];
  currency?: string;
  minimum?: number;
  maximum?: number;
  isPrimaryEmail?: boolean;
}

export type ShortnedRecordField = Omit<
  Pick<
    RecordField,
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
};
