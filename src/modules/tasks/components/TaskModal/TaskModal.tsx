"use client";

import { useEffect, useState } from "react";
import {
  CheckmarkCircleFilled,
  DismissFilled,
  CalendarRegular,
  PersonRegular,
  LinkRegular,
  CheckmarkSquareRegular,
  MoreVerticalFilled,
  DeleteRegular,
  ChevronDownRegular,
} from "@fluentui/react-icons";
import { ModuleFeature, TaskStatus } from "@/generated/prisma/enums";
import {
  createTask,
  updateTask,
  updateTaskStatus,
  deleteTask,
  getTaskById,
} from "../../actions";
import { getLinkableRecord } from "@/modules/RecordModule/actions";
import ModuleIcon from "@/modules/RecordModule/ui/components/ModuleIcon";
import { useWorkspaceData } from "@/modules/workspace/components/workspace-provider";
import { useToast } from "@/components/macro/Toaster";
import {
  PickerMember,
  useMemberPicker,
} from "@/components/macro/MemberPicker/useMemberPicker";
import { MemberPicker } from "@/components/macro/MemberPicker";
import {
  RecordBrowserOverlay,
  type RecordBrowserSelection,
} from "@/components/macro/RecordBrowser";
import S from "@/components/macro/ModalProvider/SharedStyles.module.css";
import Styles from "./TaskModal.module.css";
import MainButton from "@/components/micro/MainButton/MainButton";

import DateTimePicker from "@/components/macro/DateTimePicker";
import AvatarFallback from "@/components/micro/AvatarFallback/AvatarFallback";

type TaskModalProps = {
  onClose: () => void;
  onDataChanged?: () => void;
  id?: string;
  recordId?: string;
};

const STATUS_OPTIONS = [
  { value: TaskStatus.TODO, label: "To do", tone: "todo" },
  { value: TaskStatus.IN_PROGRESS, label: "In progress", tone: "progress" },
  { value: TaskStatus.COMPLETED, label: "Completed", tone: "completed" },
] as const;

function getTodayValue() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const TaskModal = ({
  onClose,
  onDataChanged,
  id,
  recordId,
}: TaskModalProps) => {
  const { organizationId, member, user } = useWorkspaceData();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<TaskStatus>(TaskStatus.TODO);
  const [initialStatus, setInitialStatus] = useState<TaskStatus>(
    TaskStatus.TODO,
  );
  const [dueDate, setDueDate] = useState(() => (id ? "" : getTodayValue()));
  const [assignedToId, setAssignedToId] = useState(() => (id ? "" : member.id));
  const [assignedToName, setAssignedToName] = useState(() =>
    id ? "" : user.name,
  );
  const [linkedRecord, setLinkedRecord] =
    useState<RecordBrowserSelection | null>(null);
  const [showRecordBrowser, setShowRecordBrowser] = useState(false);
  const [loading, setLoading] = useState(Boolean(id || recordId));

  const [showOptions, setShowOptions] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);

  const picker = useMemberPicker();

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateTriggerRect, setDateTriggerRect] = useState<DOMRect | null>(null);

  const isEditing = !!id;

  useEffect(() => {
    let active = true;

    async function loadInitialData() {
      try {
        if (id) {
          const task = await getTaskById(id);
          if (!active) return;
          if (task) {
            setName(task.name);
            setDescription(task.description || "");
            setStatus(task.status);
            setInitialStatus(task.status);
            setDueDate(
              task.dueDate
                ? new Date(task.dueDate).toISOString().split("T")[0]
                : "",
            );
            setAssignedToId(task.assignedToId || "");
            if (task.assignedTo) {
              setAssignedToName(task.assignedTo.user.name || "");
            }
            if (task.record) {
              setLinkedRecord(task.record);
            }
          }
        } else if (recordId) {
          const record = await getLinkableRecord(recordId, ModuleFeature.TASKS);
          if (active && record) setLinkedRecord(record);
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadInitialData();
    return () => {
      active = false;
    };
  }, [id, recordId]);

  const handleSelectMember = (member: PickerMember) => {
    if (member) {
      setAssignedToId(member.id);
      setAssignedToName(member.name || "");
    }
  };

  async function handleSave() {
    if (!name.trim()) return;

    const t = toast.loading(
      isEditing ? "Updating task..." : "Creating task...",
    );

    try {
      if (isEditing) {
        await updateTask(id!, {
          name: name.trim(),
          description: description.trim(),
          dueDate: dueDate || null,
          assignedToId: assignedToId || null,
          dealId: null,
          recordId: linkedRecord?.id || null,
        });
        if (status !== initialStatus) {
          await updateTaskStatus(id!, status);
        }
        t.success({
          title: "Task updated",
          description: `Your task "${name.trim()}" has been updated.`,
          duration: 5000,
          actions: [{ label: "View task", onClick: () => {}, primary: true }],
        });
      } else {
        await createTask({
          name: name.trim(),
          description: description.trim() || undefined,
          status,
          dueDate: dueDate || undefined,
          assignedToId: assignedToId || undefined,
          recordId: linkedRecord?.id,
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

  const activeStatus = STATUS_OPTIONS.find(
    (option) => option.value === status,
  )!;

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

          <div className={Styles.statusControl}>
            <button
              className={Styles.statusButton}
              onClick={() => setShowStatusMenu((current) => !current)}
              aria-haspopup="menu"
              aria-expanded={showStatusMenu}
            >
              <span
                className={`${Styles.statusDot} ${Styles[activeStatus.tone]}`}
              />
              {activeStatus.label}
              <ChevronDownRegular fontSize={15} />
            </button>
            {showStatusMenu && (
              <div className={Styles.statusMenu} role="menu">
                {STATUS_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    className={
                      status === option.value ? Styles.selectedStatus : ""
                    }
                    onClick={() => {
                      setStatus(option.value);
                      setShowStatusMenu(false);
                    }}
                    role="menuitem"
                  >
                    <span
                      className={`${Styles.statusDot} ${Styles[option.tone]}`}
                    />
                    {option.label}
                    {status === option.value && (
                      <CheckmarkCircleFilled fontSize={16} />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
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

        {/* Assignee and linked record */}
        <div className={Styles.taskMetaRow}>
          <button
            className={`${Styles.metaChip} ${assignedToId ? Styles.active : ""}`}
            onClick={(e) => picker.open(e.currentTarget)}
          >
            {assignedToName ? (
              <AvatarFallback
                entityKind="customer"
                entityId={assignedToId}
                name={assignedToName}
                size={24}
                style={{ borderRadius: "6px" }}
              />
            ) : (
              <PersonRegular fontSize={18} />
            )}
            {assignedToName || "Assign to"}
          </button>

          {linkedRecord ? (
            <div className={Styles.linkedControl}>
              <button
                className={Styles.linkedChip}
                onClick={() => setShowRecordBrowser(true)}
              >
                <span
                  className={Styles.moduleIcon}
                  style={{
                    backgroundColor:
                      linkedRecord.module.accentColor || "#5670ff",
                  }}
                >
                  <ModuleIcon name={linkedRecord.module.icon} size={13} />
                </span>
                {linkedRecord.displayName}
              </button>
              <button
                className={Styles.unlinkButton}
                onClick={() => setLinkedRecord(null)}
                aria-label="Unlink record"
                title="Unlink record"
              >
                <DismissFilled fontSize={14} />
              </button>
            </div>
          ) : (
            <button
              className={Styles.metaChip}
              onClick={() => setShowRecordBrowser(true)}
            >
              <LinkRegular fontSize={17} />
              Link record
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
      {showRecordBrowser && (
        <RecordBrowserOverlay
          requiredFeature={ModuleFeature.TASKS}
          selectedRecordId={linkedRecord?.id}
          onSelect={setLinkedRecord}
          onClose={() => setShowRecordBrowser(false)}
        />
      )}
    </div>
  );
};

export default TaskModal;
