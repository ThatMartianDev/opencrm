import "server-only";

import { AppError } from "@/lib/errors";
import { SessionClaims } from "@/lib/auth/types";
import { WorkspaceService } from "./service";

export async function getWorkspaceBootstrap(organizationId: string, session: SessionClaims) {
	if (session.organizationId !== organizationId) {
		throw new AppError("Workspace mismatch", "FORBIDDEN", 403);
	}

	return WorkspaceService.getWorkspaceBootstrap(organizationId, session.userId);
}
