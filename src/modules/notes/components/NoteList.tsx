"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AddRegular,
  TargetRegular,
  PersonRegular,
  BuildingRegular,
  MoreVerticalFilled,
  DeleteRegular,
} from "@fluentui/react-icons";
import {
  getNotes,
  getNotesForDeal,
  getNotesForContact,
  getNotesForCompany,
  getNotesForRecord,
  deleteNote,
} from "../actions";
import AvatarFallback from "@/components/micro/AvatarFallback/AvatarFallback";
import { useModal } from "@/components/macro/ModalProvider/ModalProvider";
import { useToast } from "@/components/macro/Toaster";
import ModuleIcon from "@/modules/RecordModule/ui/components/ModuleIcon";
import NoteContent from "./NoteContent/NoteContent";
import Styles from "./NoteList.module.css";

type NotePageData = Awaited<ReturnType<typeof getNotes>>;
type NoteData = NotePageData["items"][number];

type NoteListProps = {
  dealId?: string;
  contactId?: string;
  companyId?: string;
  recordId?: string;
  showHeader?: boolean;
  onCreateClick?: () => void;
  initialPage?: NotePageData;
};

const PAGE_SIZE = 20;

const loadNotes = ({
  dealId,
  contactId,
  companyId,
  recordId,
  page,
}: Pick<NoteListProps, "dealId" | "contactId" | "companyId" | "recordId"> & {
  page: number;
}) => {
  const query = { page, pageSize: PAGE_SIZE };
  if (recordId) return getNotesForRecord(recordId, query);
  if (dealId) return getNotesForDeal(dealId, query);
  if (contactId) return getNotesForContact(contactId, query);
  if (companyId) return getNotesForCompany(companyId, query);
  return getNotes(query);
};

const getQueryKey = (
  { dealId, contactId, companyId, recordId }: NoteListProps,
  page: number,
) => `${recordId ?? dealId ?? contactId ?? companyId ?? "all"}:${page}`;

function formatDate(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getLinkedRecordLabel(
  note: NoteData,
): { label: string; type: string } | null {
  if (note.record) return { label: note.record.displayName, type: "record" };
  if (note.dealId) return { label: "Deal", type: "deal" };
  if (note.contactId) return { label: "Contact", type: "contact" };
  if (note.companyId) return { label: "Company", type: "company" };
  return null;
}

function getLinkedRecordIcon(type: string) {
  switch (type) {
    case "deal":
      return <TargetRegular fontSize={12} />;
    case "contact":
      return <PersonRegular fontSize={12} />;
    case "company":
      return <BuildingRegular fontSize={12} />;
    default:
      return null;
  }
}

const NoteCard = ({
  note,
  onDelete,
  onClick,
}: {
  note: NoteData;
  onDelete: (id: string) => void;
  onClick?: () => void;
}) => {
  const [showActions, setShowActions] = useState(false);
  const linked = getLinkedRecordLabel(note);

  const creator = note.createdBy
    ? {
        id: note.createdBy.user.id,
        name: note.createdBy.user.name || "Unknown",
        avatarUrl: note.createdBy.user.avatarUrl,
      }
    : null;

  return (
    <div
      className={Styles.noteCard}
      onClick={onClick}
      style={{ cursor: "pointer" }}
    >
      <div className={Styles.noteCardHeader}>
        <button
          className={`${Styles.showActionsMenu}`}
          onClick={(e) => {
            e.stopPropagation();
            setShowActions(!showActions);
          }}
        >
          <MoreVerticalFilled fontSize={14} />
        </button>
        {linked && (
          <span className={`${Styles.linkedRecord} ${Styles[linked.type]}`}>
            {note.record ? (
              <span
                className={Styles.moduleIcon}
                style={{
                  backgroundColor: note.record.module.accentColor || "#5670ff",
                }}
              >
                <ModuleIcon name={note.record.module.icon} size={11} />
              </span>
            ) : (
              getLinkedRecordIcon(linked.type)
            )}
            {note.record
              ? note.record.displayName
              : note.deal
                ? note.deal.title
                : note.contact
                  ? note.contact.name
                  : note.company
                    ? note.company.name
                    : ""}
          </span>
        )}

        <p className={Styles.noteTitle}>{note.title || "Untitled note"}</p>
      </div>
      <div
        className={`${Styles.noteActions} ${showActions ? Styles.show : ""}`}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(note.id);
          }}
        >
          <DeleteRegular fontSize={14} color="red" />
          <p style={{ color: "red" }}>Delete</p>
        </button>
      </div>

      <NoteContent content={note.content} minimizeFontSize={true} />

      <div className={Styles.noteFooter}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div className={Styles.noteAuthor}>
            <AvatarFallback
              name={creator?.name || "Unknown"}
              entityKind="member"
              entityId={creator?.id || ""}
              size={18}
            />
            <span>{creator?.name || "Unknown"}</span>
          </div>
        </div>
        <span className={Styles.noteDate}>{formatDate(note.createdAt)}</span>
      </div>
    </div>
  );
};

const NoteList = ({
  dealId,
  contactId,
  companyId,
  recordId,
  showHeader = true,
  onCreateClick,
  initialPage,
}: NoteListProps) => {
  const [notePage, setNotePage] = useState<NotePageData>(
    initialPage ?? {
      items: [],
      pagination: { page: 1, pageSize: PAGE_SIZE, hasNext: false },
    },
  );
  const [page, setPage] = useState(initialPage?.pagination.page ?? 1);
  const [loading, setLoading] = useState(!initialPage);
  const { openModal } = useModal();
  const { toast } = useToast();
  const loadRequestId = useRef(0);
  const loadedQueryKey = useRef<string | null>(
    initialPage
      ? getQueryKey({ dealId, contactId, companyId, recordId }, page)
      : null,
  );
  const notes = notePage.items;

  const fetchNotes = useCallback(async () => {
    const queryKey = getQueryKey(
      { dealId, contactId, companyId, recordId },
      page,
    );
    const requestId = ++loadRequestId.current;
    loadedQueryKey.current = queryKey;
    setLoading(true);

    try {
      const data = await loadNotes({
        dealId,
        contactId,
        companyId,
        recordId,
        page,
      });
      if (requestId !== loadRequestId.current) return;

      if (data.items.length === 0 && page > 1) {
        loadedQueryKey.current = null;
        setPage((current) => current - 1);
        return;
      }

      setNotePage(data);
    } catch (error) {
      if (requestId !== loadRequestId.current) return;
      console.error("Error fetching notes:", error);
    } finally {
      if (requestId === loadRequestId.current) setLoading(false);
    }
  }, [dealId, contactId, companyId, recordId, page]);

  useEffect(() => {
    const queryKey = getQueryKey(
      { dealId, contactId, companyId, recordId },
      page,
    );
    if (loadedQueryKey.current === queryKey) return;
    void fetchNotes();
  }, [companyId, contactId, dealId, fetchNotes, page, recordId]);

  function handleCreate() {
    if (onCreateClick) {
      onCreateClick();
    } else {
      openModal("note", { dealId, contactId, companyId, recordId }, fetchNotes);
    }
  }

  async function handleDelete(noteId: string) {
    const note = notes.find((n) => n.id === noteId);
    const t = toast.loading("Deleting note...");
    try {
      await deleteNote(noteId);
      fetchNotes();
      t.success({
        title: "Note deleted",
        description: `"${note?.title || "Untitled"}" has been deleted.`,
        duration: 4000,
      });
    } catch (err) {
      t.error({
        title: "Failed to delete note",
        description:
          err instanceof Error ? err.message : "Something went wrong.",
      });
    }
  }

  if (loading) return null;

  return (
    <div className={Styles.noteList}>
      {showHeader && (
        <div className={Styles.noteListHeader}>
          <h3>Notes</h3>
          <button className={Styles.addBtn} onClick={handleCreate}>
            <AddRegular fontSize={14} />
            Add Note
          </button>
        </div>
      )}

      {notes.length === 0 && (
        <div className={Styles.emptyState}>
          <p>No notes yet</p>
          <button className={Styles.addBtn} onClick={handleCreate}>
            <AddRegular fontSize={14} />
            Write the first note
          </button>
        </div>
      )}

      <div className={Styles.grid}>
        {notes.map((note) => (
          <NoteCard
            key={note.id}
            note={note}
            onDelete={handleDelete}
            onClick={() =>
              openModal("note", { id: note.id, recordId }, fetchNotes)
            }
          />
        ))}
      </div>

      {(page > 1 || notePage.pagination.hasNext) && (
        <nav className={Styles.pagination} aria-label="Note pages">
          <button
            type="button"
            disabled={page === 1 || loading}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
          >
            Previous
          </button>
          <span>Page {page}</span>
          <button
            type="button"
            disabled={!notePage.pagination.hasNext || loading}
            onClick={() => setPage((current) => current + 1)}
          >
            Next
          </button>
        </nav>
      )}
    </div>
  );
};

export default NoteList;
