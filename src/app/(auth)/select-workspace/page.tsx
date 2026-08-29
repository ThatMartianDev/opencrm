import { redirect } from "next/navigation";

import { getWorkspaceSelectionUserId } from "@/lib/auth/session";
import WorkspaceSelector from "@/modules/auth/components/WorkspaceSelector/WorkspaceSelector";
import { WorkspaceService } from "@/modules/workspace/service";
import Styles from "../Styles.module.css";

export default async function SelectWorkspacePage() {
  let userId: string;

  try {
    userId = await getWorkspaceSelectionUserId();
  } catch {
    redirect("/login");
  }

  const workspaces = await WorkspaceService.getUserWorkspaces(userId);
  if (workspaces.length === 0) redirect("/login");

  return (
    <div className={Styles.authPage}>
      <WorkspaceSelector workspaces={workspaces} />
    </div>
  );
}