import { Prisma } from "@/generated/prisma/client";

type _DealWithRelations = Prisma.DealGetPayload<{
    include: {
        contact: true;
        company: true;
        assignedTo: {
            include: { user: { select: { name: true; avatarUrl: true } } };
        };
    };
}>;

export type DealWithRelations = Omit<_DealWithRelations, "value"> & { value: number | null };
