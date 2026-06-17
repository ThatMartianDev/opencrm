// Shared Email Types

export type MailProvider = "google_gmail";

export type EmailAddress = {
  name?: string;
  email: string;
};

export type RawEmail = {
  providerMessageId: string;
  providerThreadId: string;
  subject: string | null;
  snippet: string | null;
  body: string | null;
  from: string;
  to: string[];
  cc: string[];
  bcc: string[];
  replyTo: string | null;
  isRead: boolean;
  isStarred: boolean;
  isSent: boolean;
  isDraft: boolean;
  isArchived: boolean;
  labelIds: string[];
  hasAttachments: boolean;
  sentAt: Date;
};

export type SyncResult = {
  synced: number;
  errors: number;
  /** New sync cursor to persist (historyId for Gmail, deltaToken for Outlook) */
  nextSyncToken: string | null;
};

export type SendEmailInput = {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
  replyToMessageId?: string; // for threading, providerMessageId of the email being replied to
  replyToThreadId?: string;  // providerThreadId to attach to
};

// Provider Interface
/**
 * Every mail provider (Gmail, Outlook, ...) must implement this interface.
 * The service layer only talks to this interface, it never knows which
 * provider it's dealing with.
 */
export interface IMailProvider {
  readonly providerKey: MailProvider;

  /**
   * Fetch a page of raw emails starting from the given sync cursor.
   * Pass null for a full sync (first connect or forced resync).
   * Returns the emails fetched and the next cursor to persist.
   */
  fetchEmails(
    accessToken: string,
    syncCursor: string | null,
    options?: { maxResults?: number; lookbackDays?: number }
  ): Promise<{ emails: RawEmail[]; nextSyncToken: string | null; deletedMessageIds?: string[] }>;

  /**
   * Fetch all messages belonging to a thread.
   */
  fetchThread(
    accessToken: string,
    threadId: string
  ): Promise<RawEmail[]>;

  /**
   * Send an email. Returns the provider message ID of the sent message.
   */
  sendEmail(
    accessToken: string,
    input: SendEmailInput,
    senderEmail: string,
    senderName: string | null
  ): Promise<string>;

  /**
   * Mark a message as read / unread on the provider.
   */
  markRead(accessToken: string, messageId: string, isRead: boolean): Promise<void>;

  /**
   * Archive a message (remove from inbox without deleting).
   */
  archive(accessToken: string, messageId: string): Promise<void>;

  /**
   * Permanently trash a message.
   */
  trash(accessToken: string, messageId: string): Promise<void>;

  /**
   * Get the authenticated user's email address (needed at connect time).
   */
  getAccountEmail(accessToken: string): Promise<string>;
}
