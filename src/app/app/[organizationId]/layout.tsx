import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import type { SessionClaims } from "@/lib/auth/types";
import { getSessionClaims } from "@/lib/auth/session";
import { getWorkspaceBootstrap } from "@/modules/workspace/queries";
import { WorkspaceProvider } from "@/modules/workspace/components/workspace-provider";
import CanonicalWorkspaceUrl from "@/modules/workspace/components/CanonicalWorkspaceUrl";
import type { WorkspaceBootstrap } from "@/modules/workspace/types";
import { matchesWorkspaceRoute } from "@/modules/workspace/workspace-url";

type LayoutProps = {
  children: ReactNode;
  params: Promise<{
    organizationId: string;
  }>;
};

function loginPathForWorkspace(workspaceKey: string) {
  return "/login?next=" + encodeURIComponent("/app/" + workspaceKey + "/home");
}

const Layout = async ({ children, params }: LayoutProps) => {
  const { organizationId: workspaceKey } = await params;

  let session: SessionClaims;
  try {
    session = await getSessionClaims();
  } catch {
    redirect(loginPathForWorkspace(workspaceKey));
  }

  let workspace: WorkspaceBootstrap;
  try {
    workspace = await getWorkspaceBootstrap(session.organizationId, session);
  } catch {
    redirect(loginPathForWorkspace(workspaceKey));
  }

  if (!matchesWorkspaceRoute(
    workspaceKey,
    session.organizationId,
    workspace.organization.slug,
  )) {
    redirect(`/app/${workspace.organization.slug}/home`);
  }

  return (
    <WorkspaceProvider key={session.organizationId} value={workspace}>
      <CanonicalWorkspaceUrl
        legacyOrganizationId={session.organizationId}
        workspaceSlug={workspace.organization.slug}
      />
      {children}
    </WorkspaceProvider>
  );
};

export default Layout;
