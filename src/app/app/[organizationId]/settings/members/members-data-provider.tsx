"use client";

import { createContext, useContext, type ReactNode } from "react";
import type {
    getWorkspaceInvitations,
    getWorkspaceMembers,
} from "@/modules/workspace/actions";

type MembersInitialData = {
    members: Awaited<ReturnType<typeof getWorkspaceMembers>>;
    invitations: Awaited<ReturnType<typeof getWorkspaceInvitations>>;
};

const MembersDataContext = createContext<MembersInitialData | null>(null);

export function MembersDataProvider({
    value,
    children,
}: {
    value: MembersInitialData;
    children: ReactNode;
}) {
    return (
        <MembersDataContext.Provider value={value}>
            {children}
        </MembersDataContext.Provider>
    );
}

export function useMembersInitialData() {
    const context = useContext(MembersDataContext);
    if (!context) {
        throw new Error("useMembersInitialData must be used within MembersDataProvider");
    }
    return context;
}