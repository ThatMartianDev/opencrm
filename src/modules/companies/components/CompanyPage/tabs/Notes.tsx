"use client";

import NoteList from "@/modules/notes/components/NoteList";

type Props = {
    companyId: string;
};

const NotesTab = ({ companyId }: Props) => {
    return <NoteList companyId={companyId} showHeader={false} />;
};

export default NotesTab;
