"use client";

import { useParams } from "next/navigation";
import NoteList from "@/modules/notes/components/NoteList";

const CommentsTab = () => {
    const { dealId } = useParams<{ dealId: string }>();

    return <NoteList dealId={dealId} showHeader={false} />;
};

export default CommentsTab;
