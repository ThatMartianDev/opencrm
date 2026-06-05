"use client";

import { FileManager } from "@/modules/files";

type Props = {
  dealId: string;
};

const FilesTab = ({ dealId }: Props) => {
  return <FileManager scope={{ dealId }} />;
};

export default FilesTab;
