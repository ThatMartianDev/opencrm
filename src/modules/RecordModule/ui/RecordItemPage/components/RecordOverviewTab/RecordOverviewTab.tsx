"use client";

import {
  CalendarDateRegular,
  CheckboxCheckedRegular,
  CheckboxUncheckedRegular,
  OpenRegular,
} from "@fluentui/react-icons";
import { useRef, useState, type KeyboardEvent } from "react";
import Link from "next/link";
import { OptionPicker, useOptionPicker } from "@/components/macro/OptionPicker";
import AvatarFallback from "@/components/micro/AvatarFallback/AvatarFallback";
import { RecordFieldType } from "@/generated/prisma/enums";
import type {
  RecordModuleField,
  RecordModuleRecordData,
  RecordValueState,
} from "../../../../types";
import RecordFieldIcon from "../../../components/RecordFieldIcon";
import { formatRecordValue, getFieldOptions } from "../../../components/record-values";
import RecordActivityLog from "../RecordActivityLog/RecordActivityLog";
import RelationshipFieldSelect from "../../../components/RelationshipFieldSelect/RelationshipFieldSelect";
import Styles from "./RecordOverviewTab.module.css";

type RecordOverviewTabProps = {
  record: RecordModuleRecordData;
  values: RecordValueState;
  savingFieldKey: string | null;
  onSave: (field: RecordModuleField, value: unknown) => Promise<boolean>;
};

const NUMERIC_FIELD_TYPES = new Set<RecordFieldType>([
  RecordFieldType.NUMBER,
  RecordFieldType.CURRENCY,
  RecordFieldType.PERCENT,
]);

const toInputValue = (field: RecordModuleField, value: unknown) => {
  if (typeof value !== "string" && typeof value !== "number") return "";
  if (field.type === RecordFieldType.DATE && typeof value === "string") {
    return value.slice(0, 10);
  }
  if (field.type === RecordFieldType.DATETIME && typeof value === "string") {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      const offset = date.getTimezoneOffset() * 60_000;
      return new Date(date.getTime() - offset).toISOString().slice(0, 16);
    }
  }
  return String(value);
};

const RecordOverviewTab = ({
  record,
  values,
  savingFieldKey,
  onSave,
}: RecordOverviewTabProps) => {
  const optionPicker = useOptionPicker();
  const [editingField, setEditingField] = useState<RecordModuleField | null>(null);
  const [selectField, setSelectField] = useState<RecordModuleField | null>(null);
  const [draftValue, setDraftValue] = useState("");
  const [multiSelectDraft, setMultiSelectDraft] = useState<string[] | null>(null);
  const cancelEditRef = useRef(false);

  const startEditing = (field: RecordModuleField) => {
    if (savingFieldKey) return;
    const currentValue = values[field.key];
    cancelEditRef.current = false;
    setEditingField(field);
    setDraftValue(toInputValue(field, currentValue));
    setMultiSelectDraft(
      field.type === RecordFieldType.MULTI_SELECT
        ? Array.isArray(currentValue)
          ? currentValue.filter(
              (value): value is string => typeof value === "string",
            )
          : []
        : null,
    );
  };

  const stopEditing = () => {
    setEditingField(null);
    setMultiSelectDraft(null);
  };

  const commitValue = async (field: RecordModuleField, value: unknown) => {
    const saved = await onSave(field, value);
    if (saved) stopEditing();
  };

  const commitDraft = async () => {
    if (!editingField) return;
    const value = NUMERIC_FIELD_TYPES.has(editingField.type)
      ? draftValue === ""
        ? ""
        : Number(draftValue)
      : draftValue;
    await commitValue(editingField, value);
  };

  const handleEditorKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      cancelEditRef.current = true;
      stopEditing();
      return;
    }
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void commitDraft();
    }
  };

  const handleEditorBlur = () => {
    if (cancelEditRef.current) {
      cancelEditRef.current = false;
      return;
    }
    void commitDraft();
  };

  const openSelectPicker = (
    field: RecordModuleField,
    target: HTMLButtonElement,
  ) => {
    if (savingFieldKey) return;
    setSelectField(field);
    optionPicker.open(target);
  };

  return (
    <div className={Styles.overviewTab}>
      <section className={Styles.details}>
        <h2>Details</h2>
        <div className={Styles.infoTable}>
          {record.module.fields.map((field) => {
            const value = values[field.key];
            const relationship = record.outgoingRelationships.find(
              (item) => item.fieldId === field.id,
            );
            const isEditing = editingField?.key === field.key;
            const isSaving = savingFieldKey === field.key;
            const options = getFieldOptions(field);

            return (
              <div className={Styles.infoRow} key={field.id}>
                <div className={Styles.infoLabel}>
                  <RecordFieldIcon type={field.type} />
                  <p>{field.label}:</p>
                </div>

                {field.type === RecordFieldType.RELATIONSHIP ? (
                  <div className={Styles.relationshipValue}>
                    <RelationshipFieldSelect
                      className={Styles.relationshipTrigger}
                      fieldId={field.id}
                      value={typeof value === "string" ? value : ""}
                      selectedName={relationship?.targetRecord.displayName}
                      required={field.required}
                      disabled={Boolean(savingFieldKey)}
                      onChange={(targetRecordId) =>
                        void commitValue(field, targetRecordId)
                      }
                    />
                    {relationship && (
                      <Link
                        className={Styles.openRelationship}
                        href={`/app/${record.organizationId}/${relationship.targetRecord.module.key}/${relationship.targetRecord.id}`}
                        aria-label={`Open ${relationship.targetRecord.displayName}`}
                        title="Open linked record"
                      >
                        <OpenRegular fontSize={17} />
                      </Link>
                    )}
                  </div>
                ) : field.type === RecordFieldType.SELECT ? (
                  <button
                    type="button"
                    className={Styles.valueButton}
                    disabled={Boolean(savingFieldKey)}
                    onClick={(event) => openSelectPicker(field, event.currentTarget)}
                  >
                    {typeof value === "string" && value && (
                      <span
                        className={Styles.optionDot}
                        style={{
                          backgroundColor:
                            options.find((option) => option.value === value)?.color ??
                            "#94a3b8",
                        }}
                      />
                    )}
                    <p>{isSaving ? "Saving..." : formatRecordValue(field, value)}</p>
                  </button>
                ) : field.type === RecordFieldType.BOOLEAN ? (
                  <button
                    type="button"
                    className={Styles.valueButton}
                    disabled={Boolean(savingFieldKey)}
                    onClick={() => void commitValue(field, value !== true)}
                  >
                    {value === true ? (
                      <CheckboxCheckedRegular fontSize={17} />
                    ) : (
                      <CheckboxUncheckedRegular fontSize={17} />
                    )}
                    <p>{isSaving ? "Saving..." : value === true ? "Yes" : "No"}</p>
                  </button>
                ) : isEditing && field.type === RecordFieldType.MULTI_SELECT ? (
                  <div className={Styles.multiSelectEditor}>
                    <div className={Styles.multiOptions}>
                      {options.map((option) => (
                        <label key={option.value}>
                          <input
                            type="checkbox"
                            checked={multiSelectDraft?.includes(option.value) ?? false}
                            onChange={(event) =>
                              setMultiSelectDraft((current) =>
                                event.target.checked
                                  ? [...(current ?? []), option.value]
                                  : (current ?? []).filter(
                                      (value) => value !== option.value,
                                    ),
                              )
                            }
                          />
                          <span style={{ backgroundColor: option.color ?? "#94a3b8" }} />
                          {option.label}
                        </label>
                      ))}
                    </div>
                    <div className={Styles.editorActions}>
                      <button type="button" onClick={stopEditing}>Cancel</button>
                      <button
                        type="button"
                        disabled={isSaving}
                        onClick={() =>
                          void commitValue(field, multiSelectDraft ?? [])
                        }
                      >
                        {isSaving ? "Saving..." : "Save"}
                      </button>
                    </div>
                  </div>
                ) : isEditing ? (
                  field.type === RecordFieldType.LONG_TEXT ? (
                    <textarea
                      autoFocus
                      className={Styles.inlineInput}
                      value={draftValue}
                      onChange={(event) => setDraftValue(event.target.value)}
                      onKeyDown={handleEditorKeyDown}
                      onBlur={handleEditorBlur}
                      onFocus={(event) => event.currentTarget.select()}
                    />
                  ) : (
                    <input
                      autoFocus
                      className={Styles.inlineInput}
                      type={
                        NUMERIC_FIELD_TYPES.has(field.type)
                          ? "number"
                          : field.type === RecordFieldType.DATE
                            ? "date"
                            : field.type === RecordFieldType.DATETIME
                              ? "datetime-local"
                              : field.type === RecordFieldType.EMAIL
                                ? "email"
                                : field.type === RecordFieldType.PHONE
                                  ? "tel"
                                  : field.type === RecordFieldType.URL
                                    ? "url"
                                    : "text"
                      }
                      value={draftValue}
                      onChange={(event) => setDraftValue(event.target.value)}
                      onKeyDown={handleEditorKeyDown}
                      onBlur={handleEditorBlur}
                      onFocus={(event) => event.currentTarget.select()}
                    />
                  )
                ) : (
                  <button
                    type="button"
                    className={Styles.valueButton}
                    disabled={Boolean(savingFieldKey)}
                    onClick={() => startEditing(field)}
                  >
                    {field.isPrimary && (
                      <AvatarFallback
                        name={record.displayName}
                        entityKind="customer"
                        entityId={record.id}
                        size={20}
                        style={{ borderRadius: 6 }}
                        letterCount={1}
                      />
                    )}
                    <p>{isSaving ? "Saving..." : formatRecordValue(field, value)}</p>
                  </button>
                )}
              </div>
            );
          })}

          <div className={Styles.infoRow}>
            <div className={Styles.infoLabel}>
              <CalendarDateRegular fontSize={16} />
              <p>Created on:</p>
            </div>
            <div className={Styles.readOnlyValue}>
              {new Date(record.createdAt).toLocaleDateString()}
            </div>
          </div>
        </div>
        {record.incomingRelationships.length > 0 && (
            <section className={Styles.linkedRecords}>
              <h2>Linked records</h2>
              <div className={Styles.linkedRecordList}>
                {record.incomingRelationships.map((relationship) => (
                  <Link
                    key={relationship.id}
                    href={`/app/${record.organizationId}/${relationship.sourceRecord.module.key}/${relationship.sourceRecord.id}`}
                  >
                    <span>
                      {relationship.sourceRecord.module.pluralName ??
                        relationship.sourceRecord.module.name}
                      {` · ${relationship.field.label}`}
                    </span>
                    <strong>{relationship.sourceRecord.displayName}</strong>
                  </Link>
                ))}
              </div>
            </section>
          )}
      </section>

      <RecordActivityLog />

      {selectField && optionPicker.isOpen && optionPicker.triggerRect && (
        <OptionPicker
          options={[
            ...(!selectField.required
              ? [{ value: "", label: "None", color: "#94a3b8" }]
              : []),
            ...getFieldOptions(selectField).map((option) => ({
              value: option.value,
              label: option.label,
              color: option.color ?? "#94a3b8",
            })),
          ]}
          currentValue={
            typeof values[selectField.key] === "string"
              ? (values[selectField.key] as string)
              : null
          }
          triggerRect={optionPicker.triggerRect}
          onSelect={(option) => void commitValue(selectField, option.value)}
          onClose={() => {
            optionPicker.close();
            setSelectField(null);
          }}
        />
      )}
    </div>
  );
};

export default RecordOverviewTab;