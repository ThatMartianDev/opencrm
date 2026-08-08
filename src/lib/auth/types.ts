import type { MemberRole } from "@/generated/prisma/enums";

export type SessionPayload = {
    userId: string;
    memberId: string;
    organizationId: string;
    role: MemberRole;
}

export type SessionClaims = SessionPayload & {
    permissions?: string[];
};