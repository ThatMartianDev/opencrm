import { Prisma } from "@/generated/prisma/client";

export type TaskWithRelations = Prisma.TaskGetPayload<{
    include: {
        assignedTo: {
            include: { user: { select: { name: true; avatarUrl: true } } };
        };
        deal: { select: { id: true; title: true } };
    };
}>;
