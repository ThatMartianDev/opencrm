import { redirect } from "next/navigation";

import { getSessionClaims } from "@/lib/auth/session";
import { canCreateWorkspace } from "@/modules/auth/actions";
import WorkspaceCreationForm from "@/modules/workspace/components/WorkspaceCreationForm/WorkspaceCreationForm";
import { WorkspaceService } from "@/modules/workspace/service";
import Styles from "./page.module.css";

export default async function CreateWorkspacePage() {
  let cancelHref = "/login";

  try {
    const session = await getSessionClaims();
    const workspaceSlug = await WorkspaceService.getWorkspaceSlug(
      session.organizationId,
      session.userId,
    );
    cancelHref = `/app/${workspaceSlug}/home`;
  } catch {
    if (!(await canCreateWorkspace())) {
      redirect("/login");
    }
  }

  return (
    <main className={Styles.page}>
      <WorkspaceCreationForm cancelHref={cancelHref} />
    </main>
  );
}