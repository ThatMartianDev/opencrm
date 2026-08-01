"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CheckmarkFilled,
  AddRegular,
  TargetRegular,
  CheckmarkCircleFilled,
  DismissRegular,
  DeleteRegular,
  DocumentRegular,
  PersonRegular,
  ArrowSyncRegular,
  CheckmarkRegular,
} from "@fluentui/react-icons";
import { TaskStatus } from "@/generated/prisma/enums";
import {
  getTasks,
  getTasksForDeal,
  getTasksForRecord,
  createTask,
  updateTaskStatus,
  deleteTask,
} from "../actions";
import { TaskWithRelations } from "../types";
import AvatarFallback from "@/components/micro/AvatarFallback/AvatarFallback";
import MainButton from "@/components/micro/MainButton/MainButton";
import TabsControlHeader from "@/components/macro/TabsControlHeader/TabsControlHeader";
import { MemberPicker } from "@/components/macro/MemberPicker";
import {
  useMemberPicker,
  PickerMember,
} from "@/components/macro/MemberPicker/useMemberPicker";
import { useModal } from "@/components/macro/ModalProvider/ModalProvider";
import { useWorkspaceData } from "@/modules/workspace/components/workspace-provider";
import { useToast } from "@/components/macro/Toaster";
import Styles from "./TaskList.module.css";

type TaskListProps = {
  dealId?: string;
  recordId?: string;
  showHeader?: boolean;
  showTabsHeader?: boolean;
  initialPage?: TaskPageData;
};

type TaskPageData = Awaited<ReturnType<typeof getTasks>>;

const PAGE_SIZE = 20;

const loadTasks = ({
  dealId,
  recordId,
  page,
}: Pick<TaskListProps, "dealId" | "recordId"> & { page: number }) => {
  const query = { page, pageSize: PAGE_SIZE };
  if (recordId) return getTasksForRecord(recordId, query);
  if (dealId) return getTasksForDeal(dealId, query);
  return getTasks(query);
};

const getQueryKey = (
  { dealId, recordId }: Pick<TaskListProps, "dealId" | "recordId">,
  page: number,
) => `${recordId ?? dealId ?? "all"}:${page}`;

const STATUS_LABELS: Record<TaskStatus, string> = {
  TODO: "To Do",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
};

function formatDueDate(date: string | Date | null | undefined): string {
  if (!date) return "—";
  const d = new Date(date);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function isOverdue(date: string | Date | null | undefined): boolean {
  if (!date) return false;
  return (
    new Date(date) < new Date() &&
    new Date(date).toDateString() !== new Date().toDateString()
  );
}

const TaskList = ({
  dealId,
  recordId,
  showHeader = true,
  showTabsHeader = false,
  initialPage,
}: TaskListProps) => {
  const [taskPage, setTaskPage] = useState<TaskPageData>(
    initialPage ?? {
      items: [],
      pagination: { page: 1, pageSize: PAGE_SIZE, hasNext: false },
    },
  );
  const [page, setPage] = useState(initialPage?.pagination.page ?? 1);
  const [showInlineForm, setShowInlineForm] = useState(false);
  const [newTaskName, setNewTaskName] = useState("");
  const [loading, setLoading] = useState(!initialPage);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const { openModal } = useModal();
  const { toast } = useToast();
  const { organizationId } = useWorkspaceData();
  const memberPicker = useMemberPicker();
  const loadRequestId = useRef(0);
  const loadedQueryKey = useRef<string | null>(
    initialPage ? getQueryKey({ dealId, recordId }, page) : null,
  );
  const tasks = taskPage.items;

  const fetchTasks = useCallback(async () => {
    const queryKey = getQueryKey({ dealId, recordId }, page);
    const requestId = ++loadRequestId.current;
    loadedQueryKey.current = queryKey;
    setLoading(true);

    try {
      const data = await loadTasks({ dealId, recordId, page });
      if (requestId !== loadRequestId.current) return;

      if (data.items.length === 0 && page > 1) {
        loadedQueryKey.current = null;
        setPage((current) => current - 1);
        return;
      }

      setTaskPage(data);
    } catch (error) {
      if (requestId !== loadRequestId.current) return;
      console.error("Error fetching tasks:", error);
    } finally {
      if (requestId === loadRequestId.current) setLoading(false);
    }
  }, [dealId, page, recordId]);

  useEffect(() => {
    const queryKey = getQueryKey({ dealId, recordId }, page);
    if (loadedQueryKey.current === queryKey) return;
    void fetchTasks();
  }, [dealId, fetchTasks, page, recordId]);

  const changePage = (nextPage: number) => {
    clearSelection();
    setPage(nextPage);
  };

  async function handleToggleStatus(task: TaskWithRelations) {
    const nextStatus =
      task.status === TaskStatus.COMPLETED
        ? TaskStatus.TODO
        : TaskStatus.COMPLETED;
    const label =
      nextStatus === TaskStatus.COMPLETED
        ? "Completing task..."
        : "Reopening task...";
    const t = toast.loading(label);
    try {
      await updateTaskStatus(task.id, nextStatus);
      fetchTasks();
      t.success({
        title:
          nextStatus === TaskStatus.COMPLETED
            ? "Task completed"
            : "Task reopened",
        description: `"${task.name}" marked as ${nextStatus === TaskStatus.COMPLETED ? "completed" : "to do"}.`,
        duration: 4000,
        actions: [
          {
            label: "Undo",
            onClick: async () => {
              await updateTaskStatus(task.id, task.status);
              fetchTasks();
            },
          },
          {
            label: "View task",
            onClick: () => openModal("task", { id: task.id }, fetchTasks),
            primary: true,
          },
        ],
      });
    } catch (err) {
      t.error({
        title: "Failed to update task",
        description:
          err instanceof Error ? err.message : "Something went wrong.",
      });
    }
  }

  async function handleInlineCreate() {
    if (!newTaskName.trim()) return;
    const taskName = newTaskName.trim();
    const t = toast.loading("Creating task...");
    try {
      await createTask({
        name: taskName,
        dealId: dealId || undefined,
        recordId,
      });
      setNewTaskName("");
      setShowInlineForm(false);
      fetchTasks();
      t.success({
        title: "Task created",
        description: `Your task "${taskName}" has been created.`,
        duration: 5000,
        actions: [{ label: "View task", onClick: () => {}, primary: true }],
      });
    } catch (err) {
      t.error({
        title: "Failed to create task",
        description:
          err instanceof Error ? err.message : "Something went wrong.",
      });
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") handleInlineCreate();
    if (e.key === "Escape") {
      setShowInlineForm(false);
      setNewTaskName("");
    }
  }

  function handleOpenCreateModal() {
    openModal("task", { dealId, recordId }, fetchTasks);
  }

  function toggleSelect(taskId: string, e: React.MouseEvent) {
    e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === tasks.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(tasks.map((t) => t.id)));
    }
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  async function handleBulkDelete() {
    const count = selectedIds.size;
    const t = toast.loading(`Deleting ${count} task${count > 1 ? "s" : ""}...`);
    try {
      await Promise.all(Array.from(selectedIds).map((id) => deleteTask(id)));
      t.success({
        title: `${count} task${count > 1 ? "s" : ""} deleted`,
        duration: 4000,
      });
      clearSelection();
      fetchTasks();
    } catch (err) {
      t.error({
        title: "Failed to delete tasks",
        description:
          err instanceof Error ? err.message : "Something went wrong.",
      });
    }
  }

  async function handleBulkStatusChange(status: TaskStatus) {
    const count = selectedIds.size;
    const t = toast.loading(`Updating ${count} task${count > 1 ? "s" : ""}...`);
    try {
      await Promise.all(
        Array.from(selectedIds).map((id) => updateTaskStatus(id, status)),
      );
      t.success({
        title: `${count} task${count > 1 ? "s" : ""} updated to ${STATUS_LABELS[status]}`,
        duration: 4000,
      });
      setShowStatusMenu(false);
      clearSelection();
      fetchTasks();
    } catch (err) {
      t.error({
        title: "Failed to update tasks",
        description:
          err instanceof Error ? err.message : "Something went wrong.",
      });
    }
  }

  async function handleBulkAssign(member: PickerMember) {
    const count = selectedIds.size;
    const t = toast.loading(
      `Assigning ${count} task${count > 1 ? "s" : ""}...`,
    );
    try {
      const { updateTask } = await import("../actions");
      await Promise.all(
        Array.from(selectedIds).map((id) =>
          updateTask(id, { assignedToId: member.id }),
        ),
      );
      t.success({
        title: `${count} task${count > 1 ? "s" : ""} assigned to ${member.name}`,
        duration: 4000,
      });
      memberPicker.close();
      clearSelection();
      fetchTasks();
    } catch (err) {
      t.error({
        title: "Failed to assign tasks",
        description:
          err instanceof Error ? err.message : "Something went wrong.",
      });
    }
  }

  if (loading) return null;

  return (
    <div className={Styles.taskList}>
      {showTabsHeader && (
        <TabsControlHeader
          tabs={[]}
          onTabBtnClick={() => {}}
          showMainBtn={true}
          mainButton={{ text: "New Task", onClick: handleOpenCreateModal }}
        />
      )}
      {showHeader && (
        <div className={Styles.taskListHeader}>
          <h3>Tasks</h3>
          <button className={Styles.addBtn} onClick={handleOpenCreateModal}>
            <AddRegular fontSize={14} />
            Add Task
          </button>
        </div>
      )}

      {showInlineForm && (
        <div className={Styles.inlineForm}>
          <input
            type="text"
            placeholder="Task name..."
            value={newTaskName}
            onChange={(e) => setNewTaskName(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
          />
          <MainButton type="primary" text="Add" onClick={handleInlineCreate} />
          <MainButton
            type="secondary"
            text="Cancel"
            onClick={() => {
              setShowInlineForm(false);
              setNewTaskName("");
            }}
          />
        </div>
      )}

      {tasks.length === 0 && !showInlineForm && (
        <div className={Styles.emptyState}>
          <p>No tasks yet</p>
          <button className={Styles.addBtn} onClick={handleOpenCreateModal}>
            <AddRegular fontSize={14} />
            Create your first task
          </button>
        </div>
      )}

      {tasks && tasks.length > 0 && (
        <div className={Styles.tableHeader}>
          <div onClick={toggleSelectAll} className={Styles.taskSelect}>
            <button
              className={`${Styles.taskSelectBtn} ${selectedIds.size === tasks.length ? Styles.selectBtnChecked : selectedIds.size > 0 ? Styles.selectBtnPartial : ""}`}
            >
              {selectedIds.size === tasks.length && (
                <CheckmarkRegular fontSize={12} />
              )}
              {selectedIds.size > 0 && selectedIds.size < tasks.length && (
                <span className={Styles.partialMark} />
              )}
            </button>
          </div>
          <div>
            <span>Name</span>
          </div>
          <div>
            <span>Status</span>
          </div>
          <div>
            <span>Due Date</span>
          </div>
          <div>
            <span>Linked Record</span>
          </div>
          <div>
            <span>Assignee</span>
          </div>
        </div>
      )}

      {tasks &&
        tasks.length > 0 &&
        tasks.map((task) => (
          <div
            key={task.id}
            className={`${Styles.taskItem} ${task.status === TaskStatus.COMPLETED ? Styles.completed : ""} ${selectedIds.has(task.id) ? Styles.selected : ""}`}
            onClick={() => openModal("task", { id: task.id, recordId }, fetchTasks)}
            style={{ cursor: "pointer" }}
          >
            <div onClick={(e) => toggleSelect(task.id, e)} className={Styles.taskSelect}>
              <button
                className={`${Styles.taskSelectBtn} ${selectedIds.has(task.id) ? Styles.selectBtnChecked : ""}`}
              >
                {selectedIds.has(task.id) && <CheckmarkRegular fontSize={12} />}
              </button>
            </div>
            <div className={`${Styles.taskName}`}>
              <div
                className={`${Styles.checkbox} ${task.status === TaskStatus.COMPLETED ? Styles.checked : ""}`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleStatus(task);
                }}
              >
                {task.status === TaskStatus.COMPLETED && (
                  <CheckmarkCircleFilled color="#1f9c49" />
                )}
              </div>

              <p>{task.name}</p>
            </div>
            <div>
              <span
                className={`${Styles.statusBadge} ${
                  task.status === TaskStatus.TODO
                    ? Styles.statusTodo
                    : task.status === TaskStatus.IN_PROGRESS
                      ? Styles.statusInProgress
                      : Styles.statusCompleted
                }`}
              >
                {STATUS_LABELS[task.status]}
              </span>
            </div>
            <div
              className={`${Styles.dueDate} ${isOverdue(task.dueDate) ? Styles.overdue : ""}`}
            >
              {formatDueDate(task.dueDate)}
            </div>
            <div className={Styles.linkedRecord}>
              {recordId ? (
                <span className={Styles.linkedBadge}>
                  <DocumentRegular fontSize={12} />
                  Current record
                </span>
              ) : task.deal ? (
                <span className={Styles.linkedBadge}>
                  <TargetRegular fontSize={12} />
                  {task.deal.title}
                </span>
              ) : (
                <span style={{ opacity: 0.4 }}>—</span>
              )}
            </div>
            <div className={Styles.assignee}>
              {task.assignedTo ? (
                <>
                  <AvatarFallback
                    name={task.assignedTo.user.name || "Unknown"}
                    entityKind="member"
                    entityId={task.assignedTo.id}
                    size={20}
                  />
                  <span>{task.assignedTo.user.name || "Unknown"}</span>
                </>
              ) : (
                <span style={{ opacity: 0.5 }}>Unassigned</span>
              )}
            </div>
          </div>
        ))}

      {(page > 1 || taskPage.pagination.hasNext) && (
        <nav className={Styles.pagination} aria-label="Task pages">
          <button
            type="button"
            disabled={page === 1 || loading}
            onClick={() => changePage(Math.max(1, page - 1))}
          >
            Previous
          </button>
          <span>Page {page}</span>
          <button
            type="button"
            disabled={!taskPage.pagination.hasNext || loading}
            onClick={() => changePage(page + 1)}
          >
            Next
          </button>
        </nav>
      )}

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className={Styles.bulkBar}>
          <div className={Styles.bulkBarInner}>
            <button className={Styles.bulkCount} onClick={clearSelection}>
              {selectedIds.size} Task{selectedIds.size > 1 ? "s" : ""} selected
              <DismissRegular fontSize={14} />
            </button>

            <div className={Styles.bulkDivider} />

            <div className={Styles.bulkActions}>
              <div className={Styles.bulkActionWrapper}>
                <button
                  className={Styles.bulkActionBtn}
                  onClick={() => setShowStatusMenu(!showStatusMenu)}
                >
                  <ArrowSyncRegular fontSize={14} />
                  Status
                </button>
                {showStatusMenu && (
                  <div className={Styles.bulkDropdown}>
                    {Object.values(TaskStatus).map((s) => (
                      <button key={s} onClick={() => handleBulkStatusChange(s)}>
                        {STATUS_LABELS[s]}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                className={Styles.bulkActionBtn}
                onClick={(e) => memberPicker.open(e.currentTarget)}
              >
                <PersonRegular fontSize={14} />
                Assignee
              </button>

              <button
                className={`${Styles.bulkActionBtn} ${Styles.bulkDeleteBtn}`}
                onClick={handleBulkDelete}
              >
                <DeleteRegular fontSize={14} />
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {memberPicker.isOpen && memberPicker.triggerRect && (
        <MemberPicker
          organizationId={organizationId}
          triggerRect={memberPicker.triggerRect}
          onSelect={handleBulkAssign}
          onClose={memberPicker.close}
        />
      )}
    </div>
  );
};

export default TaskList;
