"use client";

import { useState } from "react";
import { ClipboardTaskRegular } from "@fluentui/react-icons";
import MainButton from "@/components/micro/MainButton/MainButton";
import S from "@/components/macro/ModalProvider/SharedStyles.module.css";
import { logActivity } from "../actions";
import { EntityType } from "../types";


import { ActivityType, ActivityOutcome } from "@/generated/prisma/enums";
import {ACTIVITY_TYPES, ACTIVITY_VERDICTS} from "@/modules/activity-log/components/enums";

type LogActivityModalProps = {
  onClose: () => void;
  onSuccess?: () => void;
  entityType?: EntityType;
  entityId?: string;
};

const LogActivityModal = ({
  onClose,
  onSuccess,
  entityType,
  entityId,
}: LogActivityModalProps) => {
  const [activityType, setActivityType] = useState<ActivityType | "">("");
  const [outcome, setOutcome] = useState<ActivityOutcome | "">("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!activityType || !entityType || !entityId) return;
    const typeLabel = ACTIVITY_TYPES.find((type) => type.value === activityType)?.label;
    const outcomeLabel = ACTIVITY_VERDICTS.find(
      (verdict) => verdict.parent === activityType,
    )?.options.find((option) => option.value === outcome)?.label;
    setLoading(true);
    try {
      await logActivity({
        entityType,
        entityId,
        activityType,
        outcome: outcome || undefined,
        title: outcomeLabel ? `${typeLabel} - ${outcomeLabel}` : typeLabel ?? "Activity logged",
        description: note.trim() || undefined,
      });
      onSuccess?.();
      onClose();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={S.modalCard}>
      <div className={S.modalHeader}>
        <span style={{ backgroundColor: "#0e76b9" }}>
          <ClipboardTaskRegular style={{ fontSize: 22, color: "#ffffff" }} />
        </span>
        <h2>Log Activity</h2>
      </div>

      <div className={S.modalBody}>
        <div className="form-group">
          <label className="form-label">
            Activity Type <span className="required">*</span>
          </label>
          <select
            className="form-input"
            value={activityType}
            onChange={(e) => setActivityType(e.target.value as ActivityType)}
          >
            <option value="">Select type...</option>
            {ACTIVITY_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        {activityType && (
          <div className="form-group">
            <label className="form-label">Outcome</label>
            <select name="outcome" id="outcome" className="form-input" onChange={(e) => setOutcome(e.target.value as ActivityOutcome)}>
              <option value="">Select outcome...</option>
              {activityType &&
                ACTIVITY_VERDICTS.find(
                  (v) => v.parent === activityType,
                )?.options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
            </select>
          </div>
        )}

        <div className="form-group">
          <label className="form-label">Note</label>
          <textarea
            className="form-input"
            rows={3}
            placeholder="Optional details..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
      </div>

      <div className={S.modalFooter}>
        <MainButton text="Cancel" onClick={onClose} type="secondary" />
        <MainButton
          text={loading ? "Saving..." : "Log Activity"}
          onClick={handleSubmit}
          type="primary"
        />
      </div>
    </div>
  );
};

export default LogActivityModal;
