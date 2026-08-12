import type { ReactNode } from "react";
import {
  getCalendarStatus,
  getGmailStatus,
  getLinkedAccounts,
} from "./actions";
import { AccountsDataProvider } from "./accounts-data-provider";

export default async function AccountsLayout({ children }: { children: ReactNode }) {
  const [accounts, calendarStatus, gmailStatus] = await Promise.all([
    getLinkedAccounts(),
    getCalendarStatus(),
    getGmailStatus(),
  ]);

  return (
    <AccountsDataProvider value={{ accounts, calendarStatus, gmailStatus }}>
      {children}
    </AccountsDataProvider>
  );
}