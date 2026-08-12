"use client";

import { useEffect, useRef, useState } from "react";
import {
    DismissRegular,
    NoteRegular,
    LinkRegular,
    TargetRegular,
    PersonRegular,
    BuildingRegular,
} from "@fluentui/react-icons";
import { ModuleFeature } from "@/generated/prisma/enums";
import { createNote, updateNote, getNoteById } from "../../actions";
import { getDeals } from "@/modules/deals/actions";
import { getContacts } from "@/modules/contacts/actions";
import { getCompanies } from "@/modules/companies/actions";
import { getLinkableRecord } from "@/modules/RecordModule/actions";
import ModuleIcon from "@/modules/RecordModule/ui/components/ModuleIcon";
import {
    RecordBrowserOverlay,
    type RecordBrowserSelection,
} from "@/components/macro/RecordBrowser";
import RichTextEditor, {
    type RichTextEditorHandle,
} from "@/components/macro/RichTextEditor";
import { deleteFile } from "@/modules/files/actions";
import { useToast } from "@/components/macro/Toaster";
import Styles from "./NoteModal.module.css";
import S from "@/components/macro/ModalProvider/SharedStyles.module.css";
import MainButton from "@/components/micro/MainButton/MainButton";

type LinkedRecord =
    | { kind: "record"; record: RecordBrowserSelection }
    | { kind: "deal" | "contact" | "company"; id: string; label: string };

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
    const [linkedRecord, setLinkedRecord] = useState<LinkedRecord | null>(null);
    const [showRecordBrowser, setShowRecordBrowser] = useState(false);
    const [loading, setLoading] = useState(Boolean(id || recordId || dealId || contactId || companyId));
    const editorRef = useRef<RichTextEditorHandle>(null);
    const uploadedImageIds = useRef(new Set<string>());
    const saved = useRef(false);

    const isEditing = !!id;

    useEffect(() => {
        let active = true;

        async function loadInitialData() {
            try {
              if (id) {
                const note = await getNoteById(id);
                if (!active) return;
                if (note) {
                    setTitle(note.title || "");
                    setContent(note.content);
                    if (note.record) {
                        setLinkedRecord({ kind: "record", record: note.record });
                    } else if (note.deal) {
                        setLinkedRecord({ kind: "deal", id: note.deal.id, label: note.deal.title });
                    } else if (note.contact) {
                        setLinkedRecord({ kind: "contact", id: note.contact.id, label: note.contact.name });
                    } else if (note.company) {
                        setLinkedRecord({ kind: "company", id: note.company.id, label: note.company.name });
                    }
                }
              } else if (recordId) {
                const record = await getLinkableRecord(recordId, ModuleFeature.NOTES);
                if (active && record) setLinkedRecord({ kind: "record", record });
              } else if (dealId) {
                const deal = (await getDeals()).find((item) => item.id === dealId);
                if (active) setLinkedRecord({ kind: "deal", id: dealId, label: deal?.title || "Deal" });
              } else if (contactId) {
                const contact = (await getContacts()).find((item) => item.id === contactId);
                if (active) setLinkedRecord({ kind: "contact", id: contactId, label: contact?.name || "Contact" });
              } else if (companyId) {
                const company = (await getCompanies()).find((item) => item.id === companyId);
                if (active) setLinkedRecord({ kind: "company", id: companyId, label: company?.name || "Company" });
              }
            } finally {
              if (active) setLoading(false);
            }
        }

        void loadInitialData();
        return () => {
            active = false;
        };
    }, [companyId, contactId, dealId, id, recordId]);

    useEffect(() => () => {
        if (saved.current) return;
        for (const fileId of uploadedImageIds.current) {
            void deleteFile(fileId).catch(() => undefined);
        }
    }, []);

    function getLinkData() {
        const linkData = {
            dealId: null as string | null,
            contactId: null as string | null,
            companyId: null as string | null,
            recordId: null as string | null,
        };
        if (!linkedRecord) return linkData;
        if (linkedRecord.kind === "record") linkData.recordId = linkedRecord.record.id;
        else linkData[`${linkedRecord.kind}Id` as "dealId" | "contactId" | "companyId"] = linkedRecord.id;
        return linkData;
    }

    async function handleSave() {
        const editor = editorRef.current;
        if (!editor || (editor.isEmpty() && !title.trim())) return;
        const noteContent = editor.getHtml();

        const t = toast.loading(isEditing ? "Updating note..." : "Creating note...");

        try {
            const retainedImageIds = new Set(editor.getImageFileIds());
            await Promise.all(
                [...uploadedImageIds.current]
                    .filter((fileId) => !retainedImageIds.has(fileId))
                    .map((fileId) => deleteFile(fileId).catch(() => undefined)),
            );
            const linkData = getLinkData();
            if (isEditing) {
                await updateNote(id!, {
                    title: title.trim(),
                    content: noteContent,
                    ...linkData,
                });
                t.success({
                    title: "Note updated",
                    description: `Your note "${title.trim() || "Untitled"}" has been updated.`,
                    duration: 5000,
                    actions: [
                        { label: "View note", onClick: () => {}, primary: true },
                    ],
                });
            } else {
                await createNote({
                    title: title.trim() || undefined,
                    content: noteContent,
                    dealId: linkData.dealId || undefined,
                    contactId: linkData.contactId || undefined,
                    companyId: linkData.companyId || undefined,
                    recordId: linkData.recordId || undefined,
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
            saved.current = true;
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

    if (loading) return null;

    return (
        <div className={`${S.modalCard} ${Styles.noteModal}`} onKeyDown={handleKeyDown}>
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
                    {linkedRecord ? (
                        <div className={Styles.linkedControl}>
                            <button className={Styles.linkedChip} onClick={() => setShowRecordBrowser(true)}>
                                {linkedRecord.kind === "record" ? (
                                    <span
                                        className={Styles.moduleIcon}
                                        style={{ backgroundColor: linkedRecord.record.module.accentColor || "#5670ff" }}
                                    >
                                        <ModuleIcon name={linkedRecord.record.module.icon} size={13} />
                                    </span>
                                ) : linkedRecord.kind === "deal" ? (
                                    <TargetRegular fontSize={15} />
                                ) : linkedRecord.kind === "contact" ? (
                                    <PersonRegular fontSize={15} />
                                ) : (
                                    <BuildingRegular fontSize={15} />
                                )}
                                {linkedRecord.kind === "record" ? linkedRecord.record.displayName : linkedRecord.label}
                            </button>
                            <button
                                className={Styles.unlinkButton}
                                onClick={() => setLinkedRecord(null)}
                                aria-label="Unlink record"
                                title="Unlink record"
                            >
                                <DismissRegular fontSize={14} />
                            </button>
                        </div>
                    ) : (
                        <button className={Styles.metaChip} onClick={() => setShowRecordBrowser(true)}>
                            <LinkRegular fontSize={15} />
                            Link record
                        </button>
                    )}
                </div>

                <RichTextEditor
                    ref={editorRef}
                    initialHtml={content}
                    placeholder="Start typing, or create a template"
                    onImageUploaded={(fileId) => uploadedImageIds.current.add(fileId)}
                />
            </div>

            <div className={S.modalFooter}>
                <MainButton type="secondary" text={isEditing ? "Discard changes" : "Discard"} onClick={onClose} />
                <MainButton type="primary" text={isEditing ? "Save changes" : "Create note"} onClick={handleSave} />
            </div>

            {showRecordBrowser && (
                <RecordBrowserOverlay
                    requiredFeature={ModuleFeature.NOTES}
                    selectedRecordId={linkedRecord?.kind === "record" ? linkedRecord.record.id : null}
                    onSelect={(record) => setLinkedRecord({ kind: "record", record })}
                    onClose={() => setShowRecordBrowser(false)}
                />
            )}
        </div>
    );
};

export default NoteModal;
