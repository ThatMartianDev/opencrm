"use server";

import { getSessionClaims } from "@/lib/auth/session";
import { WorkspaceService } from "@/modules/workspace/service";

export async function fetchOrganizationMembers(organizationId: string) {
    const session = await getSessionClaims();

    if (session.organizationId !== organizationId) {
        throw new Error("Forbidden");
    }

    const members = await WorkspaceService.getAllMembers(organizationId);
    return members.map((member) => ({
        id: member.id,
        name: member.user.name,
        email: member.user.email,
        avatarUrl: member.user.avatarUrl,
    }));
    
}
