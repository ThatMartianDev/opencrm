export type EntityType = "deal" | "contact" | "company";

export type EntityRef = {
    entityType: EntityType;
    entityId: string;
};

export type ActivityWithMember = {
    id: string;
    action: string;
    description: string | null;
    metadata: unknown;
    createdAt: Date;
    member: {
        id: string;
        user: { name: string; avatarUrl: string | null };
    } | null;
};
