"use client";

import { CompanyWithRelations } from "../../../types";
import Styles from "./Styles.module.css";
import AvatarFallback from "@/components/micro/AvatarFallback/AvatarFallback";
import { ActivityLog } from "@/modules/activity-log";
import {
  TagRegular,
  MailRegular,
  CallRegular,
  GlobeRegular,
  BuildingRegular,
  PeopleRegular,
  LocationRegular,
} from "@fluentui/react-icons";
import { useEffect, useRef, useState } from "react";
import { updateCompanyField } from "../../../actions";

type EditableField =
  | "name"
  | "email"
  | "phone"
  | "website"
  | "industry"
  | "size"
  | "address";

const OverviewTab = ({
  company,
  onRefresh,
}: {
  company: CompanyWithRelations;
  onRefresh?: () => void;
}) => {
  const [activityKey, setActivityKey] = useState(0);
  const [editingField, setEditingField] = useState<EditableField | null>(null);
  const [editValue, setEditValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const refreshAll = () => {
    onRefresh?.();
    setActivityKey((k) => k + 1);
  };

  useEffect(() => {
    if (editingField && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingField]);

  const startEditing = (field: EditableField) => {
    setEditingField(field);
    setEditValue((company[field] as string) || "");
  };

  const commitEdit = () => {
    if (!editingField) return;
    const trimmed = editValue.trim();
    updateCompanyField(company.id, editingField, trimmed).then(() =>
      refreshAll(),
    );
    setEditingField(null);
  };

  const cancelEdit = () => setEditingField(null);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") commitEdit();
    else if (e.key === "Escape") cancelEdit();
  };

  const renderField = (
    field: EditableField,
    label: string,
    icon: React.ReactNode,
  ) => (
    <div className={Styles.info_row}>
      <div className={Styles.info_label}>
        {icon}
        <p>{label}:</p>
      </div>
      {editingField === field ? (
        <input
          ref={inputRef}
          className={Styles.inline_input}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={handleKeyDown}
        />
      ) : (
        <div className={Styles.info_value} onClick={() => startEditing(field)}>
          <p>{(company[field] as string) || "—"}</p>
        </div>
      )}
    </div>
  );

  return (
    <div id={Styles.overviewTab}>
      <div id={Styles.overview_content}>
        <div id={Styles.details} className="flex-col">
          <h2>Details</h2>
          <div id={Styles.info_table}>
            <div className={Styles.info_row}>
              <div className={Styles.info_label}>
                <TagRegular fontSize={16} />
                <p>Name:</p>
              </div>
              {editingField === "name" ? (
                <input
                  ref={inputRef}
                  className={Styles.inline_input}
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={commitEdit}
                  onKeyDown={handleKeyDown}
                />
              ) : (
                <div
                  className={Styles.name_wrapper}
                  onClick={() => startEditing("name")}
                >
                  <AvatarFallback
                    name={company.name}
                    entityKind="customer"
                    entityId={company.id}
                    size={20}
                    style={{ borderRadius: 6 }}
                    letterCount={1}
                  />
                  <p>{company.name}</p>
                </div>
              )}
            </div>
            {renderField("email", "Email", <MailRegular fontSize={16} />)}
            {renderField("phone", "Phone", <CallRegular fontSize={16} />)}
            {renderField("website", "Website", <GlobeRegular fontSize={16} />)}
            {renderField(
              "industry",
              "Industry",
              <BuildingRegular fontSize={16} />,
            )}
            {renderField("size", "Size", <PeopleRegular fontSize={16} />)}
            {renderField(
              "address",
              "Address",
              <LocationRegular fontSize={16} />,
            )}
            <div className={Styles.info_row}>
              <p>Created on:</p>
              <p>{new Date(company.createdAt).toLocaleDateString()}</p>
            </div>
          </div>
        </div>

        <ActivityLog
          key={activityKey}
          entityType="company"
          entityId={company.id}
        />
      </div>
    </div>
  );
};

export default OverviewTab;
