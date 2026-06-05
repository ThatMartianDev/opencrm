"use client";

import { FileManager } from "@/modules/files";

type Props = {
    companyId: string;
};

const FilesTab = ({ companyId }: Props) => {
    return <FileManager scope={{ companyId }} />;
};

export default FilesTab;
