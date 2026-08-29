export type WorkspaceRole = "OWNER" | "ADMIN" | "MANAGER" | "MEMBER";

export type WorkspaceSummary = {
	id: string;
	name: string;
	slug: string;
	logoUrl: string | null;
	role: WorkspaceRole;
};

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
	workspaces: WorkspaceSummary[];
	recordModules: {
		id: string;
		key: string;
		name: string;
		pluralName: string | null;
		icon: string;
		accentColor: string | null;
	}[];
};


export type MemberDataSize = "full" | "partial" | "minimal";