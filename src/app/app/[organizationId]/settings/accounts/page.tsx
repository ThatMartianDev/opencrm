"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import {
  getLinkedAccounts,
  disconnectAccount,
  LinkedAccount,
  getCalendarStatus,
  disconnectCalendar,
  getGmailStatus,
  disconnectGmail,
} from "./actions";
import Styles from "./accounts.module.css";

type Tab = "accounts" | "calendar" | "email";

export default function AccountsPage() {
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") as Tab) || "accounts";
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const [accounts, setAccounts] = useState<LinkedAccount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getLinkedAccounts().then((data) => {
      setAccounts(data);
      setLoading(false);
    });
  }, []);

  async function handleDisconnect(accountId: string) {
    const result = await disconnectAccount(accountId);
    if (result.success) {
      setAccounts((prev) => prev.filter((a) => a.id !== accountId));
    } else {
      alert(result.error);
    }
  }

  return (
    <div>
      <h1 className={Styles.title}>Connected Accounts</h1>
      <p className={Styles.subtitle}>
        Manage third-party integrations and connected services.
      </p>

      <div className={Styles.tabs}>
        <button
          className={`${Styles.tab} ${activeTab === "accounts" ? Styles.tabActive : ""}`}
          onClick={() => setActiveTab("accounts")}
        >
          Accounts
        </button>
        <button
          className={`${Styles.tab} ${activeTab === "calendar" ? Styles.tabActive : ""}`}
          onClick={() => setActiveTab("calendar")}
        >
          Calendar
        </button>
        <button
          className={`${Styles.tab} ${activeTab === "email" ? Styles.tabActive : ""}`}
          onClick={() => setActiveTab("email")}
        >
          Email
        </button>
      </div>

      {activeTab === "accounts" && (
        <AccountsTab
          accounts={accounts}
          loading={loading}
          onDisconnect={handleDisconnect}
        />
      )}

      {activeTab === "calendar" && <CalendarTab />}

      {activeTab === "email" && <EmailTab />}
    </div>
  );
}

function AccountsTab({
  accounts,
  loading,
  onDisconnect,
}: {
  accounts: LinkedAccount[];
  loading: boolean;
  onDisconnect: (id: string) => void;
}) {
  if (loading) {
    return <div className={Styles.emptyState}>Loading...</div>;
  }

  return (
    <div className={Styles.section}>
      <h4>Connected Accounts</h4>
      {accounts.map((account) =>
        account.provider.includes("_email") ||
        account.provider.includes("_calendar") || account.provider.includes("_gmail") ? null : (
          <div key={account.id} className={Styles.accountCard}>
            <div className={Styles.accountIcon}>
              <GoogleIcon />
            </div>
            <div className={Styles.accountInfo}>
              <p className={Styles.accountProvider}>
                {account.provider.charAt(0).toUpperCase() +
                  account.provider.slice(1)}
              </p>
              <p className={Styles.accountDate}>
                Connected {new Date(account.createdAt).toLocaleDateString()}
              </p>
            </div>
            <button
              className={Styles.disconnectBtn}
              onClick={() => onDisconnect(account.id)}
            >
              Disconnect
            </button>
          </div>
        ),
      )}

      <h4>Connect Accounts</h4>
      <a href="/api/auth/google" className={Styles.connectBtn}>
        <GoogleIcon />
        Connect Google Account
      </a>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z"
        fill="#34A853"
      />
      <path
        d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z"
        fill="#EA4335"
      />
    </svg>
  );
}

function CalendarTab() {
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [scope, setScope] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);

  useEffect(() => {
    getCalendarStatus().then((status) => {
      setConnected(status.connected);
      setScope(status.scope);
      setLoading(false);
    });
  }, []);

  async function handleDisconnect() {
    setDisconnecting(true);
    const result = await disconnectCalendar();
    if (result.success) {
      setConnected(false);
      setScope(null);
    } else {
      alert(result.error);
    }
    setDisconnecting(false);
  }

  if (loading) {
    return <div className={Styles.emptyState}>Loading...</div>;
  }

  if (connected) {
    return (
      <div className={Styles.section}>
        <div className={Styles.accountCard}>
          <div className={Styles.accountIcon}>
            <GoogleCalendarIcon />
          </div>
          <div className={Styles.accountInfo}>
            <p className={Styles.accountProvider}>Google Calendar</p>
            <p className={Styles.accountDate}>
              {scope?.includes("calendar.events")
                ? "Read & Write access"
                : "Read-only access"}
            </p>
          </div>
          <button
            className={Styles.disconnectBtn}
            onClick={handleDisconnect}
            disabled={disconnecting}
          >
            {disconnecting ? "Disconnecting..." : "Disconnect"}
          </button>
        </div>
        <p className={Styles.calendarHint}>
          Your Google Calendar is synced. View your events in the Calendar page.
        </p>
      </div>
    );
  }

  return (
    <div className={Styles.section}>
      <p className={Styles.calendarDescription}>
        Connect your Google Calendar to see your meetings in the CRM,
        automatically link events to contacts and deals, and create calendar
        events directly from the app.
      </p>
      <a href="/api/auth/google-calendar" className={Styles.connectBtn}>
        <GoogleCalendarIcon />
        Connect Google Calendar
      </a>
    </div>
  );
}

function GoogleCalendarIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        x="2"
        y="3"
        width="14"
        height="13"
        rx="2"
        stroke="#4285F4"
        strokeWidth="1.5"
        fill="none"
      />
      <path d="M2 7h14" stroke="#4285F4" strokeWidth="1.5" />
      <path
        d="M6 1v4M12 1v4"
        stroke="#4285F4"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="9" cy="11" r="1.5" fill="#34A853" />
    </svg>
  );
}

function GmailIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M2 4h14v10a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V4Z"
        stroke="#EA4335"
        strokeWidth="1.5"
        fill="none"
      />
      <path
        d="M2 4l7 6 7-6"
        stroke="#EA4335"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function EmailTab() {
  const [connected, setConnected] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);

  useEffect(() => {
    getGmailStatus().then((status) => {
      setConnected(status.connected);
      setEmail(status.email);
      setLoading(false);
    });
  }, []);

  async function handleDisconnect() {
    setDisconnecting(true);
    const result = await disconnectGmail();
    if (result.success) {
      setConnected(false);
      setEmail(null);
    } else {
      alert(result.error);
    }
    setDisconnecting(false);
  }

  if (loading) {
    return <div className={Styles.emptyState}>Loading...</div>;
  }

  if (connected) {
    return (
      <div className={Styles.section}>
        <div className={Styles.accountCard}>
          <div className={Styles.accountIcon}>
            <GmailIcon />
          </div>
          <div className={Styles.accountInfo}>
            <p className={Styles.accountProvider}>Gmail</p>
            <p className={Styles.accountDate}>{email}</p>
          </div>
          <button
            className={Styles.disconnectBtn}
            onClick={handleDisconnect}
            disabled={disconnecting}
          >
            {disconnecting ? "Disconnecting..." : "Disconnect"}
          </button>
        </div>
        <p className={Styles.calendarHint}>
          Your Gmail is connected. Emails sync automatically to contacts, deals,
          and companies.
        </p>
      </div>
    );
  }

  return (
    <div className={Styles.section}>
      <p className={Styles.calendarDescription}>
        Connect your Gmail account to send and receive emails directly inside
        OpenCRM. Emails are automatically linked to your contacts, deals, and
        companies.
      </p>
      <a href="/api/auth/google-gmail" className={Styles.connectBtn}>
        <GmailIcon />
        Connect Gmail
      </a>
    </div>
  );
}
