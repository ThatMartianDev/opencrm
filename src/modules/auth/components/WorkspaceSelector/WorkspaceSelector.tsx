"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRightRegular } from "@fluentui/react-icons";

import AvatarFallback from "@/components/micro/AvatarFallback/AvatarFallback";
import { selectWorkspaceAfterLogin } from "@/modules/auth/actions";
import type { WorkspaceSummary } from "@/modules/workspace/types";
import Styles from "./WorkspaceSelector.module.css";
import MainButton from "@/components/micro/MainButton/MainButton";

type WorkspaceSelectorProps = {
  workspaces: WorkspaceSummary[];
};

export default function WorkspaceSelector({ workspaces }: WorkspaceSelectorProps) {
  const [switchingWorkspace, setSwitchingWorkspace] = useState<WorkspaceSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectWorkspace = async (workspace: WorkspaceSummary) => {
    if (switchingWorkspace) return;

    setError(null);
    setSwitchingWorkspace(workspace);

    try {
      const result = await selectWorkspaceAfterLogin(workspace.id);
      window.location.replace(`/app/${result.workspaceSlug}/home`);
    } catch {
      setSwitchingWorkspace(null);
      setError("This workspace is no longer available to your account.");
    }
  };

    useEffect(() => {
      window.document.title = "Choose a workspace | UntitledCRM";
    }, []);

  return (
    <section className={Styles.selector} aria-labelledby="workspace-heading">
      <header>
        <h1 id="workspace-heading">Choose a workspace</h1>
        <p>Select where you want to continue.</p>
      </header>

      <div className={Styles.workspaceList}>
        {workspaces.map((workspace) => (
          <button
            type="button"
            key={workspace.id}
            className={Styles.workspaceButton}
            disabled={switchingWorkspace !== null}
            onClick={() => selectWorkspace(workspace)}
          >
            <AvatarFallback
              name={workspace.name}
              entityKind="organization"
              entityId={workspace.id}
              imageUrl={workspace.logoUrl ?? undefined}
              size={40}
              letterCount={1}
              style={{ borderRadius: 8 }}
            />
            <span className={Styles.workspaceDetails}>
              <strong>{workspace.name}</strong>
              <span>{workspace.role.toLowerCase()}</span>
            </span>
            <ChevronRightRegular className={Styles.arrow} aria-hidden="true" />
          </button>
        ))}
      </div>

      {error && <p className={Styles.error} role="alert">{error}</p>}
      <MainButton type="primary" htmlTag="a" href="/login" text="Back to login"/>

      {switchingWorkspace && (
        <div className={Styles.overlay} role="status" aria-live="polite">
          <span className={Styles.spinner} aria-hidden="true" />
          <p>Changing workspace</p>
          <span>{switchingWorkspace.name}</span>
        </div>
      )}
    </section>
  );
}