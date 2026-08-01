import type { ReactNode } from "react";
import {
    getWorkspaceInvitations,
    getWorkspaceMembers,
} from "@/modules/workspace/actions";
import { MembersDataProvider } from "./members-data-provider";

export default async function MembersLayout({ children }: { children: ReactNode }) {
    const [members, invitations] = await Promise.all([
        getWorkspaceMembers(),
        getWorkspaceInvitations(),
    ]);

    return (
        <MembersDataProvider value={{ members, invitations }}>
            {children}
        </MembersDataProvider>
    );
}