"use client";

import { FileManager } from "@/modules/files";

type Props = {
    contactId: string;
};

const FilesTab = ({ contactId }: Props) => {
    return <FileManager scope={{ contactId }} />;
};

export default FilesTab;
