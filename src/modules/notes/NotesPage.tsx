"use client";

import { NoteFilled } from "@fluentui/react-icons";
import TabsControlHeader from "@/components/macro/TabsControlHeader/TabsControlHeader";
import NoteList from "./components/NoteList";
import Styles from "./NotesPage.module.css";
import { useModal } from "@/components/macro/ModalProvider/ModalProvider";

const NotesPage = () => {
    const { openModal } = useModal();

    function handleCreateNote() {
        openModal("note");
    }

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
            <NoteList showHeader={false} onCreateClick={handleCreateNote} />
        </div>
    );
};

export default NotesPage;
