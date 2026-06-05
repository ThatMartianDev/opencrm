export type WorkspaceRole = "OWNER" | "ADMIN" | "MANAGER" | "MEMBER";

export type WorkspaceBootstrap = {
	organizationId: string;
	user: {
		id: string;
		email: string;
		name: string;
		avatarUrl: string | null;
	};
	member: {
		id: string;
		role: WorkspaceRole;
		permissions: string[];
	};
	organization: {
		id: string;
		name: string;
		slug: string;
		plan: string;
		logoUrl: string | null;
	};
};


export type MemberDataSize = "full" | "partial" | "minimal";