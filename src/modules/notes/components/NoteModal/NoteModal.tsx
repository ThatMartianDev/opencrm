"use client";

import { useEffect, useState } from "react";
import {
    DismissRegular,
    NoteRegular,
    LinkRegular,
} from "@fluentui/react-icons";
import { createNote, updateNote, getNotes } from "../../actions";
import { getDeals } from "@/modules/deals/actions";
import { getContacts } from "@/modules/contacts/actions";
import { getCompanies } from "@/modules/companies/actions";
import { useToast } from "@/components/macro/Toaster";
import Styles from "./NoteModal.module.css";
import S from "@/components/macro/ModalProvider/SharedStyles.module.css";
import MainButton from "@/components/micro/MainButton/MainButton";

type RecordOption = { id: string; label: string; type: "deal" | "contact" | "company" };

type NoteModalProps = {
    onClose: () => void;
    onDataChanged?: () => void;
    id?: string; // if provided, we're editing
    dealId?: string;
    contactId?: string;
    companyId?: string;
    recordId?: string;
};

const NoteModal = ({ onClose, onDataChanged, id, dealId, contactId, companyId, recordId }: NoteModalProps) => {
    const { toast } = useToast();
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [linkedRecord, setLinkedRecord] = useState<string>(() => {
        if (dealId) return `deal:${dealId}`;
        if (contactId) return `contact:${contactId}`;
        if (companyId) return `company:${companyId}`;
        return "";
    });
    const [records, setRecords] = useState<RecordOption[]>([]);
    const [loading, setLoading] = useState(!!id);

    const isEditing = !!id;

    // Load note data if editing
    useEffect(() => {
        if (id) {
            getNotes().then((notes) => {
                const note = notes.find((n) => n.id === id);
                if (note) {
                    setTitle(note.title || "");
                    setContent(note.content);
                    if (note.dealId) setLinkedRecord(`deal:${note.dealId}`);
                    else if (note.contactId) setLinkedRecord(`contact:${note.contactId}`);
                    else if (note.companyId) setLinkedRecord(`company:${note.companyId}`);
                }
                setLoading(false);
            });
        }
    }, [id]);

    // Load records for linking
    useEffect(() => {
        async function loadRecords() {
            const [deals, contacts, companies] = await Promise.all([
                getDeals().catch(() => []),
                getContacts().catch(() => []),
                getCompanies().catch(() => []),
            ]);
            const opts: RecordOption[] = [
                ...deals.map((d) => ({ id: d.id, label: d.title, type: "deal" as const })),
                ...contacts.map((c) => ({ id: c.id, label: c.name, type: "contact" as const })),
                ...companies.map((c) => ({ id: c.id, label: c.name, type: "company" as const })),
            ];
            setRecords(opts);
        }
        loadRecords();
    }, []);

    function parseLinkedRecord() {
        if (!linkedRecord) return {};
        const [type, recordId] = linkedRecord.split(":");
        if (type === "deal") return { dealId: recordId };
        if (type === "contact") return { contactId: recordId };
        if (type === "company") return { companyId: recordId };
        return {};
    }

    async function handleSave() {
        if (!content.trim() && !title.trim()) return;

        const t = toast.loading(isEditing ? "Updating note..." : "Creating note...");

        try {
            if (isEditing) {
                await updateNote(id!, { title: title.trim(), content: content.trim() });
                t.success({
                    title: "Note updated",
                    description: `Your note "${title.trim() || "Untitled"}" has been updated.`,
                    duration: 5000,
                    actions: [
                        { label: "View note", onClick: () => {}, primary: true },
                    ],
                });
            } else {
                const linked = parseLinkedRecord();
                await createNote({
                    title: title.trim() || undefined,
                    content: content.trim(),
                    dealId: linked.dealId,
                    contactId: linked.contactId,
                    companyId: linked.companyId,
                    recordId,
                });
                t.success({
                    title: "Note created",
                    description: `Your note "${title.trim() || "Untitled"}" has been created.`,
                    duration: 5000,
                    actions: [
                        { label: "View note", onClick: () => {}, primary: true },
                    ],
                });
            }
            onDataChanged?.();
            onClose();
        } catch (err) {
            t.error({
                title: isEditing ? "Failed to update note" : "Failed to create note",
                description: err instanceof Error ? err.message : "Something went wrong.",
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

    const linkedLabel = linkedRecord
        ? records.find((r) => `${r.type}:${r.id}` === linkedRecord)?.label
        : null;

    const linkedType = linkedRecord ? linkedRecord.split(":")[0] : null;

    if (loading) return null;

    return (
        <div className={S.modalCard} onKeyDown={handleKeyDown}>
            <div className={S.modalHeader}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <NoteRegular fontSize={20} />
                    <h2>
                        {isEditing ? "Edit note" : "New note"}
                    </h2>
                </div>
                <button className={S.closeBtn} onClick={onClose}>
                    <DismissRegular fontSize={16} />
                </button>
            </div>

            <div className={S.modalBody}>
                <input
                    className={Styles.titleInput}
                    type="text"
                    placeholder="Untitled note"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    autoFocus
                />

                <div className={Styles.metaRow}>
                    {recordId ? (
                        <span className={Styles.linkedChip}>
                            <LinkRegular fontSize={12} />
                            Current record
                        </span>
                    ) : linkedRecord && linkedLabel ? (
                        <button
                            className={`${Styles.linkedChip} ${linkedType ? Styles[linkedType] : ""}`}
                            onClick={() => setLinkedRecord("")}
                            title="Click to unlink"
                        >
                            <LinkRegular fontSize={12} />
                            {linkedLabel}
                        </button>
                    ) : (
                        <select
                            className={Styles.recordSelect}
                            value={linkedRecord}
                            onChange={(e) => setLinkedRecord(e.target.value)}
                        >
                            <option value="">Link to record</option>
                            {records.filter((r) => r.type === "deal").length > 0 && (
                                <optgroup label="Deals">
                                    {records.filter((r) => r.type === "deal").map((r) => (
                                        <option key={r.id} value={`${r.type}:${r.id}`}>{r.label}</option>
                                    ))}
                                </optgroup>
                            )}
                            {records.filter((r) => r.type === "contact").length > 0 && (
                                <optgroup label="Contacts">
                                    {records.filter((r) => r.type === "contact").map((r) => (
                                        <option key={r.id} value={`${r.type}:${r.id}`}>{r.label}</option>
                                    ))}
                                </optgroup>
                            )}
                            {records.filter((r) => r.type === "company").length > 0 && (
                                <optgroup label="Companies">
                                    {records.filter((r) => r.type === "company").map((r) => (
                                        <option key={r.id} value={`${r.type}:${r.id}`}>{r.label}</option>
                                    ))}
                                </optgroup>
                            )}
                        </select>
                    )}
                </div>

                <textarea
                    className={Styles.contentArea}
                    placeholder="Start typing, or create a template"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                />
            </div>

            <div className={S.modalFooter}>
                <MainButton type="secondary" text={isEditing ? "Discard changes" : "Discard"} onClick={onClose} />
                <MainButton type="primary" text={isEditing ? "Save changes" : "Create note"} onClick={handleSave} />
            </div>
        </div>
    );
};

export default NoteModal;
