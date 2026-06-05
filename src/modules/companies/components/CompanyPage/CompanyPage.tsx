"use client";

import {
    MoneyFilled,
    SlashForwardFilled,
    ArrowLeftRegular,
    TaskListSquareLtrRegular,
    TaskListSquareLtrFilled,
    NoteRegular,
    NoteFilled,
    FolderRegular,
    FolderFilled,
    TaskListSquareAddRegular,
    NoteAddRegular,
} from "@fluentui/react-icons";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

import TabsControlHeader from "@/components/macro/TabsControlHeader/TabsControlHeader";
import AvatarFallback from "@/components/micro/AvatarFallback/AvatarFallback";
import { useModal } from "@/components/macro/ModalProvider/ModalProvider";
import { getCompanyById } from "../../actions";
import { CompanyWithRelations } from "../../types";
import OverviewTab from "./tabs/Overview";
import ContactsTab from "./tabs/Contacts";
import NotesTab from "./tabs/Notes";
import FilesTab from "./tabs/Files";
import Styles from "./CompanyPage.module.css";

const tabs = [
    { label: "Overview", id: "overview" },
    {
        label: "Contacts",
        id: "contacts",
        color: "rgb(109, 58, 146)",
        icon: { regular: <TaskListSquareLtrRegular />, filled: <TaskListSquareLtrFilled /> },
    },
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
];

const CompanyPage = () => {
    const { companyId } = useParams<{ companyId: string }>();
    const [company, setCompany] = useState<CompanyWithRelations | null>(null);
    const [activeTab, setActiveTab] = useState("overview");
    const { openModal } = useModal();

    const iconButtons = [
        {
            id: "create_task",
            tooltip: "Create Task",
            icon: <TaskListSquareAddRegular />,
            onClick: () => openModal("task", { companyId }),
        },
        {
            id: "create_note",
            tooltip: "Add Note",
            icon: <NoteAddRegular />,
            onClick: () => openModal("note", { companyId }),
        },
    ];

    const refreshCompany = useCallback(() => {
        if (companyId) {
            getCompanyById(companyId).then((data) => {
                setCompany(data);
            });
        }
    }, [companyId]);

    useEffect(() => {
        refreshCompany();
    }, [refreshCompany]);

    if (!company) return null;

    return (
        <div id={Styles.companyPage}>
            <header className="global_header">
                <Link
                    href={`/app/${company.organizationId}/companies`}
                    className="g_header_section_name"
                >
                    <ArrowLeftRegular fontSize={14} />
                </Link>
                <div className="g_header_section_name">
                    <span style={{ backgroundColor: "#0E76B9" }}>
                        <MoneyFilled fontSize={20} color="#fff" />
                    </span>
                    <h2>Companies</h2>
                </div>
                <span className="g_header_slash">
                    <SlashForwardFilled fontSize={14} />
                </span>
                <div className="g_header_entity_name">
                    <AvatarFallback
                        name={company.name}
                        entityKind="customer"
                        entityId={company.id}
                        size={22}
                        style={{ borderRadius: 8 }}
                        letterCount={1}
                    />
                    <h2>{company.name}</h2>
                </div>
            </header>
            <TabsControlHeader
                tabs={tabs}
                onTabBtnClick={setActiveTab}
                showMainBtn={false}
                iconButtons={iconButtons}
            />
            <div className="flex-col w-full" style={{ height: "100%", overflow: "hidden" }}>
                {activeTab === "overview" && <OverviewTab company={company} onRefresh={refreshCompany} />}
                {activeTab === "contacts" && <ContactsTab companyId={company.id} />}
                {activeTab === "notes" && <NotesTab companyId={company.id} />}
                {activeTab === "files" && <FilesTab companyId={company.id} />}
            </div>
        </div>
    );
};

export default CompanyPage;
