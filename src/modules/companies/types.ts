import { Prisma } from "@/generated/prisma/client";

export type CompanyWithRelations = Prisma.CompanyGetPayload<{
    include: {
        contacts: true;
        deals: true;
    };
}>;
