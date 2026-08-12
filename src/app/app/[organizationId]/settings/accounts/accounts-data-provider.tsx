"use client";

import { createContext, useContext, type ReactNode } from "react";
import type {
  getCalendarStatus,
  getGmailStatus,
  getLinkedAccounts,
} from "./actions";

type AccountsInitialData = {
  accounts: Awaited<ReturnType<typeof getLinkedAccounts>>;
  calendarStatus: Awaited<ReturnType<typeof getCalendarStatus>>;
  gmailStatus: Awaited<ReturnType<typeof getGmailStatus>>;
};

const AccountsDataContext = createContext<AccountsInitialData | null>(null);

export function AccountsDataProvider({
  value,
  children,
}: {
  value: AccountsInitialData;
  children: ReactNode;
}) {
  return (
    <AccountsDataContext.Provider value={value}>
      {children}
    </AccountsDataContext.Provider>
  );
}

export function useAccountsInitialData() {
  const context = useContext(AccountsDataContext);
  if (!context) {
    throw new Error("useAccountsInitialData must be used within AccountsDataProvider");
  }
  return context;
}