import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import type { SessionClaims } from "@/lib/auth/types";
import { getSessionClaims } from "@/lib/auth/session";
import { getWorkspaceBootstrap } from "@/modules/workspace/queries";
import { WorkspaceProvider } from "@/modules/workspace/components/workspace-provider";
import type { WorkspaceBootstrap } from "@/modules/workspace/types";

type LayoutProps = {
  children: ReactNode;
  params: Promise<{
    organizationId: string;
  }>;
};

function loginPathForOrganization(organizationId: string) {
  return "/login?next=" + encodeURIComponent("/app/" + organizationId + "/home");
}

const Layout = async ({ children, params }: LayoutProps) => {
  const { organizationId: organizationId } = await params;

  let session: SessionClaims;
  try {
    session = await getSessionClaims();
  } catch {
    redirect(loginPathForOrganization(organizationId));
  }

  if (session.organizationId !== organizationId) {
    redirect("/app/" + session.organizationId + "/home");
  }

  let workspace: WorkspaceBootstrap;
  try {
    workspace = await getWorkspaceBootstrap(organizationId, session);
  } catch {
    redirect(loginPathForOrganization(organizationId));
  }

  return (
    <WorkspaceProvider value={workspace}>
      {children}
    </WorkspaceProvider>
  );
};

export default Layout;
