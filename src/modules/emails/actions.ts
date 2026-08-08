"use server";

import { getSessionClaims } from "@/lib/auth/session";
import {
  isMailboxConnected,
  getConnectedMailboxes,
  syncMailbox,
  getEmails,
  getEmailThread,
  getEmailContacts,
  sendEmail,
  markEmailRead,
  archiveEmail,
  trashEmail,
  linkEmail,
  disconnectMailbox,
} from "./service";
import type { SendEmailInput } from "./providers";

import z from "zod";

export async function checkMailboxConnection(provider = "google_gmail") {
  const session = await getSessionClaims();
  const connected = await isMailboxConnected(
    session.userId,
    session.organizationId,
    provider,
  );
  return { connected };
}

export async function fetchConnectedMailboxes() {
  const session = await getSessionClaims();
  return getConnectedMailboxes(session.userId, session.organizationId);
}

export async function syncMailboxAction(
  provider = "google_gmail",
  options?: { lookbackDays?: number }
) {
  const session = await getSessionClaims();
  try {
    const result = await syncMailbox(session.userId, session.organizationId, provider, options);
    return { success: true, ...result };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Sync failed";
    return { success: false, error: message, synced: 0, errors: 0 };
  }
}

export async function fetchEmails(
  options: {
    folder?: "inbox" | "sent" | "drafts" | "all";
    isRead?: boolean;
    provider?: string;
    dealId?: string;
    contactId?: string;
    companyId?: string;
    search?: string;
    linkedOnly?: boolean;
    limit?: number;
    offset?: number;
  } = {}
) {
  const session = await getSessionClaims();
  return getEmails(session.userId, session.organizationId, options);
}

export async function fetchEmailThread(
  providerThreadId: string,
  provider = "google_gmail"
) {
  const session = await getSessionClaims();
  return getEmailThread(session.userId, session.organizationId, providerThreadId, provider);
}

export async function fetchEmailContacts() {
  const session = await getSessionClaims();
  return getEmailContacts(session.userId, session.organizationId);
}

export async function sendEmailAction(
  input: SendEmailInput,
  provider = "google_gmail"
) {
  const schema = z.object({
    subject: z.string().min(1),
    body: z.string().min(1),
  });

  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Invalid email input" };
  }

  const session = await getSessionClaims();
  try {
    const messageId = await sendEmail(
      session.userId,
      session.organizationId,
      input,
      provider
    );
    return { success: true, messageId };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to send email";
    return { success: false, error: message };
  }
}

export async function markEmailReadAction(emailId: string, isRead: boolean) {
  const session = await getSessionClaims();
  try {
    await markEmailRead(session.userId, session.organizationId, emailId, isRead);
    return { success: true };
  } catch {
    return { success: false, error: "Failed to update email" };
  }
}

export async function archiveEmailAction(emailId: string) {
  const session = await getSessionClaims();
  try {
    await archiveEmail(session.userId, session.organizationId, emailId);
    return { success: true };
  } catch {
    return { success: false, error: "Failed to archive email" };
  }
}

export async function trashEmailAction(emailId: string) {
  const session = await getSessionClaims();
  try {
    await trashEmail(session.userId, session.organizationId, emailId);
    return { success: true };
  } catch {
    return { success: false, error: "Failed to trash email" };
  }
}

export async function linkEmailAction(
  emailId: string,
  link: { dealId?: string; contactId?: string; companyId?: string }
) {
  const session = await getSessionClaims();
  try {
    await linkEmail(emailId, session.userId, session.organizationId, link);
    return { success: true };
  } catch {
    return { success: false, error: "Failed to link email" };
  }
}

export async function disconnectMailboxAction(provider = "google_gmail") {
  const session = await getSessionClaims();
  try {
    await disconnectMailbox(session.userId, session.organizationId, provider);
    return { success: true };
  } catch {
    return { success: false, error: "Failed to disconnect mailbox" };
  }
}
