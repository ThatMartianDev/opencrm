import { redirect } from "next/navigation";
import { getSessionClaims } from "@/lib/auth/session";
import { WorkspaceService } from "@/modules/workspace/service";

export default async function SettingsIndex() {
    const session = await getSessionClaims();
    const workspaceSlug = await WorkspaceService.getWorkspaceSlug(
        session.organizationId,
        session.userId,
    );
    redirect(`/app/${workspaceSlug}/settings/profile`);
}
