"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getCanonicalWorkspacePath } from "@/modules/workspace/workspace-url";

type CanonicalWorkspaceUrlProps = {
  legacyOrganizationId: string;
  workspaceSlug: string;
};

export default function CanonicalWorkspaceUrl({
  legacyOrganizationId,
  workspaceSlug,
}: CanonicalWorkspaceUrlProps) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const canonicalPath = getCanonicalWorkspacePath(
      pathname,
      legacyOrganizationId,
      workspaceSlug,
    );
    if (!canonicalPath) return;
    router.replace(`${canonicalPath}${window.location.search}`);
  }, [legacyOrganizationId, pathname, router, workspaceSlug]);

  return null;
}