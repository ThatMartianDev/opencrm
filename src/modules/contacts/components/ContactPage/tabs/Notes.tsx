"use client";

import NoteList from "@/modules/notes/components/NoteList";

type Props = {
    contactId: string;
};

const NotesTab = ({ contactId }: Props) => {
    return <NoteList contactId={contactId} showHeader={false} />;
};

export default NotesTab;
