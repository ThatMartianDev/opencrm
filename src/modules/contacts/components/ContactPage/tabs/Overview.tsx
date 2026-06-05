"use client";

import { ContactWithRelations } from "../../../types";
import Styles from "./Styles.module.css";
import AvatarFallback from "@/components/micro/AvatarFallback/AvatarFallback";
import { ActivityLog } from "@/modules/activity-log";
import {
  TagRegular,
  MailRegular,
  CallRegular,
  BriefcaseRegular,
  BuildingRegular,
  PersonRegular,
} from "@fluentui/react-icons";
import { useEffect, useRef, useState } from "react";
import { updateContactField } from "../../../actions";

type EditableField = "name" | "email" | "phone" | "jobTitle" | "source";

const OverviewTab = ({
  contact,
  onRefresh,
}: {
  contact: ContactWithRelations;
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
    setEditValue((contact[field] as string) || "");
  };

  const commitEdit = () => {
    if (!editingField) return;
    const trimmed = editValue.trim();
    updateContactField(contact.id, editingField, trimmed).then(() =>
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
          <p>{(contact[field] as string) || "—"}</p>
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
                    name={contact.name}
                    entityKind="customer"
                    entityId={contact.id}
                    size={20}
                    letterCount={1}
                  />
                  <p>{contact.name}</p>
                </div>
              )}
            </div>
            {renderField("email", "Email", <MailRegular fontSize={16} />)}
            {renderField("phone", "Phone", <CallRegular fontSize={16} />)}
            {renderField(
              "jobTitle",
              "Job Title",
              <BriefcaseRegular fontSize={16} />,
            )}
            {renderField("source", "Source", <PersonRegular fontSize={16} />)}
            <div className={Styles.info_row}>
              <div className={Styles.info_label}>
                <BuildingRegular fontSize={16} />
                <p>Company:</p>
              </div>
              <div className={Styles.info_value}>
                <p>{contact.company?.name || "—"}</p>
              </div>
            </div>
            <div className={Styles.info_row}>
              <p>Created on:</p>
              <p>{new Date(contact.createdAt).toLocaleDateString()}</p>
            </div>
          </div>
        </div>

        <ActivityLog
          key={activityKey}
          entityType="contact"
          entityId={contact.id}
        />
      </div>
    </div>
  );
};

export default OverviewTab;
