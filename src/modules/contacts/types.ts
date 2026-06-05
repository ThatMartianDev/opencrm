import { Prisma } from "@/generated/prisma/client";

export type ContactWithRelations = Prisma.ContactGetPayload<{
    include: {
        company: true;
        deals: true;
    };
}>;
