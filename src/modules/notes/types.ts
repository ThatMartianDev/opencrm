import { Prisma } from "@/generated/prisma/client";

export type NoteWithCreator = Prisma.NoteGetPayload<{}> & {
    createdBy?: {
        id: string;
        user: { name: string; avatarUrl: string | null };
    };
};

export type NoteContext = {
    dealId?: string;
    contactId?: string;
    companyId?: string;
};
