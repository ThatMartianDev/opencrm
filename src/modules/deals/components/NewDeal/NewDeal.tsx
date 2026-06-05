"use client";
import { useState } from "react";
import { TargetFilled } from "@fluentui/react-icons";
import MainButton from "@/components/micro/MainButton/MainButton";
import S from "@/components/macro/ModalProvider/SharedStyles.module.css";
import { DealStage } from "@/generated/prisma/enums";
import { createDeal } from "@/modules/deals/actions";
import { useWorkspaceData } from "@/modules/workspace/components/workspace-provider";
import { useToast } from "@/components/macro/Toaster";
import {
  PickerMember,
  useMemberPicker,
} from "@/components/macro/MemberPicker/useMemberPicker";
import { MemberPicker } from "@/components/macro/MemberPicker";
import { ContactPicker, PickerContact, useContactPicker } from "@/components/macro/ContactPicker";
import { CompanyPicker, PickerCompany, useCompanyPicker } from "@/components/macro/CompanyPicker";

type NewDealProps = {
  onClose: () => void;
};

const STAGES = Object.values(DealStage);
const STATUSES = [
  "Contacted",
  "Not Responding",
  "Proposal Sent",
  "Negotiation",
  "Follow Up",
] as const;

const NewDeal = ({ onClose }: NewDealProps) => {
  const { organizationId } = useWorkspaceData();
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [stage, setStage] = useState<DealStage | string>("");
  const [status, setStatus] = useState("");
  const [value, setValue] = useState("");
  const [assignTo, setAssignTo] = useState("");
  const [contactId, setContactId] = useState("");
  const [contactName, setContactName] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [companyName, setCompanyName] = useState("");

  const picker = useMemberPicker();
  const contactPicker = useContactPicker();
  const companyPicker = useCompanyPicker();

  const handleSelectMember = (member: PickerMember) => {
    if (member) {
      setAssignTo(member.id);
    }
  };

  const handleSelectContact = (contact: PickerContact) => {
    setContactId(contact.id);
    setContactName(contact.name);
    if (contact.companyId) {
      setCompanyId(contact.companyId);
      setCompanyName(contact.companyName || "");
    }
  };

  const handleSelectCompany = (company: PickerCompany) => {
    setCompanyId(company.id);
    setCompanyName(company.name);
    // Clear contact if it doesn't belong to the new company
    if (contactId) {
      setContactId("");
      setContactName("");
    }
  };

  async function handleCreate() {
    if (!title || !stage) return;
    const t = toast.loading("Creating deal...");
    try {
      await createDeal({
        title,
        stage: stage as DealStage,
        status: status || undefined,
        value: value ? parseFloat(value) : undefined,
        assignedToId: assignTo || undefined,
        contactId: contactId || undefined,
        companyId: companyId || undefined,
      });
      t.success({
        title: "Deal created",
        description: `Your deal "${title}" has been created.`,
        duration: 5000,
        actions: [
          { label: "View deal", onClick: () => {}, primary: true },
        ],
      });
      onClose();
    } catch (err) {
      t.error({
        title: "Failed to create deal",
        description: err instanceof Error ? err.message : "Something went wrong.",
      });
    }
  }

  return (
    <div className={S.modalCard}>
      <div className={S.modalHeader}>
        <span style={{ backgroundColor: "#008236" }}>
          <TargetFilled style={{ fontSize: 22, color: "#ffffff" }} />
        </span>
        <h2>New Deal</h2>
      </div>

      <div className={S.modalBody}>
        <div className="form-group">
          <label className="form-label">
            Deal Title <span className="required">*</span>
          </label>
          <input
            className="form-input"
            type="text"
            placeholder="e.g. Website redesign for Acme Corp"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">
              Stage <span className="required">*</span>
            </label>
            <select
              className={`form-select ${!stage ? "placeholder" : ""}`}
              value={stage}
              onChange={(e) => setStage(e.target.value)}
            >
              <option value="" disabled>
                Choose Stage
              </option>
              {STAGES.map((s) => (
                <option key={s} value={s}>
                  {s.charAt(0) + s.slice(1).toLowerCase()}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Status</label>
            <select
              className={`form-select ${!status ? "placeholder" : ""}`}
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="" disabled>
                Choose Status
              </option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Value</label>
          <input
            className="form-input"
            type="number"
            placeholder="0.00"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Assign to</label>
          <button onClick={(e) => picker.open(e.currentTarget)}>Select Member</button>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Company</label>
            <button
              className={`form-select ${!companyId ? "placeholder" : ""}`}
              onClick={(e) => companyPicker.open(e.currentTarget)}
            >
              {companyName || "Select Company"}
            </button>
          </div>
          <div className="form-group">
            <label className="form-label">Contact</label>
            <button
              className={`form-select ${!contactId ? "placeholder" : ""}`}
              onClick={(e) => contactPicker.open(e.currentTarget)}
            >
              {contactName || "Select Contact"}
            </button>
          </div>
        </div>
      </div>

      <div className={S.modalFooter}>
        <MainButton type="secondary" text="Discard" onClick={onClose} />
        <MainButton type="primary" text="Create" onClick={handleCreate} />
      </div>
      {picker.isOpen && picker.triggerRect && (
        <MemberPicker
          organizationId={organizationId}
          triggerRect={picker.triggerRect}
          onSelect={handleSelectMember}
          onClose={picker.close}
        />
      )}
      {contactPicker.isOpen && contactPicker.triggerRect && (
        <ContactPicker
          triggerRect={contactPicker.triggerRect}
          companyId={companyId || undefined}
          onSelect={handleSelectContact}
          onClose={contactPicker.close}
        />
      )}
      {companyPicker.isOpen && companyPicker.triggerRect && (
        <CompanyPicker
          triggerRect={companyPicker.triggerRect}
          onSelect={handleSelectCompany}
          onClose={companyPicker.close}
        />
      )}
    </div>
  );
};

export default NewDeal;