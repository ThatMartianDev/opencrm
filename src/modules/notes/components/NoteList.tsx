"use client";

import { useCallback, useEffect, useState } from "react";
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
  deleteNote,
} from "../actions";
import AvatarFallback from "@/components/micro/AvatarFallback/AvatarFallback";
import { useModal } from "@/components/macro/ModalProvider/ModalProvider";
import { useToast } from "@/components/macro/Toaster";
import Styles from "./NoteList.module.css";

type NoteData = Awaited<ReturnType<typeof getNotes>>[number];

type NoteListProps = {
  dealId?: string;
  contactId?: string;
  companyId?: string;
  showHeader?: boolean;
  onCreateClick?: () => void;
};

function formatDate(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getLinkedRecordLabel(
  note: NoteData,
): { label: string; type: string } | null {
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
    ? { id: note.createdBy.user.id, name: note.createdBy.user.name || "Unknown", avatarUrl: note.createdBy.user.avatarUrl }
    : null;

  return (
    <div className={Styles.noteCard} onClick={onClick} style={{ cursor: "pointer" }}>
      <div className={Styles.noteCardHeader}>
        <p className={Styles.noteTitle}>{note.title || "Untitled note"}</p>
        <button
          className={`${Styles.showActionsMenu}`}
          onClick={(e) => { e.stopPropagation(); setShowActions(!showActions); }}
        >
          <MoreVerticalFilled fontSize={14} />
        </button>
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

      <div className={Styles.noteContent}>{note.content}</div>

      {linked && (
        <span className={`${Styles.linkedRecord} ${Styles[linked.type]}`}>
          {getLinkedRecordIcon(linked.type)}
          {note.deal ? note.deal.title : note.contact ? note.contact.name : note.company ? note.company.name : ""}
        </span>
      )}

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
  showHeader = true,
  onCreateClick,
}: NoteListProps) => {
  const [notes, setNotes] = useState<NoteData[]>([]);
  const [loading, setLoading] = useState(true);
  const { openModal } = useModal();
  const { toast } = useToast();

  const fetchNotes = useCallback(async () => {
    try {
      let data: NoteData[];
      if (dealId) {
        data = await getNotesForDeal(dealId);
      } else if (contactId) {
        data = await getNotesForContact(contactId);
      } else if (companyId) {
        data = await getNotesForCompany(companyId);
      } else {
        data = await getNotes();
      }
      setNotes(data);
    } catch (error) {
      console.error("Error fetching notes:", error);
    } finally {
      setLoading(false);
    }
  }, [dealId, contactId, companyId]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  function handleCreate() {
    if (onCreateClick) {
      onCreateClick();
    } else {
      openModal("note", { dealId, contactId, companyId });
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
        description: err instanceof Error ? err.message : "Something went wrong.",
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
          <NoteCard key={note.id} note={note} onDelete={handleDelete} onClick={() => openModal("note", { id: note.id })} />
        ))}
      </div>
    </div>
  );
};

export default NoteList;
