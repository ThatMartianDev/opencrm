"use client";

import Link from "next/link";
import {
  AddRegular,
  CheckboxCheckedRegular,
  CheckboxUncheckedRegular,
  CheckmarkRegular,
  DismissRegular,
  PersonRegular,
} from "@fluentui/react-icons";
import { startTransition, useRef, useState, type KeyboardEvent } from "react";
import { OptionPicker, useOptionPicker } from "@/components/macro/OptionPicker";
import MainButton from "@/components/micro/MainButton/MainButton";
import AvatarFallback from "@/components/micro/AvatarFallback/AvatarFallback";
import { useToast } from "@/components/macro/Toaster";
import { RecordFieldType } from "@/generated/prisma/enums";
import {
  createRecordModuleField,
  saveRecordListViewColumns,
  transferModuleRecordOwnership,
  updateModuleRecord,
} from "../../../actions";
import type {
  RecordModuleField,
  RecordModuleItem,
  RecordModulePageData,
  RecordModuleView,
} from "../../../types";
import type { RecordFieldDraft } from "../../RecordModuleBuilder/types";
import FieldBuilder from "../../RecordModuleBuilder/tabs/DataFields/FieldBuilder/FieldBuilder";
import RecordFieldIcon from "../RecordFieldIcon";
import {
  createInitialValues,
  formatRecordValue,
  getFieldOptions,
  getRecordFieldValue,
  getRecordRelationship,
} from "../record-values";
import RelationshipFieldSelect from "../RelationshipFieldSelect/RelationshipFieldSelect";
import Styles from "./RecordListView.module.css";
import SharedModalStyles from "@/components/macro/ModalProvider/SharedStyles.module.css";
import RecordOwnerField from "../RecordOwnerField/RecordOwnerField";
import RecordDateField from "../RecordDateField/RecordDateField";
import { useWorkspaceData } from "@/modules/workspace/components/workspace-provider";

type RecordListViewProps = {
  module: RecordModulePageData;
  view: RecordModuleView;
  records: RecordModuleItem[];
  onModuleChanged: () => Promise<void>;
};

const getColumnKeys = (view: RecordModuleView) => {
  if (
    !view.config ||
    typeof view.config !== "object" ||
    Array.isArray(view.config)
  ) {
    return [];
  }
  const columns = (view.config as { columns?: unknown }).columns;
  return Array.isArray(columns)
    ? columns.filter((column): column is string => typeof column === "string")
    : [];
};

const NUMERIC_FIELD_TYPES = new Set<RecordFieldType>([
  RecordFieldType.NUMBER,
  RecordFieldType.CURRENCY,
  RecordFieldType.PERCENT,
]);

const toInputValue = (field: RecordModuleField, value: unknown) => {
  if (typeof value !== "string" && typeof value !== "number") return "";
  return String(value);
};

const SelectValue = ({
  field,
  value,
}: {
  field: RecordModuleField;
  value: unknown;
}) => {
  const options = getFieldOptions(field);
  const selectedValues = Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : typeof value === "string" && value
      ? [value]
      : [];

  if (selectedValues.length === 0)
    return <span className={Styles.blankValue}>—</span>;

  return (
    <span className={Styles.optionValues}>
      {selectedValues.map((selectedValue) => {
        const option = options.find((item) => item.value === selectedValue);
        return (
          <span className={Styles.optionValue} key={selectedValue}>
            <i style={{ backgroundColor: option?.color ?? "#94a3b8" }} />
            {option?.label ?? selectedValue}
          </span>
        );
      })}
    </span>
  );
};

const RecordListView = ({
  module,
  view,
  records,
  onModuleChanged,
}: RecordListViewProps) => {
  const { toast } = useToast();
  const { organization } = useWorkspaceData();
  const [showColumnPicker, setShowColumnPicker] = useState(false);
  const [showFieldBuilder, setShowFieldBuilder] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [isSavingColumns, setIsSavingColumns] = useState(false);
  const [selectedRecordIds, setSelectedRecordIds] = useState<Set<string>>(
    new Set(),
  );
  const [editingCell, setEditingCell] = useState<{
    recordId: string;
    fieldId: string;
  } | null>(null);
  const [selectCell, setSelectCell] = useState<{
    record: RecordModuleItem;
    field: RecordModuleField;
  } | null>(null);
  const [draftValue, setDraftValue] = useState("");
  const [multiSelectDraft, setMultiSelectDraft] = useState<string[]>([]);
  const [savingCell, setSavingCell] = useState("");
  const [savingOwnerId, setSavingOwnerId] = useState<string | null>(null);
  const cancelEditRef = useRef(false);
  const optionPicker = useOptionPicker();
  const configuredKeys = getColumnKeys(view);
  const fields = configuredKeys
    .map((key) => module.fields.find((field) => field.key === key))
    .filter((field): field is RecordModulePageData["fields"][number] =>
      Boolean(field),
    );
  const visibleFields = fields.length > 0 ? fields : module.fields;
  const visibleKeys = new Set(visibleFields.map((field) => field.key));
  const availableFields = module.fields.filter(
    (field) => !visibleKeys.has(field.key),
  );
  const gridTemplateColumns = `${visibleFields
    .map((_, index) =>
      index === 0 ? "clamp(220px, 20vw, 300px)" : "clamp(150px, 15vw, 300px)",
    )
    .join(" ")} clamp(180px, 16vw, 240px) 160px`;
  const fieldDrafts: RecordFieldDraft[] = module.fields.map((field) => ({
    key: field.key,
    label: field.label,
    type: field.type,
    required: field.required,
    unique: field.unique,
    defaultValue: field.defaultValue,
    isPrimary: field.isPrimary,
    position: field.position,
    config: field.config as RecordFieldDraft["config"],
    relationshipTargetModuleId:
      field.relationshipDefinition?.targetModuleId ?? null,
  }));

  const closeColumnPicker = () => {
    setShowColumnPicker(false);
    setSelectedKeys([]);
  };

  const saveColumns = () => {
    const t = toast.loading("Saving columns...");
    if (selectedKeys.length === 0) return;
    setIsSavingColumns(true);
    startTransition(async () => {
      const result = await saveRecordListViewColumns(module.key, view.id, [
        ...visibleFields.map((field) => field.key),
        ...selectedKeys,
      ]);
      if (!result.success) {
        t.error({
          title: "Columns not updated",
          description: result.error,
        });
        setIsSavingColumns(false);
        return;
      }

      await onModuleChanged();
      closeColumnPicker();
      setIsSavingColumns(false);
      t.success({
        title: "Columns added",
        description: `${selectedKeys.length} ${selectedKeys.length === 1 ? "field was" : "fields were"} added to this view.`,
      });
    });
  };

  const toggleRecord = (recordId: string) => {
    setSelectedRecordIds((current) => {
      const next = new Set(current);
      if (next.has(recordId)) next.delete(recordId);
      else next.add(recordId);
      return next;
    });
  };

  const allVisibleSelected =
    records.length > 0 &&
    records.every((record) => selectedRecordIds.has(record.id));
  const someVisibleSelected = records.some((record) =>
    selectedRecordIds.has(record.id),
  );

  const toggleAllRecords = () => {
    setSelectedRecordIds((current) => {
      const next = new Set(current);
      records.forEach((record) => {
        if (allVisibleSelected) next.delete(record.id);
        else next.add(record.id);
      });
      return next;
    });
  };

  const startEditing = (record: RecordModuleItem, field: RecordModuleField) => {
    if (savingCell) return;
    const value = getRecordFieldValue(record, field.id);
    cancelEditRef.current = false;
    setEditingCell({ recordId: record.id, fieldId: field.id });
    setDraftValue(toInputValue(field, value));
    setMultiSelectDraft(
      Array.isArray(value)
        ? value.filter((item): item is string => typeof item === "string")
        : [],
    );
  };

  const saveCellValue = async (
    record: RecordModuleItem,
    field: RecordModuleField,
    value: unknown,
  ) => {
    const t = toast.loading(`Saving ${field.label}...`);
    const cellKey = `${record.id}:${field.id}`;
    setEditingCell(null);
    setSavingCell(cellKey);
    const values = createInitialValues(
      module.fields,
      record.values,
      record.outgoingRelationships,
    );
    values[field.key] = value;

    try {
      const result = await updateModuleRecord(module.key, record.id, values);
      if (!result.success) {
        t.error({
          title: `${field.label} not saved`,
          description: result.error,
        });
        return false;
      }
      await onModuleChanged();
      t.success({
        title: `${field.label} saved`,
      });
      return true;
    } catch (error) {
      t.error({
        title: `${field.label} not saved`,
        description:
          error instanceof Error ? error.message : "Something went wrong.",
      });
      return false;
    } finally {
      setSavingCell("");
    }
  };

  const reassignRecord = async (
    record: RecordModuleItem,
    ownerId: string,
  ) => {
    if (record.ownerId === ownerId || savingOwnerId) return;

    setSavingOwnerId(record.id);
    const assignmentToast = toast.loading(`Reassigning ${record.displayName}...`);
    try {
      const result = await transferModuleRecordOwnership(record.id, ownerId);
      if (!result.success) {
        assignmentToast.error({
          title: "Assignment not changed",
          description: result.error,
        });
        return;
      }

      await onModuleChanged();
      assignmentToast.success({ title: `${record.displayName} reassigned` });
    } catch (error) {
      assignmentToast.error({
        title: "Assignment not changed",
        description:
          error instanceof Error ? error.message : "Something went wrong.",
      });
    } finally {
      setSavingOwnerId(null);
    }
  };

  const commitDraft = (record: RecordModuleItem, field: RecordModuleField) => {
    cancelEditRef.current = true;
    const value = NUMERIC_FIELD_TYPES.has(field.type)
      ? draftValue === ""
        ? ""
        : Number(draftValue)
      : draftValue;
    void saveCellValue(record, field, value);
  };

  const handleEditorKeyDown = (
    event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
    record: RecordModuleItem,
    field: RecordModuleField,
  ) => {
    if (event.key === "Escape") {
      event.preventDefault();
      cancelEditRef.current = true;
      setEditingCell(null);
    } else if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      commitDraft(record, field);
    }
  };

  const handleEditorBlur = (
    record: RecordModuleItem,
    field: RecordModuleField,
  ) => {
    if (cancelEditRef.current) {
      cancelEditRef.current = false;
      return;
    }
    commitDraft(record, field);
  };

  return (
    <div className={Styles.wrapper}>
      <div className={Styles.table}>
        <div className={Styles.header} style={{ gridTemplateColumns }}>
          {visibleFields.map((field, index) => (
            <div
              className={`${Styles.headerCell} ${index === 0 ? `${Styles.pinned} ${Styles.primaryHeader}` : ""}`}
              key={field.id}
            >
              {index === 0 && (
                <button
                  type="button"
                  className={`${Styles.selectButton} ${allVisibleSelected ? Styles.selectButtonChecked : someVisibleSelected ? Styles.selectButtonPartial : ""}`}
                  onClick={toggleAllRecords}
                  aria-label={
                    allVisibleSelected
                      ? "Clear visible record selection"
                      : "Select all visible records"
                  }
                >
                  {allVisibleSelected && <CheckmarkRegular fontSize={12} />}
                  {!allVisibleSelected && someVisibleSelected && (
                    <span className={Styles.partialMark} />
                  )}
                </button>
              )}
              <RecordFieldIcon type={field.type} />
              <span>{field.label}</span>
            </div>
          ))}
          <div className={Styles.headerCell}>
            <PersonRegular fontSize={16} />
            <span>Assigned to</span>
          </div>
          <button
            type="button"
            className={Styles.addColumnHeader}
            onClick={() => setShowColumnPicker(true)}
          >
            <AddRegular fontSize={16} />
            <span>Add column</span>
          </button>
        </div>
        {records.map((record) => (
          <div
            className={`${Styles.row} ${selectedRecordIds.has(record.id) ? Styles.selectedRow : ""}`}
            style={{ gridTemplateColumns }}
            key={record.id}
          >
            {visibleFields.map((field, index) => {
              const value = getRecordFieldValue(record, field.id);
              const cellKey = `${record.id}:${field.id}`;
              const isEditing =
                editingCell?.recordId === record.id &&
                editingCell.fieldId === field.id;
              const isSaving = savingCell === cellKey;

              return (
                <div
                  className={`${Styles.cell} ${field.isPrimary ? Styles.primary : ""} ${index === 0 ? `${Styles.pinned} ${Styles.primaryCell}` : ""}`}
                  key={field.id}
                >
                  {index === 0 && (
                    <>
                      <button
                        type="button"
                        className={`${Styles.selectButton} ${selectedRecordIds.has(record.id) ? Styles.selectButtonChecked : ""}`}
                        onClick={() => toggleRecord(record.id)}
                        aria-label={`${selectedRecordIds.has(record.id) ? "Deselect" : "Select"} ${record.displayName}`}
                      >
                        {selectedRecordIds.has(record.id) && (
                          <CheckmarkRegular fontSize={12} />
                        )}
                      </button>
                      <Link
                        className={Styles.avatarLink}
                        href={`/app/${organization.slug}/${module.key}/${record.id}`}
                        aria-label={`Open ${record.displayName}`}
                      >
                        <AvatarFallback
                          name={record.displayName}
                          entityKind="customer"
                          entityId={record.id}
                          size={22}
                          letterCount={1}
                          style={{ borderRadius: 5 }}
                        />
                      </Link>
                    </>
                  )}

                  {isEditing && field.type === RecordFieldType.RELATIONSHIP ? (
                    <RelationshipFieldSelect
                      className={Styles.inlineInput}
                      fieldId={field.id}
                      value={typeof value === "string" ? value : ""}
                      required={field.required}
                      disabled={isSaving}
                      onChange={(targetRecordId) =>
                        void saveCellValue(record, field, targetRecordId)
                      }
                    />
                  ) : isEditing && field.type === RecordFieldType.MULTI_SELECT ? (
                    <div className={Styles.multiSelectEditor}>
                      <div className={Styles.multiSelectOptions}>
                        {getFieldOptions(field).map((option) => (
                          <label key={option.value}>
                            <input
                              type="checkbox"
                              checked={multiSelectDraft.includes(option.value)}
                              onChange={(event) =>
                                setMultiSelectDraft((current) =>
                                  event.target.checked
                                    ? [...current, option.value]
                                    : current.filter(
                                        (item) => item !== option.value,
                                      ),
                                )
                              }
                            />
                            <i
                              style={{
                                backgroundColor: option.color ?? "#94a3b8",
                              }}
                            />
                            <span>{option.label}</span>
                          </label>
                        ))}
                      </div>
                      <div className={Styles.editorActions}>
                        <button
                          type="button"
                          onClick={() => setEditingCell(null)}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            void saveCellValue(record, field, multiSelectDraft)
                          }
                        >
                          Save
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
                        onKeyDown={(event) =>
                          handleEditorKeyDown(event, record, field)
                        }
                        onBlur={() => handleEditorBlur(record, field)}
                      />
                    ) : (
                      <input
                        autoFocus
                        className={Styles.inlineInput}
                        type={
                          NUMERIC_FIELD_TYPES.has(field.type)
                            ? "number"
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
                        onKeyDown={(event) =>
                          handleEditorKeyDown(event, record, field)
                        }
                        onBlur={() => handleEditorBlur(record, field)}
                      />
                    )
                  ) : field.type === RecordFieldType.DATE ||
                    field.type === RecordFieldType.DATETIME ? (
                    <RecordDateField
                      className={Styles.cellValue}
                      field={field}
                      value={value}
                      disabled={Boolean(savingCell)}
                      onChange={(nextValue) => {
                        void saveCellValue(record, field, nextValue);
                      }}
                    />
                  ) : (
                    <button
                      type="button"
                      className={Styles.cellValue}
                      disabled={Boolean(savingCell)}
                      onClick={(event) => {
                        if (field.type === RecordFieldType.SELECT) {
                          setSelectCell({ record, field });
                          optionPicker.open(event.currentTarget);
                        } else if (field.type === RecordFieldType.BOOLEAN) {
                          void saveCellValue(record, field, value !== true);
                        } else {
                          startEditing(record, field);
                        }
                      }}
                    >
                      {isSaving ? (
                        <span className={Styles.blankValue}>Saving...</span>
                      ) : field.type === RecordFieldType.SELECT ||
                        field.type === RecordFieldType.MULTI_SELECT ? (
                        <SelectValue field={field} value={value} />
                      ) : field.type === RecordFieldType.BOOLEAN ? (
                        <span className={Styles.booleanValue}>
                          {value === true ? (
                            <CheckboxCheckedRegular fontSize={17} />
                          ) : (
                            <CheckboxUncheckedRegular fontSize={17} />
                          )}
                          {value === true ? "Yes" : "No"}
                        </span>
                      ) : field.type === RecordFieldType.RELATIONSHIP ? (
                        getRecordRelationship(record, field.id)?.targetRecord
                          .displayName ?? "—"
                      ) : (
                        formatRecordValue(field, value)
                      )}
                    </button>
                  )}
                </div>
              );
            })}
            <RecordOwnerField
              className={Styles.ownerCell}
              organizationId={module.organizationId}
              owner={{
                id: record.owner.id,
                name: record.owner.user.name,
                email: record.owner.user.email,
                avatarUrl: record.owner.user.avatarUrl,
              }}
              onChange={
                module.canTransferOwnership
                  ? (owner) => void reassignRecord(record, owner.id)
                  : undefined
              }
              disabled={savingOwnerId !== null}
            />
            <div aria-hidden="true" />
          </div>
        ))}
      </div>
      {records.length === 0 && (
        <div className={Styles.empty}>
          No {module.pluralName?.toLowerCase() ?? "records"} yet.
        </div>
      )}
      {showColumnPicker && (
        <div className={Styles.pickerOverlay} onMouseDown={closeColumnPicker}>
          <section
            aria-labelledby="column-picker-title"
            aria-modal="true"
            className={SharedModalStyles.modalCard}
            onMouseDown={(event) => event.stopPropagation()}
            role="dialog"
          >
            <header className={SharedModalStyles.modalHeader}>
              <div>
                <h2 id="column-picker-title">Add columns</h2>
              </div>
              <button
                type="button"
                onClick={closeColumnPicker}
                aria-label="Close column picker"
                title="Close"
                className={SharedModalStyles.closeBtn}
              >
                <DismissRegular fontSize={18} />
              </button>
            </header>
            <div className={Styles.fieldOptions}>
              {availableFields.map((field) => (
                <label key={field.id} className={Styles.fieldOption}>
                  <input
                    type="checkbox"
                    checked={selectedKeys.includes(field.key)}
                    onChange={(event) =>
                      setSelectedKeys((current) =>
                        event.target.checked
                          ? [...current, field.key]
                          : current.filter((key) => key !== field.key),
                      )
                    }
                  />
                  <RecordFieldIcon type={field.type} />
                  <span>{field.label}</span>
                </label>
              ))}
              {availableFields.length === 0 && (
                <p className={Styles.noFields}>
                  All existing fields are already visible.
                </p>
              )}
            </div>
            <footer className={SharedModalStyles.modalFooter}>
              <MainButton
                type="secondary"
                text="New field"
                icon={{ type: "svg", src: <AddRegular /> }}
                onClick={() => {
                  closeColumnPicker();
                  setShowFieldBuilder(true);
                }}
              />
              {selectedKeys.length > 0 && (
                <MainButton
                  type="primary"
                  text={isSavingColumns ? "Saving..." : "Save"}
                  disabled={isSavingColumns}
                  onClick={saveColumns}
                />
              )}
            </footer>
          </section>
        </div>
      )}
      {showFieldBuilder && (
        <FieldBuilder
          moduleId={module.id}
          fieldToEdit={null}
          dataFields={fieldDrafts}
          hasRecordTitle
          allowRecordTitleChange={false}
          onClose={() => setShowFieldBuilder(false)}
          onSave={async (field) => {
            const result = await createRecordModuleField(
              module.key,
              view.id,
              field,
            );
            if (!result.success) {
              toast.error({
                title: "Field not created",
                description: result.error,
              });
              return false;
            }
            await onModuleChanged();
            return true;
          }}
        />
      )}
      {selectCell && optionPicker.isOpen && optionPicker.triggerRect && (
        <OptionPicker
          options={[
            ...(!selectCell.field.required
              ? [{ value: "", label: "None", color: "#94a3b8" }]
              : []),
            ...getFieldOptions(selectCell.field).map((option) => ({
              value: option.value,
              label: option.label,
              color: option.color ?? "#94a3b8",
            })),
          ]}
          currentValue={
            typeof getRecordFieldValue(
              selectCell.record,
              selectCell.field.id,
            ) === "string"
              ? (getRecordFieldValue(
                  selectCell.record,
                  selectCell.field.id,
                ) as string)
              : null
          }
          triggerRect={optionPicker.triggerRect}
          onSelect={(option) =>
            void saveCellValue(
              selectCell.record,
              selectCell.field,
              option.value,
            )
          }
          onClose={() => {
            optionPicker.close();
            setSelectCell(null);
          }}
        />
      )}
    </div>
  );
};

export default RecordListView;
