import { redirect } from "next/navigation";

import { getSessionClaims } from "@/lib/auth/session";
import AuthShell from "@/modules/auth/components/AuthShell/AuthShell";
import LoginForm from "@/modules/auth/components/login-form";
import { WorkspaceService } from "@/modules/workspace/service";

const LoginPage = async () => {
    let session;
    try {
        session = await getSessionClaims();
    } catch {
        session = null;
    }

    if (session) {
        const workspaceSlug = await WorkspaceService.getWorkspaceSlug(
            session.organizationId,
            session.userId,
        );
        redirect(`/app/${workspaceSlug}/home`);
    }

    return <AuthShell><LoginForm /></AuthShell>;
};

export default LoginPage;