"use client";

import { NoteFilled } from "@fluentui/react-icons";
import TabsControlHeader from "@/components/macro/TabsControlHeader/TabsControlHeader";
import NoteList from "./components/NoteList";
import Styles from "./NotesPage.module.css";
import { useModal } from "@/components/macro/ModalProvider/ModalProvider";
import { useEffect, useState } from "react";
import type { getNotes } from "./actions";
import { useWorkspaceData } from "@/modules/workspace/components/workspace-provider";

type NotesPageProps = {
    initialPage: Awaited<ReturnType<typeof getNotes>>;
};

const NotesPage = ({ initialPage }: NotesPageProps) => {
    const { openModal } = useModal();
    const { member } = useWorkspaceData();
    const [refreshVersion, setRefreshVersion] = useState(0);
    const authorizationKey = `${member.id}:${member.role}:${member.permissions.join(",")}`;

    function handleCreateNote() {
        openModal("note", {}, () => setRefreshVersion((current) => current + 1));
    }

    useEffect(() => {
        window.document.title = "Notes";
    }, []);

    return (
        <div className={Styles.notesPage}>
            <header className="global_header">
                <div className="g_header_section_name">
                    <span style={{ backgroundColor: "rgba(109, 58, 146, 1)" }}>
                        <NoteFilled fontSize={20} color="#fff" />
                    </span>
                    <h2>Notes</h2>
                </div>
            </header>
            <TabsControlHeader
                tabs={[]}
                onTabBtnClick={() => {}}
                showMainBtn={true}
                mainButton={{ text: "New Note", onClick: handleCreateNote }}
            />
            <NoteList
                key={`${authorizationKey}:${refreshVersion}`}
                showHeader={false}
                initialPage={refreshVersion === 0 ? initialPage : undefined}
            />
        </div>
    );
};

export default NotesPage;
