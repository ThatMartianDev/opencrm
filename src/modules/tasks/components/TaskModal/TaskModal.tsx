"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  CheckmarkCircleFilled,
  DismissFilled,
  CalendarRegular,
  PersonRegular,
  LinkRegular,
  CheckmarkSquareRegular,
  MoreVerticalFilled,
  DeleteRegular,
} from "@fluentui/react-icons";
import { TaskStatus } from "@/generated/prisma/enums";
import {
  createTask,
  updateTask,
  updateTaskStatus,
  deleteTask,
  getTaskById,
} from "../../actions";
import { getDeals } from "@/modules/deals/actions";
import { useWorkspaceData } from "@/modules/workspace/components/workspace-provider";
import { useToast } from "@/components/macro/Toaster";
import {
  PickerMember,
  useMemberPicker,
} from "@/components/macro/MemberPicker/useMemberPicker";
import { MemberPicker } from "@/components/macro/MemberPicker";
import {
  ContactPicker,
  PickerContact,
  useContactPicker,
} from "@/components/macro/ContactPicker";
import {
  CompanyPicker,
  PickerCompany,
  useCompanyPicker,
} from "@/components/macro/CompanyPicker";
import S from "@/components/macro/ModalProvider/SharedStyles.module.css";
import Styles from "./TaskModal.module.css";
import MainButton from "@/components/micro/MainButton/MainButton";

import DateTimePicker from "@/components/macro/DateTimePicker";

type RecordOption = {
  id: string;
  label: string;
  type: "deal";
  contactId?: string | null;
  contactName?: string | null;
  companyId?: string | null;
  companyName?: string | null;
};

type TaskModalProps = {
  onClose: () => void;
  onDataChanged?: () => void;
  id?: string;
  dealId?: string;
  contactId?: string;
  companyId?: string;
  recordId?: string;
};

const TaskModal = ({
  onClose,
  onDataChanged,
  id,
  dealId,
  contactId,
  companyId,
  recordId,
}: TaskModalProps) => {
  const { organizationId } = useWorkspaceData();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<TaskStatus>(TaskStatus.TODO);
  const [dueDate, setDueDate] = useState("");
  const [assignedToId, setAssignedToId] = useState("");
  const [assignedToName, setAssignedToName] = useState("");
  const [linkedDeal, setLinkedDeal] = useState(dealId || "");
  const [linkedContactId, setLinkedContactId] = useState(contactId || "");
  const [linkedContactName, setLinkedContactName] = useState("");
  const [linkedCompanyId, setLinkedCompanyId] = useState(companyId || "");
  const [linkedCompanyName, setLinkedCompanyName] = useState("");
  const [deals, setDeals] = useState<RecordOption[]>([]);
  const [loading, setLoading] = useState(!!id);

  const [showOptions, setShowOptions] = useState(false);

  const picker = useMemberPicker();
  const contactPicker = useContactPicker();
  const companyPicker = useCompanyPicker();

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateTriggerRect, setDateTriggerRect] = useState<DOMRect | null>(null);

  const isEditing = !!id;

  // Load task data if editing
  useEffect(() => {
    if (id) {
      getTaskById(id).then((task) => {
          if (task) {
            setName(task.name);
            setStatus(task.status);
            setDueDate(
              task.dueDate
                ? new Date(task.dueDate).toISOString().split("T")[0]
                : "",
            );
            setAssignedToId(task.assignedToId || "");
            if (task.assignedTo) {
              setAssignedToName(task.assignedTo.user.name || "");
            }
            if (task.deal) {
              setLinkedDeal(task.deal.id);
            }
          }
          setLoading(false);
      });
    }
  }, [id]);

  // Load deals for linking
  useEffect(() => {
    getDeals()
      .then((data) => {
        const mapped = data.map((d) => ({
          id: d.id,
          label: d.title,
          type: "deal" as const,
          contactId: d.contact?.id || null,
          contactName: d.contact?.name || null,
          companyId: d.company?.id || null,
          companyName: d.company?.name || null,
        }));
        setDeals(mapped);
        // Autofill from initial dealId prop
        if (dealId && !linkedContactId && !linkedCompanyId) {
          const deal = mapped.find((d) => d.id === dealId);
          if (deal) {
            if (deal.contactId) {
              setLinkedContactId(deal.contactId);
              setLinkedContactName(deal.contactName || "");
            }
            if (deal.companyId) {
              setLinkedCompanyId(deal.companyId);
              setLinkedCompanyName(deal.companyName || "");
            }
          }
        }
      })
      .catch(() => {});
  }, []);

  const handleSelectMember = (member: PickerMember) => {
    if (member) {
      setAssignedToId(member.id);
      setAssignedToName(member.name || "");
    }
  };

  const handleSelectContact = (contact: PickerContact) => {
    setLinkedContactId(contact.id);
    setLinkedContactName(contact.name);
    if (contact.companyId) {
      setLinkedCompanyId(contact.companyId);
      setLinkedCompanyName(contact.companyName || "");
    }
  };

  const handleSelectCompany = (company: PickerCompany) => {
    setLinkedCompanyId(company.id);
    setLinkedCompanyName(company.name);
    // Clear contact since it may not belong to the new company
    if (linkedContactId) {
      setLinkedContactId("");
      setLinkedContactName("");
    }
  };

  function handleDealChange(dealId: string) {
    setLinkedDeal(dealId);
    if (dealId) {
      const deal = deals.find((d) => d.id === dealId);
      if (deal) {
        if (deal.contactId && !linkedContactId) {
          setLinkedContactId(deal.contactId);
          setLinkedContactName(deal.contactName || "");
        }
        if (deal.companyId && !linkedCompanyId) {
          setLinkedCompanyId(deal.companyId);
          setLinkedCompanyName(deal.companyName || "");
        }
      }
    }
  }

  async function handleSave() {
    if (!name.trim()) return;

    const t = toast.loading(
      isEditing ? "Updating task..." : "Creating task...",
    );

    try {
      if (isEditing) {
        await updateTask(id!, {
          name: name.trim(),
          dueDate: dueDate || null,
          assignedToId: assignedToId || null,
          dealId: linkedDeal || null,
        });
        t.success({
          title: "Task updated",
          description: `Your task "${name.trim()}" has been updated.`,
          duration: 5000,
          actions: [{ label: "View task", onClick: () => {}, primary: true }],
        });
      } else {
        await createTask({
          name: name.trim(),
          status,
          dueDate: dueDate || undefined,
          assignedToId: assignedToId || undefined,
          dealId: linkedDeal || undefined,
          recordId,
        });
        t.success({
          title: "Task created",
          description: `Your task "${name.trim()}" has been created.`,
          duration: 5000,
          actions: [{ label: "View task", onClick: () => {}, primary: true }],
        });
      }
      onDataChanged?.();
      onClose();
    } catch (err) {
      t.error({
        title: isEditing ? "Failed to update task" : "Failed to create task",
        description:
          err instanceof Error ? err.message : "Something went wrong.",
      });
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") onClose();
    if ((e.ctrlKey || e.metaKey) && e.key === "s") {
      e.preventDefault();
      handleSave();
    }
  }

  function toggleStatus() {
    const next =
      status === TaskStatus.COMPLETED ? TaskStatus.TODO : TaskStatus.COMPLETED;
    setStatus(next);
  }

  async function handleDelete() {
    if (!id) return;
    const t = toast.loading("Deleting task...");
    try {
      await deleteTask(id);
      t.success({
        title: "Task deleted",
        description: "The task has been deleted.",
        duration: 5000,
      });
      onDataChanged?.();
      onClose();
    } catch (err) {
      t.error({
        title: "Failed to delete task",
        description:
          err instanceof Error ? err.message : "Something went wrong.",
      });
    }
  }

  const linkedDealLabel = linkedDeal
    ? deals.find((d) => d.id === linkedDeal)?.label
    : null;

  if (loading) return null;

  return (
    <div
      className={S.modalCard}
      id={Styles.taskModal}
      onKeyDown={handleKeyDown}
    >
      <div className={S.modalHeader}>
        <div
          className="left"
          style={{ display: "flex", alignItems: "center", gap: 8 }}
        >
          <CheckmarkSquareRegular fontSize={20} />
          <h2>{isEditing ? "Edit task" : "New task"}</h2>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            marginLeft: "auto",
          }}
        >
          {isEditing && (
            <div className={Styles.optionsWrapper}>
              <button
                className={S.closeBtn}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowOptions(!showOptions);
                }}
              >
                <MoreVerticalFilled fontSize={16} />
              </button>
              {showOptions && (
                <div className={Styles.optionsDropdown}>
                  <button className={Styles.optionItem} onClick={handleDelete}>
                    <DeleteRegular
                      fontSize={18}
                      color="var(--color-danger, #e53e3e)"
                    />
                    <span style={{ color: "var(--color-danger, #e53e3e)" }}>
                      Delete
                    </span>
                  </button>
                </div>
              )}
            </div>
          )}
          <button className={S.closeBtn} onClick={onClose}>
            <DismissFilled fontSize={16} />
          </button>
        </div>
      </div>

      <div className={Styles.taskModalBody}>
        {/* Title */}
        <div className={Styles.taskInputRow}>
          <div
            className={`${Styles.taskCheckbox} ${status === TaskStatus.COMPLETED ? Styles.checked : ""}`}
            onClick={toggleStatus}
          >
            {status === TaskStatus.COMPLETED && (
              <CheckmarkCircleFilled fontSize={20} color="#1f9c49" />
            )}
          </div>
          <input
            className={Styles.taskNameInput}
            type="text"
            placeholder="Task name..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </div>

        {/* Due date, Status */}
        <div className={Styles.taskMetaRow}>
          <button
            className={Styles.metaChip}
            onClick={(e) => {
              setDateTriggerRect(e.currentTarget.getBoundingClientRect());
              setShowDatePicker(true);
            }}
          >
            <CalendarRegular fontSize={18} />
            {dueDate ? `Due ${dueDate}` : "Set due date"}
          </button>

          <select
            className={Styles.recordSelect}
            value={status}
            onChange={(e) => setStatus(e.target.value as TaskStatus)}
          >
            <option value={TaskStatus.TODO}>To Do</option>
            <option value={TaskStatus.IN_PROGRESS}>In Progress</option>
            <option value={TaskStatus.COMPLETED}>Completed</option>
          </select>
        </div>

        {/* Description */}
        <div className={Styles.taskMetaRow}>
          <textarea
            className={Styles.taskDescription}
            placeholder="Add a description..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={10}
          />
        </div>

        {/* Assignee, Linked deal, Contact, Company */}
        <div className={Styles.taskMetaRow}>
          <button
            className={`${Styles.metaChip} ${assignedToId ? Styles.active : ""}`}
            onClick={(e) => picker.open(e.currentTarget)}
          >
            <PersonRegular fontSize={18} />
            {assignedToName || "Assign to"}
          </button>

          {recordId ? (
            <span className={Styles.linkedChip}>
              <LinkRegular fontSize={12} />
              Current record
            </span>
          ) : linkedDealLabel ? (
            <span className={Styles.linkedChip}>
              <LinkRegular fontSize={12} />
              {linkedDealLabel}
            </span>
          ) : (
            <select
              className={Styles.recordSelect}
              value={linkedDeal}
              onChange={(e) => handleDealChange(e.target.value)}
            >
              <option value="">Link deal</option>
              {deals.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label}
                </option>
              ))}
            </select>
          )}

          {!recordId && (
            <button
              className={`${Styles.metaChip} ${linkedContactId ? Styles.active : ""}`}
              onClick={(e) => contactPicker.open(e.currentTarget)}
            >
              <PersonRegular fontSize={18} />
              {linkedContactName || "Contact"}
            </button>
          )}
        </div>
      </div>

      <div className={S.modalFooter}>
        <MainButton type="tertiary" text="Cancel" onClick={onClose} />
        <MainButton type="primary" text="Save" onClick={handleSave} />
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
          companyId={linkedCompanyId || undefined}
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
      {showDatePicker && dateTriggerRect && (
        <DateTimePicker
          category="date"
          dataType={{ date: "single" }}
          triggerRect={dateTriggerRect}
          initialStart={dueDate ? new Date(`${dueDate}T00:00:00`) : new Date()}
          onChange={(value) => {
            const d = value.start;
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, "0");
            const day = String(d.getDate()).padStart(2, "0");
            setDueDate(`${year}-${month}-${day}`);
            setShowDatePicker(false);
          }}
          onClose={() => setShowDatePicker(false)}
        />
      )}
    </div>
  );
};

export default TaskModal;
