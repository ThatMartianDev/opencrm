import React, { useState } from "react";
import type { ShortnedRecordField } from "../types";
import Styles from "./FieldsList.module.css";
import {
    AddFilled,
  ChevronDownFilled,
  DeleteRegular,
  EditRegular,
  GridDotsFilled,
} from "@fluentui/react-icons";
import FieldBuilder from "../FieldBuilder/FieldBuilder";
import { FieldTypes } from "../config";
import { useToast } from "@/components/macro/Toaster";

const FieldItem = ({
  field,
  index,
  isDragging,
  isDragTarget,
  onEdit,
  onDelete,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onMove,
}: {
  field: ShortnedRecordField;
  index: number;
  isDragging: boolean;
  isDragTarget: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onDragStart: (event: React.DragEvent<HTMLButtonElement>) => void;
  onDragOver: (event: React.DragEvent<HTMLDivElement>) => void;
  onDrop: (event: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd: () => void;
  onMove: (direction: -1 | 1) => void;
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const FieldIcon = FieldTypes.find((type) => type.type === field.type)?.icon;

  return (
    <div
      className={`${Styles.fieldItemWrapper} ${isDragging ? Styles.dragging : ""} ${isDragTarget ? Styles.dragTarget : ""}`}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <div className={Styles.field_item}>
        <button
          className={Styles.pan_handle}
          aria-label={`Reorder ${field.label}. Use arrow keys or drag to move.`}
          draggable
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          onKeyDown={(event) => {
            if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
            event.preventDefault();
            onMove(event.key === "ArrowUp" ? -1 : 1);
          }}
          title={`Position ${index + 1}. Drag or use arrow keys to reorder.`}
        >
          <GridDotsFilled />
        </button>
        <div className={Styles.fields_info}>
          <span className={Styles.field_icon}>
            {FieldIcon && <FieldIcon fontSize={16} />}
          </span>
          <span className={Styles.fieldLabel}>{field.label}</span>
          {field.isPrimary && (
            <span className={Styles.primaryBadge}>Record title</span>
          )}
        </div>
        <div className={Styles.field_actions}>
          {field.config?.options && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              aria-label={`${isExpanded ? "Hide" : "Show"} ${field.label} options`}
            >
              <ChevronDownFilled className={isExpanded ? Styles.expandedIcon : ""} />
            </button>
          )}
          <button onClick={onEdit} aria-label={`Edit ${field.label}`}>
            <EditRegular />
          </button>
          <button onClick={onDelete} aria-label={`Delete ${field.label}`}>
            <DeleteRegular />
          </button>
        </div>
      </div>
      {isExpanded && field.config?.options && (
        <div className={Styles.optionPreview}>
          {field.config.options.map((option) => (
            <span key={option.value}>
              <i style={{ backgroundColor: option.color }} />
              {option.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

const FieldsList = ({
  dataFields,
  setDataFields,
}: {
  dataFields: ShortnedRecordField[] | null;
  setDataFields: React.Dispatch<
    React.SetStateAction<ShortnedRecordField[] | null>
  >;
}) => {
  const { toast } = useToast();
  const [openFieldBuilder, setOpenFieldBuilder] = useState(false);
  const [fields, setFields] = useState<ShortnedRecordField[] | null>(
    dataFields || null,
  );
  const [fieldToEdit, setFieldToEdit] = useState<ShortnedRecordField | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragTargetIndex, setDragTargetIndex] = useState<number | null>(null);

  const updateFields: React.Dispatch<
    React.SetStateAction<ShortnedRecordField[] | null>
  > = (action) => {
    const updatedFields =
      typeof action === "function" ? action(fields) : action;
    const nextFields = updatedFields?.map((field, index) => ({
      ...field,
      position: index + 1,
    })) ?? null;
    setFields(nextFields);
    setDataFields(nextFields);
  };

  const closeFieldBuilder = () => {
    setOpenFieldBuilder(false);
    setFieldToEdit(null);
  };

  const moveField = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex || toIndex < 0 || toIndex >= (fields?.length || 0)) {
      return;
    }

    updateFields((current) => {
      const reorderedFields = [...(current || [])];
      const [movedField] = reorderedFields.splice(fromIndex, 1);

      if (!movedField) return current;

      reorderedFields.splice(toIndex, 0, movedField);
      return reorderedFields.map((field, index) => ({
        ...field,
        position: index + 1,
      }));
    });
  };

  const resetDragState = () => {
    setDraggedIndex(null);
    setDragTargetIndex(null);
  };

  const deleteField = (field: ShortnedRecordField) => {
    if (field.isPrimary) {
      toast.error({
        title: "Record title required",
        description:
          "Choose another text field as the record title before deleting this field.",
      });
      return;
    }

    updateFields((current) =>
      (current || []).filter((existingField) => existingField !== field),
    );
    toast.success({
      title: "Field deleted",
      description: `"${field.label}" was removed.`,
    });
  };

  return (
    <div id={Styles.FieldsList}>
      <div className={Styles.fields_list}>
        {fields?.map((field, index) => (
          <FieldItem
            key={`${field.label}-${field.type}-${index}`}
            field={field}
            index={index}
            isDragging={draggedIndex === index}
            isDragTarget={dragTargetIndex === index && draggedIndex !== index}
            onEdit={() => {
              setFieldToEdit(field);
              setOpenFieldBuilder(true);
            }}
            onDelete={() => deleteField(field)}
            onDragStart={(event) => {
              setDraggedIndex(index);
              event.dataTransfer.effectAllowed = "move";
              event.dataTransfer.setData("text/plain", String(index));
            }}
            onDragOver={(event) => {
              event.preventDefault();
              event.dataTransfer.dropEffect = "move";
              setDragTargetIndex(index);
            }}
            onDrop={(event) => {
              event.preventDefault();
              const sourceValue = event.dataTransfer.getData("text/plain");
              const sourceIndex = Number(sourceValue);

              if (sourceValue !== "" && Number.isInteger(sourceIndex)) {
                moveField(sourceIndex, index);
              }
              resetDragState();
            }}
            onDragEnd={resetDragState}
            onMove={(direction) => moveField(index, index + direction)}
          />
        ))}
        <button
          className={Styles.addField}
          onClick={() => {
            setFieldToEdit(null);
            setOpenFieldBuilder(true);
          }}
        >
          <AddFilled fontSize={20} />
          <p>Add Field</p>
        </button>
      </div>
      {openFieldBuilder && (
        <FieldBuilder
          fieldToEdit={fieldToEdit}
          setDataFields={updateFields}
          hasRecordTitle={fields?.some((field) => field.isPrimary) ?? false}
          onClose={closeFieldBuilder}
        />
      )}
    </div>
  );
};

export default FieldsList;
