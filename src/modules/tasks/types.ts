import { Prisma } from "@/generated/prisma/client";

export type TaskWithRelations = Prisma.TaskGetPayload<{
    include: {
        assignedTo: {
            include: { user: { select: { name: true; avatarUrl: true } } };
        };
        deal: { select: { id: true; title: true } };
        record: {
            select: {
                id: true;
                displayName: true;
                module: {
                    select: {
                        id: true;
                        key: true;
                        name: true;
                        icon: true;
                        accentColor: true;
                    };
                };
            };
        };
    };
}>;
