import { DealWithRelations } from "../../../types";
import Styles from "./Styles.module.css";
import AvatarFallback from "@/components/micro/AvatarFallback/AvatarFallback";
import { ActivityLog } from "@/modules/activity-log";
import {
  TagRegular,
  MoneyRegular,
  PersonRegular,
  BuildingRegular,
} from "@fluentui/react-icons";
import { useEffect, useRef, useState } from "react";
import {
  MemberPicker,
  PickerMember,
  useMemberPicker,
} from "@/components/macro/MemberPicker";
import { useWorkspaceData } from "@/modules/workspace/components/workspace-provider";
import { useToast } from "@/components/macro/Toaster";
import {
  assignDeal,
  updateDealStage,
  updateDealStatus,
  updateDealField,
  updateDealRelation,
} from "@/modules/deals/actions";
import {
  OptionPicker,
  PickerOption,
  useOptionPicker,
} from "@/components/macro/OptionPicker";
import {
  DEAL_STAGE_OPTIONS,
  DEAL_STATUS_OPTIONS,
} from "@/modules/deals/config";
import { DealStage } from "@/generated/prisma/enums";
import { ContactPicker, PickerContact, useContactPicker } from "@/components/macro/ContactPicker";
import { CompanyPicker, PickerCompany, useCompanyPicker } from "@/components/macro/CompanyPicker";

const OverviewTab = ({
  deal,
  onRefresh,
}: {
  deal: DealWithRelations | null;
  onRefresh?: () => void;
}) => {
  const { organizationId } = useWorkspaceData();
  const { toast } = useToast();
  const picker = useMemberPicker();
  const stagePicker = useOptionPicker();
  const statusPicker = useOptionPicker();
  const contactPicker = useContactPicker();
  const companyPicker = useCompanyPicker();

  const [activityKey, setActivityKey] = useState(0);

  const refreshAll = () => {
    onRefresh?.();
    setActivityKey((k) => k + 1);
  };

  const assignee = deal?.assignedTo
    ? { id: deal.assignedToId!, name: deal.assignedTo.user.name, avatarUrl: deal.assignedTo.user.avatarUrl }
    : null;
  const [localAssignee, setLocalAssignee] = useState<{
    id: string;
    name: string | null;
    avatarUrl: string | null;
  } | null>(assignee);

  const [editingField, setEditingField] = useState<"title" | null>(null);
  const [editValue, setEditValue] = useState("");
  const [dealTitle, setDealTitle] = useState(deal?.title || "");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (deal) {
      setDealTitle(deal.title || "");
    }
  }, [deal]);

  useEffect(() => {
    if (editingField && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingField]);

  const startEditing = () => {
    setEditingField("title");
    setEditValue(dealTitle);
  };

  const commitEdit = () => {
    if (!editingField || !deal) {
      setEditingField(null);
      return;
    }
    const trimmed = editValue.trim();
    if (!trimmed) {
      setEditingField(null);
      return;
    }
    const t = toast.loading("Updating title...");
    updateDealField(deal.id, "title", trimmed).then(() => {
      setDealTitle(trimmed);
      refreshAll();
      t.success({ title: "Title updated", duration: 3000 });
    }).catch((err) => {
      t.error({ title: "Failed to update title", description: err instanceof Error ? err.message : "Something went wrong." });
    });
    setEditingField(null);
  };

  const cancelEdit = () => setEditingField(null);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") commitEdit();
    else if (e.key === "Escape") cancelEdit();
  };

  const handleSelectMember = (member: PickerMember) => {
    if (member) {
      const t = toast.loading("Assigning deal...");
      assignDeal(deal?.id || "", member.id, member.name || "Unknown").then(() => {
        setLocalAssignee({
          id: member.id,
          name: member.name,
          avatarUrl: member.avatarUrl,
        });
        refreshAll();
        t.success({ title: "Deal assigned", description: `Assigned to ${member.name || "member"}.`, duration: 3000 });
      }).catch((err) => {
        t.error({ title: "Failed to assign deal", description: err instanceof Error ? err.message : "You may not have permission." });
      });
    }
  };

  const handleStageSelect = (option: PickerOption) => {
    if (deal && option) {
      const t = toast.loading("Updating stage...");
      updateDealStage(deal.id, option.value as DealStage).then(() => {
        refreshAll();
        t.success({ title: "Stage updated", description: `Deal moved to ${option.label}.`, duration: 3000 });
      }).catch((err) => {
        t.error({ title: "Failed to update stage", description: err instanceof Error ? err.message : "You may not have permission." });
      });
    }
  };

  const handleStatusSelect = (option: PickerOption) => {
    if (deal && option) {
      const t = toast.loading("Updating status...");
      updateDealStatus(deal.id, option.value).then(() => {
        refreshAll();
        t.success({ title: "Status updated", description: `Status set to ${option.label}.`, duration: 3000 });
      }).catch((err) => {
        t.error({ title: "Failed to update status", description: err instanceof Error ? err.message : "You may not have permission." });
      });
    }
  };

  const handleContactSelect = (contact: PickerContact) => {
    if (deal) {
      const t = toast.loading("Linking contact...");
      updateDealRelation(deal.id, "contactId", contact.id, contact.name).then(() => {
        if (contact.companyId) {
          updateDealRelation(deal.id, "companyId", contact.companyId, contact.companyName || "").then(() => refreshAll());
        } else {
          refreshAll();
        }
        t.success({ title: "Contact linked", description: `${contact.name} linked to deal.`, duration: 3000 });
      }).catch((err) => {
        t.error({ title: "Failed to link contact", description: err instanceof Error ? err.message : "Something went wrong." });
      });
    }
  };

  const handleCompanySelect = (company: PickerCompany) => {
    if (deal) {
      const t = toast.loading("Linking company...");
      updateDealRelation(deal.id, "companyId", company.id, company.name).then(() => {
        updateDealRelation(deal.id, "contactId", null, "").then(() => refreshAll());
        t.success({ title: "Company linked", description: `${company.name} linked to deal.`, duration: 3000 });
      }).catch((err) => {
        t.error({ title: "Failed to link company", description: err instanceof Error ? err.message : "Something went wrong." });
      });
    }
  };

  useEffect(() => {
    if (deal) {
      setLocalAssignee(
        deal.assignedTo
          ? { id: deal.assignedToId!, name: deal.assignedTo.user.name, avatarUrl: deal.assignedTo.user.avatarUrl }
          : null
      );
    }
  }, [deal?.assignedToId]);

  return (
    <div id={Styles.overviewTab}>
      <div id={Styles.overview_content}>
        <div id={Styles.lead_details} className="flex-col">
          <h2>Details</h2>
          <div id={Styles.info_table}>
            <div className={Styles.info_row}>
              <div className={Styles.info_label}>
                <TagRegular fontSize={16} />
                <p>Title:</p>
              </div>
              {editingField === "title" ? (
                <input
                  ref={inputRef}
                  className={Styles.inline_input}
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={commitEdit}
                  onKeyDown={handleKeyDown}
                />
              ) : (
                <div className={Styles.name_wrapper} onClick={startEditing}>
                  <AvatarFallback
                    name={dealTitle || "Untitled Deal"}
                    entityKind="customer"
                    entityId={deal?.id}
                    size={20}
                    style={{ borderRadius: 6 }}
                    letterCount={1}
                  />
                  <p>{dealTitle || "Untitled Deal"}</p>
                </div>
              )}
            </div>
            <div className={Styles.info_row}>
              <div className={Styles.info_label}>
                <MoneyRegular fontSize={16} />
                <p>Value:</p>
              </div>
              <p>
                {deal?.value
                  ? `${deal.currency ?? ""} ${deal.value}`.trim()
                  : "N/A"}
              </p>
            </div>
            <div className={Styles.info_row}>
              <div className={Styles.info_label}>
                <PersonRegular fontSize={16} />
                <p>Contact:</p>
              </div>
              <button
                className={Styles.name_wrapper}
                onClick={(e) => contactPicker.open(e.currentTarget)}
              >
                <p>{deal?.contact?.name || "None"}</p>
              </button>
            </div>
            <div className={Styles.info_row}>
              <div className={Styles.info_label}>
                <BuildingRegular fontSize={16} />
                <p>Company:</p>
              </div>
              <button
                className={Styles.name_wrapper}
                onClick={(e) => companyPicker.open(e.currentTarget)}
              >
                <p>{deal?.company?.name || "None"}</p>
              </button>
            </div>
            <div className={`${Styles.info_row} ${Styles.stage_status_row}`}>
              <p>Stage:</p>
              <button onClick={(e) => stagePicker.open(e.currentTarget)}>
                <span
                  style={{
                    backgroundColor:
                      DEAL_STAGE_OPTIONS.find(
                        (opt) => opt.value === deal?.stage,
                      )?.color || "grey",
                  }}
                ></span>
                <p>{DEAL_STAGE_OPTIONS.find((opt) => opt.value === deal?.stage)?.label || "Set Stage"}</p>
              </button>
            </div>
            <div className={`${Styles.info_row} ${Styles.stage_status_row}`}>
              <p>Status:</p>
              <button onClick={(e) => statusPicker.open(e.currentTarget)}>
                <span
                  style={{
                    backgroundColor:
                      DEAL_STATUS_OPTIONS.find(
                        (opt) => opt.value === deal?.status,
                      )?.color || "grey",
                  }}
                ></span>
                <p>{DEAL_STATUS_OPTIONS.find((opt) => opt.value === deal?.status)?.label || "Set Status"}</p>
              </button>
            </div>
            <div className={Styles.info_row}>
              <p>Created on:</p>
              <p>
                {deal?.createdAt
                  ? new Date(deal.createdAt).toLocaleDateString()
                  : "N/A"}
              </p>
            </div>
            <div className={Styles.info_row}>
              <div className={Styles.info_label}>
                <p>Assigned to:</p>
              </div>
              <button
                className={Styles.name_wrapper}
                onClick={(e) => picker.open(e.currentTarget)}
              >
                {localAssignee ? (
                  <div className={Styles.name_wrapper}>
                    <AvatarFallback
                      name={localAssignee.name || "Unknown"}
                      entityKind="customer"
                      entityId={localAssignee.id}
                      size={20}
                    />
                    <p>{localAssignee.name || "Unknown"}</p>
                  </div>
                ) : (
                  <p>Unassigned</p>
                )}
              </button>
            </div>
          </div>
        </div>
        {deal?.id && (
          <ActivityLog
            entityType="deal"
            entityId={deal.id}
            onRefresh={onRefresh}
            refreshKey={activityKey}
          />
        )}
      </div>
      {picker.isOpen && picker.triggerRect && (
        <MemberPicker
          organizationId={organizationId}
          triggerRect={picker.triggerRect}
          onSelect={handleSelectMember}
          onClose={picker.close}
        />
      )}
      {stagePicker.isOpen && stagePicker.triggerRect && (
        <OptionPicker
          options={DEAL_STAGE_OPTIONS}
          currentValue={deal?.stage}
          triggerRect={stagePicker.triggerRect}
          onSelect={handleStageSelect}
          onClose={stagePicker.close}
        />
      )}
      {statusPicker.isOpen && statusPicker.triggerRect && (
        <OptionPicker
          options={DEAL_STATUS_OPTIONS}
          currentValue={deal?.status ?? undefined}
          triggerRect={statusPicker.triggerRect}
          onSelect={handleStatusSelect}
          onClose={statusPicker.close}
        />
      )}
      {contactPicker.isOpen && contactPicker.triggerRect && (
        <ContactPicker
          triggerRect={contactPicker.triggerRect}
          companyId={deal?.company?.id || undefined}
          onSelect={handleContactSelect}
          onClose={contactPicker.close}
        />
      )}
      {companyPicker.isOpen && companyPicker.triggerRect && (
        <CompanyPicker
          triggerRect={companyPicker.triggerRect}
          onSelect={handleCompanySelect}
          onClose={companyPicker.close}
        />
      )}
    </div>
  );
};

export default OverviewTab;
