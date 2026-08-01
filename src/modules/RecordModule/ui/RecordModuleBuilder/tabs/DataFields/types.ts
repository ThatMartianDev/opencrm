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
