"use client";

import {
    PeopleFilled,
    SlashForwardFilled,
    ArrowLeftRegular,
    NoteRegular,
    NoteFilled,
    FolderRegular,
    FolderFilled,
    NoteAddRegular,
    TaskListSquareAddRegular,
    MailRegular,
    MailFilled,
} from "@fluentui/react-icons";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

import TabsControlHeader from "@/components/macro/TabsControlHeader/TabsControlHeader";
import AvatarFallback from "@/components/micro/AvatarFallback/AvatarFallback";
import { useModal } from "@/components/macro/ModalProvider/ModalProvider";
import { useWorkspaceData } from "@/modules/workspace/components/workspace-provider";
import { getContactById } from "../../actions";
import { ContactWithRelations } from "../../types";
import OverviewTab from "./tabs/Overview";
import NotesTab from "./tabs/Notes";
import FilesTab from "./tabs/Files";
import Styles from "./ContactPage.module.css";
import EmailsTab from "./tabs/Emails";

const tabs = [
    { label: "Overview", id: "overview" },
    {
        label: "Notes",
        id: "notes",
        color: "rgb(228, 119, 46)",
        icon: { regular: <NoteRegular />, filled: <NoteFilled /> },
    },
    {
        label: "Files",
        id: "files",
        color: "rgb(245, 197, 66)",
        icon: { regular: <FolderRegular />, filled: <FolderFilled /> },
    },
    {
        label: "Emails",
        id: "emails",
        color: "rgb(66, 133, 244)",
        icon: { regular: <MailRegular />, filled: <MailFilled /> },
    },
];

const ContactPage = () => {
    const { contactId } = useParams<{ contactId: string }>();
    const [contact, setContact] = useState<ContactWithRelations | null>(null);
    const [activeTab, setActiveTab] = useState("overview");
    const { openModal } = useModal();
    const { organization } = useWorkspaceData();

    const iconButtons = [
        {
            id: "create_task",
            tooltip: "Create Task",
            icon: <TaskListSquareAddRegular color="#474747"/>,
            onClick: () => openModal("task"),
        },
        {
            id: "create_note",
            tooltip: "Add Note",
            icon: <NoteAddRegular color="#474747"/>,
            onClick: () => openModal("note", { contactId }),
        },
    ];

    const refreshContact = useCallback(() => {
        if (contactId) {
            getContactById(contactId).then((data) => {
                setContact(data);
            });
        }
    }, [contactId]);

    useEffect(() => {
        refreshContact();
    }, [refreshContact]);

    if (!contact) return null;

    return (
        <div id={Styles.contactPage}>
            <header className="global_header">
                <Link
                    href={`/app/${organization.slug}/contacts`}
                    className="g_header_section_name"
                >
                    <ArrowLeftRegular fontSize={14} />
                </Link>
                <div className="g_header_section_name">
                    <span style={{ backgroundColor: "#6D3A92" }}>
                        <PeopleFilled fontSize={20} color="#fff" />
                    </span>
                    <h2>Contacts</h2>
                </div>
                <span className="g_header_slash">
                    <SlashForwardFilled fontSize={14} />
                </span>
                <div className="g_header_entity_name">
                    <AvatarFallback
                        name={contact.name}
                        entityKind="customer"
                        entityId={contact.id}
                        size={22}
                        letterCount={1}
                    />
                    <h2>{contact.name}</h2>
                </div>
            </header>
            <TabsControlHeader
                tabs={tabs}
                onTabBtnClick={setActiveTab}
                showMainBtn={false}
                iconButtons={iconButtons}
            />
            <div className="flex-col w-full" style={{ height: "100%", overflow: "hidden" }}>
                {activeTab === "overview" && <OverviewTab contact={contact} onRefresh={refreshContact} />}
                {activeTab === "notes" && <NotesTab contactId={contact.id} />}
                {activeTab === "files" && <FilesTab contactId={contact.id} />}
                {activeTab === "emails" && <EmailsTab contactId={contact.id} />}
            </div>
        </div>
    );
};

export default ContactPage;
