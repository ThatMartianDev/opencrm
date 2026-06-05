"use client";

import { createContext, useContext, type ReactNode } from "react";
import { WorkspaceBootstrap } from "../types";

const WorkspaceContext = createContext<WorkspaceBootstrap | null>(null);

type WorkspaceProviderProps = {
  value: WorkspaceBootstrap;
  children: ReactNode;
};

export function WorkspaceProvider({ value, children }: WorkspaceProviderProps) {
  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspaceData() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error("useWorkspaceData must be used within WorkspaceProvider");
  }

  return context;
}