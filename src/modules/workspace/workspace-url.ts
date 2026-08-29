export function matchesWorkspaceRoute(
  workspaceKey: string,
  organizationId: string,
  workspaceSlug: string,
) {
  return workspaceKey === workspaceSlug || workspaceKey === organizationId;
}

export function getCanonicalWorkspacePath(
  pathname: string,
  legacyOrganizationId: string,
  workspaceSlug: string,
) {
  const legacyPrefix = `/app/${legacyOrganizationId}`;
  if (pathname !== legacyPrefix && !pathname.startsWith(`${legacyPrefix}/`)) {
    return null;
  }

  return `/app/${workspaceSlug}${pathname.slice(legacyPrefix.length)}`;
}