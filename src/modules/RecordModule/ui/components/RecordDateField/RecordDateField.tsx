"use client";

import { CalendarRegular } from "@fluentui/react-icons";
import { useRef, useState } from "react";
import DateTimePicker from "@/components/macro/DateTimePicker";
import { RecordFieldType } from "@/generated/prisma/enums";
import type { RecordModuleField } from "../../../types";
import { formatRecordValue } from "../record-values";
import Styles from "./RecordDateField.module.css";

type RecordDateFieldProps = {
  field: RecordModuleField;
  value: unknown;
  className?: string;
  id?: string;
  disabled?: boolean;
  onChange: (value: string) => void | Promise<void>;
};

const parseValue = (field: RecordModuleField, value: unknown) => {
  if (typeof value !== "string" || !value) return undefined;

  if (field.type === RecordFieldType.DATE) {
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
    if (!match) return undefined;
    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    return Number.isNaN(date.getTime()) ? undefined : date;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
};

const formatDateOnly = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const RecordDateField = ({
  field,
  value,
  className,
  id,
  disabled = false,
  onChange,
}: RecordDateFieldProps) => {
  const [triggerRect, setTriggerRect] = useState<DOMRect | null>(null);
  const pendingValueRef = useRef<string | null>(null);
  const isDateTime = field.type === RecordFieldType.DATETIME;

  const closePicker = () => {
    setTriggerRect(null);
    if (pendingValueRef.current === null) return;

    const pendingValue = pendingValueRef.current;
    pendingValueRef.current = null;
    void onChange(pendingValue);
  };

  return (
    <>
      <button
        id={id}
        type="button"
        className={className}
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={triggerRect !== null}
        onClick={(event) => {
          pendingValueRef.current = null;
          setTriggerRect(event.currentTarget.getBoundingClientRect());
        }}
      >
        <span className={Styles.value}>{formatRecordValue(field, value)}</span>
      </button>

      {triggerRect && (
        <DateTimePicker
          category={isDateTime ? "datetime" : "date"}
          dataType={isDateTime ? { datetime: "single" } : { date: "single" }}
          triggerRect={triggerRect}
          initialStart={parseValue(field, value)}
          onChange={({ start }) => {
            const nextValue = isDateTime ? start.toISOString() : formatDateOnly(start);
            if (isDateTime) {
              pendingValueRef.current = nextValue;
              return;
            }

            setTriggerRect(null);
            void onChange(nextValue);
          }}
          onClose={closePicker}
        />
      )}
    </>
  );
};

export default RecordDateField;