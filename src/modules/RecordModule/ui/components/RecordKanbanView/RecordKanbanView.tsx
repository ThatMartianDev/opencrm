"use client";

import Link from "next/link";
import KanbanBoard, {
  type KanbanColumn,
} from "@/components/macro/KanbanBoard/KanbanBoard";
import { useToast } from "@/components/macro/Toaster";
import { RecordFieldType } from "@/generated/prisma/enums";
import { updateModuleRecord } from "../../../actions";
import type {
  RecordModuleItem,
  RecordModulePageData,
  RecordModuleView,
} from "../../../types";
import {
  formatRecordValue,
  createInitialValues,
  getFieldOptions,
  getRecordFieldValue,
  getRecordRelationship,
} from "../record-values";
import Styles from "./RecordKanbanView.module.css";
import RecordOwnerField from "../RecordOwnerField/RecordOwnerField";
import AvatarFallback from "@/components/micro/AvatarFallback/AvatarFallback";

type RecordKanbanViewProps = {
  module: RecordModulePageData;
  view: RecordModuleView;
  records: RecordModuleItem[];
  onRecordsChanged: () => void | Promise<void>;
};

const UNCATEGORIZED_COLUMN_ID = "__uncategorized__";

const getKanbanConfig = (view: RecordModuleView) => {
  if (!view.config || typeof view.config !== "object" || Array.isArray(view.config)) {
    return { groupByField: null, cardFields: [] as string[] };
  }

  const config = view.config as {
    groupByField?: unknown;
    cardFields?: unknown;
  };
  return {
    groupByField:
      typeof config.groupByField === "string" ? config.groupByField : null,
    cardFields: Array.isArray(config.cardFields)
      ? config.cardFields.filter((key): key is string => typeof key === "string")
      : [],
  };
};

const belongsToColumn = (value: unknown, optionValue: string | null) => {
  if (optionValue === null) {
    return value === undefined || value === null || value === "" ||
      (Array.isArray(value) && value.length === 0);
  }
  return Array.isArray(value) ? value.includes(optionValue) : value === optionValue;
};

const RecordKanbanView = ({
  module,
  view,
  records,
  onRecordsChanged,
}: RecordKanbanViewProps) => {
  const { toast } = useToast();
  const config = getKanbanConfig(view);
  const groupField = module.fields.find((field) => field.key === config.groupByField);
  const cardFields = config.cardFields
    .map((key) => module.fields.find((field) => field.key === key))
    .filter((field): field is RecordModulePageData["fields"][number] => Boolean(field));

  if (!groupField) {
    return (
      <div className={Styles.empty}>
        Choose a select field in the module builder to group this board.
      </div>
    );
  }

  const columnOptions = [
    ...getFieldOptions(groupField).map((option) => ({
      id: `option:${option.value}`,
      value: option.value,
      title: option.label,
      color: option.color ?? "#94a3b8",
    })),
    {
      id: UNCATEGORIZED_COLUMN_ID,
      value: null,
      title: "Uncategorized",
      color: "#94a3b8",
    },
  ];

  const columns: KanbanColumn[] = columnOptions.map((column) => ({
    id: column.id,
    title: column.title,
    color: column.color,
    cards: records
      .filter((record) =>
        belongsToColumn(
          getRecordFieldValue(record, groupField.id),
          column.value,
        ),
      )
      .map((record) => ({
        id: record.id,
        element: (
          <Link
            className={Styles.card}
            href={`/app/${module.organizationId}/${module.key}/${record.id}`}
          >
            <div className={Styles.cardHeader}>
              <AvatarFallback entityKind="customer" entityId={record.id} name={record.displayName} size={20} style={{borderRadius: "6px"}}/>
              <h4>{record.displayName}</h4>
            </div>
            {cardFields.map((field) => (
              <div className={Styles.cardField} key={field.id}>
                <span>{field.label}</span>
                <p>
                  {field.type === RecordFieldType.RELATIONSHIP
                    ? getRecordRelationship(record, field.id)?.targetRecord
                        .displayName ?? "—"
                    : formatRecordValue(
                        field,
                        getRecordFieldValue(record, field.id),
                      )}
                </p>
              </div>
            ))}
            <footer className={Styles.cardFooter}>
              <RecordOwnerField
                className={Styles.cardOwner}
                organizationId={module.organizationId}
                owner={{
                  id: record.owner.id,
                  name: record.owner.user.name,
                  email: record.owner.user.email,
                  avatarUrl: record.owner.user.avatarUrl,
                }}
              />
            </footer>
          </Link>
        ),
      })),
  }));

  const handleCardMove = async (
    cardId: string,
    fromColumnId: string,
    toColumnId: string,
  ) => {
    const record = records.find((item) => item.id === cardId);
    const fromColumn = columnOptions.find((column) => column.id === fromColumnId);
    const toColumn = columnOptions.find((column) => column.id === toColumnId);
    if (!record || !fromColumn || !toColumn) return false;

    const values = createInitialValues(
      module.fields,
      record.values,
      record.outgoingRelationships,
    );
    const currentGroupValue = values[groupField.key];

    if (groupField.type === RecordFieldType.MULTI_SELECT) {
      const currentValues = Array.isArray(currentGroupValue)
        ? currentGroupValue.filter((value): value is string => typeof value === "string")
        : [];
      const withoutSource = fromColumn.value
        ? currentValues.filter((value) => value !== fromColumn.value)
        : currentValues;
      values[groupField.key] =
        toColumn.value && !withoutSource.includes(toColumn.value)
          ? [...withoutSource, toColumn.value]
          : withoutSource;
    } else {
      values[groupField.key] = toColumn.value ?? "";
    }

    const moveToast = toast.loading(`Moving "${record.displayName}"...`);
    const result = await updateModuleRecord(module.key, cardId, values);
    if (!result.success) {
      moveToast.error({
        title: "Record not moved",
        description: result.error,
      });
      return false;
    }

    moveToast.success({
      title: "Record moved",
      description: `"${record.displayName}" moved to ${toColumn.title}.`,
    });
    void onRecordsChanged();
    return true;
  };

  return (
    <KanbanBoard columns={columns} onCardMove={handleCardMove} />
  );
};

export default RecordKanbanView;
