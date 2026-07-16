"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import {
  ComposeFilled,
  MailRegular,
  MailInboxRegular,
  MailArrowUpRegular,
  DraftsRegular,
  ArrowSyncRegular,
  ChevronLeftRegular,
  ChevronRightRegular,
  MailArrowUpFilled,
  MailInboxFilled,
  DraftsFilled,
  FilterRegular,
} from "@fluentui/react-icons";

import TabsControlHeader from "@/components/macro/TabsControlHeader/TabsControlHeader";
import { useToast } from "@/components/macro/Toaster";
import {
  checkMailboxConnection,
  syncMailboxAction,
  fetchEmails,
  fetchEmailContacts,
} from "./actions";
import ConnectMailboxPrompt from "./Components/ConnectMailboxPrompt/ConnectMailboxPrompt";
import EmailList from "./Components/EmailList/EmailList";
import EmailDetailPanel from "./Components/EmailDetailPanel/EmailDetailPanel";

import { useModal } from "@/components/macro/ModalProvider/ModalProvider";

import Styles from "./EmailsPage.module.css";
import FilterEmailsDropdown from "./Components/FilterEmailsDropdown/FilterEmailsDropdown";

export type EmailData = Awaited<
  ReturnType<typeof fetchEmails>
>["emails"][number];
type ContactOption = Awaited<ReturnType<typeof fetchEmailContacts>>[number];

const PAGE_SIZE = 10;
type Folder = "inbox" | "sent" | "drafts";

const FOLDERS: {
  id: Folder;
  label: string;
  icon?: { regular: any; filled: any };
  bgActiveColor?: string;
  color?: string;
}[] = [
  {
    id: "inbox",
    label: "Inbox",
    icon: { regular: <MailInboxRegular />, filled: <MailInboxRegular /> },
    color: "#1a1a1a",
  },
  {
    id: "sent",
    label: "Sent",
    icon: { regular: <MailArrowUpRegular />, filled: <MailArrowUpRegular /> },
    color: "#1a1a1a",
  },
  {
    id: "drafts",
    label: "Drafts",
    icon: { regular: <DraftsRegular />, filled: <DraftsRegular /> },
    color: "#1a1a1a",
  },
];

type EmailsPageProps = {
  isMinimized?: boolean;
  passedContactId?: string;
};

const EmailsPage = ({
  isMinimized,
  passedContactId,
}: EmailsPageProps) => {
  const [connected, setConnected] = useState<boolean | null>(null);
  const [emails, setEmails] = useState<EmailData[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<EmailData | null>(null);
  const [folder, setFolder] = useState<Folder>("inbox");
  const [syncing, setSyncing] = useState(false);
  const [search, setSearch] = useState("");
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const didFirstSync = useRef(false);
  const [viewAll, setViewAll] = useState(false);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(
    passedContactId || null,
  );
  const [linkedContacts, setLinkedContacts] = useState<ContactOption[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [showDropDown, setShowDropDown] = useState(false);

  const { openModal } = useModal();

  function handleOpenEmailCompose() {
    let sendToEmail = linkedContacts.find(
      (c) => c.id === selectedContactId,
    )?.email;
    let sendToName = linkedContacts.find(
      (c) => c.id === selectedContactId,
    )?.name;
    openModal("compose-email", {
      contactId: selectedContactId,
      sendToEmail,
      sendToName,
    });
  }

  const loadEmails = useCallback(
    async (
      currentFolder: Folder,
      searchQuery: string,
      allEmails: boolean,
      contactId: string | null,
      currentPage: number,
    ) => {
      const result = await fetchEmails({
        folder: allEmails ? "all" : currentFolder,
        search: searchQuery || undefined,
        contactId: contactId || undefined,
        linkedOnly: !allEmails,
        limit: PAGE_SIZE,
        offset: (currentPage - 1) * PAGE_SIZE,
      });
      setEmails(result.emails);
      setTotal(result.total);
    },
    [],
  );

  useEffect(() => {
    window.document.title = `Emails - ${folder} | OpenCRM`;
  }, [folder]);
  useEffect(() => {
    passedContactId && setSelectedContactId(passedContactId);
  }, [passedContactId]);

  useEffect(() => {
    checkMailboxConnection().then(async ({ connected }) => {
      setConnected(connected);
      if (!connected) return;

      const isFirstSync = searchParams.get("firstSync") === "true";
      if (isFirstSync && !didFirstSync.current) {
        didFirstSync.current = true;
        const t = toast.loading("Performing initial sync...");
        setSyncing(true);
        // Initial sync... only last 30 days to keep it fast, then pass to the worker to continue syncing in the background (WIP)
        const result = await syncMailboxAction("google_gmail", {
          lookbackDays: 30,
        });
        setSyncing(false);
        if (result.success) {
          t.success({ title: `Synced ${result.synced} emails` });
        } else {
          t.error({ title: result.error ?? "Initial sync failed" });
        }
      }

      fetchEmailContacts().then(setLinkedContacts);
      loadEmails(folder, search, viewAll, selectedContactId, page);
    });
  }, []);

  useEffect(() => {
    if (connected) loadEmails(folder, search, viewAll, selectedContactId, page);
  }, [folder, search, connected, viewAll, selectedContactId, page]);

  const handleSync = useCallback(async () => {
    setSyncing(true);
    const t = toast.loading("Syncing mailbox...");
    const result = await syncMailboxAction();
    setSyncing(false);
    if (result.success) {
      t.success({ title: `Synced ${result.synced} emails` });
      fetchEmailContacts().then(setLinkedContacts);
      loadEmails(folder, search, viewAll, selectedContactId, page);
    } else {
      t.error({ title: result.error ?? "Sync failed" });
    }
  }, [folder, search, viewAll, selectedContactId, page, loadEmails, toast]);

  const handleEmailRead = useCallback((emailId: string, isRead: boolean) => {
    setEmails((prev) =>
      prev.map((e) => (e.id === emailId ? { ...e, isRead } : e)),
    );
  }, []);

  const handleEmailArchived = useCallback(
    (emailId: string) => {
      setEmails((prev) => prev.filter((e) => e.id !== emailId));
      if (selectedEmail?.id === emailId) setSelectedEmail(null);
    },
    [selectedEmail],
  );

  if (connected === null) return null;

  if (!connected) {
    return <ConnectMailboxPrompt />;
  }

  const tabs = FOLDERS.map((f) => ({
    id: f.id,
    label: f.label,
    icon: { regular: f.icon?.regular, filled: f.icon?.filled },
    bgActiveColor: f.bgActiveColor,
    color: f.color,
  }));

  return (
    <div className={Styles.page}>
      {!isMinimized && (
        <header className="global_header">
          <div className="g_header_section_name">
            <span>
              <MailRegular fontSize={18} />
            </span>
            <h2>Emails</h2>
          </div>
        </header>
      )}
      <TabsControlHeader
        tabs={tabs}
        onTabBtnClick={(id) => {
          setFolder(id as Folder);
          setSelectedEmail(null);
          setPage(1);
        }}
        mainButton={{
          text: "Compose",
          icon: <ComposeFilled color="var(--bg-00)" />,
          onClick: handleOpenEmailCompose,
        }}
        showMainBtn={true}
        iconButtons={[
          {
            id: "sync",
            icon: <ArrowSyncRegular />,
            tooltip: syncing ? "Syncing..." : "Sync",
            onClick: handleSync,
            disabled: syncing,
          },
        ]}
        searchPlaceholder="Search emails..."
        searchValue={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
      />

      <div className={Styles.body}>
        <div className={Styles.listColumn}>
          {!isMinimized && (
            <div className={Styles.header}>
              <input type="search" placeholder="Search your emails..." />
              <button
                onClick={() => {
                  setShowDropDown(true);
                }}
              >
                <FilterRegular fontSize={20} />
              </button>
              <FilterEmailsDropdown
                showDropDown={showDropDown}
                setShowDropDown={setShowDropDown}
                setViewAll={setViewAll}
                viewAll={viewAll}
                setPage={setPage}
                linkedContacts={linkedContacts}
                selectedContactId={selectedContactId}
                setSelectedContactId={setSelectedContactId}
              />
            </div>
          )}
          {emails.length === 0 && (
            <div className={Styles.emptyState}>
              <MailRegular fontSize={54} color="var(--bg-04)" />
              <p>Nothing in this folder</p>
              <i>
                {passedContactId
                  ? "No emails for this Record"
                  : "Try changing your search or filter settings."}
              </i>
            </div>
          )}
          {emails.length > 0 && (
            <EmailList
              emails={emails}
              selectedId={selectedEmail?.id ?? null}
              onSelect={setSelectedEmail}
            />
          )}
          {total > PAGE_SIZE && (
            <div className={Styles.pagination}>
              <button
                className={Styles.pageBtn}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeftRegular />
              </button>
              <span className={Styles.pageInfo}>
                {page} / {Math.ceil(total / PAGE_SIZE)}
              </span>
              <button
                className={Styles.pageBtn}
                onClick={() =>
                  setPage((p) => Math.min(Math.ceil(total / PAGE_SIZE), p + 1))
                }
                disabled={page >= Math.ceil(total / PAGE_SIZE)}
              >
                <ChevronRightRegular />
              </button>
            </div>
          )}
        </div>

        {selectedEmail && (
          <EmailDetailPanel
            email={selectedEmail}
            onRead={handleEmailRead}
            onArchive={handleEmailArchived}
            onClose={() => setSelectedEmail(null)}
          />
        )}
      </div>
    </div>
  );
};

export default EmailsPage;
