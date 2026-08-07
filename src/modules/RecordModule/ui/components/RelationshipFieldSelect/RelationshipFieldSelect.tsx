"use client";

import { useEffect, useState } from "react";
import { getRelationshipFieldOptions } from "../../../actions";
import AvatarSelect from "../AvatarSelect/AvatarSelect";

type RelationshipFieldSelectProps = {
  fieldId: string;
  value: string;
  required?: boolean;
  disabled?: boolean;
  id?: string;
  className?: string;
  selectedName?: string;
  onChange: (targetRecordId: string) => void;
};

const RelationshipFieldSelect = ({
  fieldId,
  value,
  required = false,
  disabled = false,
  id,
  className,
  selectedName,
  onChange,
}: RelationshipFieldSelectProps) => {
  const [options, setOptions] = useState<
    Awaited<ReturnType<typeof getRelationshipFieldOptions>>
  >([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    getRelationshipFieldOptions(fieldId)
      .then((records) => {
        if (!cancelled) setOptions(records);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fieldId]);

  return (
    <div id={id}>
      <AvatarSelect
        className={className}
        options={options.map((option) => ({
          id: option.id,
          name: option.displayName,
        }))}
        value={value}
        selectedName={selectedName}
        placeholder={isLoading ? "Loading records..." : "Select a record"}
        emptyText="No records available"
        entityKind="customer"
        disabled={disabled || isLoading}
        allowClear={!required}
        onChange={(option) => onChange(option?.id ?? "")}
      />
    </div>
  );
};

export default RelationshipFieldSelect;