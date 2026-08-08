import { prisma } from "@/lib/db/client";
import { refreshAccessToken } from "@/lib/auth/google";
import { assertCrmLinksBelongToOrganization } from "@/lib/dal/crm-links";
import { getProvider } from "./providers";
import type { SendEmailInput } from "./providers";

// Token helpers
function isInvalidGrantError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message.toLowerCase();
  return msg.includes("invalid_grant") || msg.includes("token has been expired or revoked");
}

async function getValidAccessToken(
  userId: string,
  organizationId: string,
  provider: string
): Promise<{ accessToken: string; accountId: string; accountEmail: string, senderName: string | null } | null> {
  const account = await prisma.account.findFirst({
    where: { userId, organizationId, provider },
    include: { 
      user: { select: { name: true } }
    }
  });

  if (!account || !account.refreshToken) return null;

  const isExpired =
    !account.tokenExpiresAt ||
    account.tokenExpiresAt < new Date(Date.now() + 5 * 60 * 1000);

  if (isExpired) {
    try {
      const tokens = await refreshAccessToken(account.refreshToken);
      const newExpiresAt = new Date(Date.now() + tokens.expires_in * 1000);

      await prisma.account.update({
        where: { id: account.id },
        include: { user: { select: { name: true } } },
        data: {
          accessToken: tokens.access_token,
          tokenExpiresAt: newExpiresAt,
          ...(tokens.refresh_token ? { refreshToken: tokens.refresh_token } : {}),
        },
      });

      return {
        accessToken: tokens.access_token,
        accountId: account.id,
        accountEmail: account.providerAccountId,
        senderName: account.user.name,
      };
    } catch (error) {
      if (isInvalidGrantError(error)) {
        await prisma.account.update({
          where: { id: account.id },
          data: {
            accessToken: null,
            refreshToken: null,
            tokenExpiresAt: null,
            syncToken: null,
          },
        });
        throw new Error(
          "Mailbox authorization expired. Please reconnect your email account."
        );
      }
      throw error;
    }
  }

  if (!account.accessToken) return null;

  return {
    accessToken: account.accessToken,
    accountId: account.id,
    accountEmail: account.providerAccountId,
    senderName: account.user.name,
  };
}

// Connection status
export async function getConnectedMailboxes(
  userId: string,
  organizationId: string,
): Promise<Array<{ provider: string; email: string; connectedAt: Date }>> {
  const accounts = await prisma.account.findMany({
    where: {
      userId,
      organizationId,
      provider: { in: ["google_gmail", "microsoft_outlook"] },
      refreshToken: { not: null },
    },
    select: { provider: true, providerAccountId: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  return accounts.map((a) => ({
    provider: a.provider,
    email: a.providerAccountId,
    connectedAt: a.createdAt,
  }));
}

export async function isMailboxConnected(
  userId: string,
  organizationId: string,
  provider = "google_gmail"
): Promise<boolean> {
  const account = await prisma.account.findFirst({
    where: { userId, organizationId, provider, refreshToken: { not: null } },
    select: { id: true },
  });
  return !!account;
}

// Disconnect
export async function disconnectMailbox(
  userId: string,
  organizationId: string,
  provider = "google_gmail"
): Promise<void> {
  const account = await prisma.account.findFirst({
    where: { userId, organizationId, provider },
  });

  if (!account) return;

  // Revoke token at Google
  if (provider === "google_gmail" && account.refreshToken) {
    const { revokeGoogleToken } = await import("@/lib/auth/google");
    await revokeGoogleToken(account.refreshToken).catch(() => {
      // best effort
    });
  }

  // Delete locally cached emails for this user/provider in the org
  await prisma.email.deleteMany({
    where: { userId, organizationId, provider },
  });

  await prisma.account.delete({ where: { id: account.id } });
}

// Sync
export async function syncMailbox(
  userId: string,
  organizationId: string,
  provider = "google_gmail",
  options?: { forceFullSync?: boolean; lookbackDays?: number }
): Promise<{ synced: number; errors: number }> {
  const tokenResult = await getValidAccessToken(userId, organizationId, provider);
  if (!tokenResult) throw new Error("Mailbox not connected");

  const { accessToken, accountId } = tokenResult;

  const account = await prisma.account.findUnique({ where: { id: accountId } });
  const syncCursor = options?.forceFullSync ? null : (account?.syncToken ?? null);

  const mailProvider = getProvider(provider);
  let fetchResult: Awaited<ReturnType<typeof mailProvider.fetchEmails>>;

  try {
    fetchResult = await mailProvider.fetchEmails(accessToken, syncCursor, {
      lookbackDays: options?.lookbackDays,
    });
  } catch (err) {
    if (err instanceof Error && err.message === "GMAIL_HISTORY_EXPIRED") {
      // historyId too old — force full sync
      fetchResult = await mailProvider.fetchEmails(accessToken, null, {
        lookbackDays: options?.lookbackDays,
      });
    } else {
      throw err;
    }
  }

  const { emails, nextSyncToken, deletedMessageIds = [] } = fetchResult;

  let synced = 0;
  let errors = 0;

  for (const email of emails) {
    try {
      await prisma.email.upsert({
        where: {
          userId_organizationId_provider_providerMessageId: {
            userId,
            organizationId,
            provider,
            providerMessageId: email.providerMessageId,
          },
        },
        update: {
          isRead: email.isRead,
          isStarred: email.isStarred,
          isArchived: email.isArchived,
          labelIds: email.labelIds,
          snippet: email.snippet,
          syncedAt: new Date(),
        },
        create: {
          provider,
          providerMessageId: email.providerMessageId,
          providerThreadId: email.providerThreadId,
          userId,
          organizationId,
          subject: email.subject,
          snippet: email.snippet,
          body: email.body,
          from: email.from,
          to: email.to,
          cc: email.cc,
          bcc: email.bcc,
          replyTo: email.replyTo,
          isRead: email.isRead,
          isStarred: email.isStarred,
          isSent: email.isSent,
          isDraft: email.isDraft,
          isArchived: email.isArchived,
          labelIds: email.labelIds,
          hasAttachments: email.hasAttachments,
          sentAt: email.sentAt,
        },
      });
      synced++;
    } catch (err) {
      console.error(`Failed to upsert email ${email.providerMessageId}:`, err);
      errors++;
    }
  }

  if (deletedMessageIds.length > 0) {
    try {
      await prisma.email.deleteMany({
        where: {
          userId,
          organizationId,
          provider,
          providerMessageId: { in: deletedMessageIds },
        },
      });
    } catch (err) {
      console.error("Failed to delete provider-removed emails:", err);
      errors++;
    }
  }

  if (nextSyncToken) {
    await prisma.account.update({
      where: { id: accountId },
      data: { syncToken: nextSyncToken },
    });
  }

  // Auto-link emails to CRM contacts by matching from/to addresses
  await autoLinkEmails(userId, organizationId);

  return { synced, errors };
}

// Auto-link
async function autoLinkEmails(userId: string, organizationId: string): Promise<void> {
  const unlinked = await prisma.email.findMany({
    where: { userId, organizationId, contactId: null },
    select: { id: true, from: true, to: true },
  });

  if (unlinked.length === 0) return;

  const contacts = await prisma.contact.findMany({
    where: { organizationId, email: { not: null } },
    select: { id: true, email: true },
  });

  const emailToContactId = new Map<string, string>();
  for (const c of contacts) {
    if (c.email) emailToContactId.set(c.email.toLowerCase(), c.id);
  }

  for (const email of unlinked) {
    // Extract plain email address from "Name <email>" format
    const extractEmail = (s: string) => {
      const match = s.match(/<([^>]+)>/);
      return (match ? match[1] : s).toLowerCase().trim();
    };

    const allAddresses = [email.from, ...email.to].map(extractEmail);
    const contactId = allAddresses
      .map((addr) => emailToContactId.get(addr))
      .find(Boolean);

    if (contactId) {
      await prisma.email.update({
        where: { id: email.id },
        data: { contactId },
      });
    }
  }
}

// Querying
type GetEmailsOptions = {
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
};

export async function getEmails(
  userId: string,
  organizationId: string,
  options: GetEmailsOptions = {}
): Promise<{ emails: Awaited<ReturnType<typeof prisma.email.findMany>>; total: number }> {
  const { folder = "inbox", limit = 10, offset = 0, linkedOnly = true } = options;

  const where = {
    userId,
    organizationId,
    ...(options.provider ? { provider: options.provider } : {}),
    ...(folder === "inbox"
      ? { isArchived: false, isSent: false, isDraft: false }
      : folder === "sent"
      ? { isSent: true }
      : folder === "drafts"
      ? { isDraft: true }
      : {}),
    ...(linkedOnly ? { contactId: { not: null } } : {}),
    ...(options.isRead !== undefined ? { isRead: options.isRead } : {}),
    ...(options.dealId ? { dealId: options.dealId } : {}),
    ...(options.contactId ? { contactId: options.contactId } : {}),
    ...(options.companyId ? { companyId: options.companyId } : {}),
    ...(options.search
      ? {
          OR: [
            { subject: { contains: options.search, mode: "insensitive" as const } },
            { from: { contains: options.search, mode: "insensitive" as const } },
            { snippet: { contains: options.search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [emails, total] = await prisma.$transaction([
    prisma.email.findMany({
      where,
      orderBy: { sentAt: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.email.count({ where }),
  ]);

  return { emails, total };
}

export async function getEmailThread(
  userId: string,
  organizationId: string,
  providerThreadId: string,
  provider = "google_gmail"
) {
  // check if we have the full thread in the DB
  const cached = await prisma.email.findMany({
    where: { userId, organizationId, provider, providerThreadId },
    orderBy: { sentAt: "asc" },
  });

  if (cached.length > 0) return cached;

  // otherwise fetch live from provider
  const tokenResult = await getValidAccessToken(userId, organizationId, provider);
  if (!tokenResult) throw new Error("Mailbox not connected");

  const mailProvider = getProvider(provider);
  return mailProvider.fetchThread(tokenResult.accessToken, providerThreadId);
}

// Send
export async function sendEmail(
  userId: string,
  organizationId: string,
  input: SendEmailInput,
  provider = "google_gmail"
): Promise<string> {
  const tokenResult = await getValidAccessToken(userId, organizationId, provider);
  if (!tokenResult) throw new Error("Mailbox not connected");

  const mailProvider = getProvider(provider);
  const messageId = await mailProvider.sendEmail(
    tokenResult.accessToken,
    input,
    tokenResult.accountEmail,
    tokenResult.senderName
  );

  // sync the sent message back into the DB immediately
  const sentEmails = await mailProvider.fetchEmails(tokenResult.accessToken, null, {
    maxResults: 5,
  });
  const sentMsg = sentEmails.emails.find((e) => e.providerMessageId === messageId);
  if (sentMsg) {
    await prisma.email.upsert({
      where: {
        userId_organizationId_provider_providerMessageId: {
          userId,
          organizationId,
          provider,
          providerMessageId: sentMsg.providerMessageId,
        },
      },
      update: {},
      create: {
        provider,
        providerMessageId: sentMsg.providerMessageId,
        providerThreadId: sentMsg.providerThreadId,
        userId,
        organizationId,
        subject: sentMsg.subject,
        snippet: sentMsg.snippet,
        body: sentMsg.body,
        from: sentMsg.from,
        to: sentMsg.to,
        cc: sentMsg.cc,
        bcc: sentMsg.bcc,
        replyTo: sentMsg.replyTo,
        isRead: true,
        isSent: true,
        isDraft: false,
        isArchived: false,
        isStarred: false,
        labelIds: sentMsg.labelIds,
        hasAttachments: sentMsg.hasAttachments,
        sentAt: sentMsg.sentAt,
      },
    });
    // Auto-link the sent email to CRM contacts
    await autoLinkEmails(userId, organizationId);
  }

  return messageId;
}

// Actions on individual messages
export async function markEmailRead(
  userId: string,
  organizationId: string,
  emailId: string,
  isRead: boolean
): Promise<void> {
  const email = await prisma.email.findFirst({
    where: { id: emailId, userId, organizationId },
  });
  if (!email) return;

  const tokenResult = await getValidAccessToken(userId, organizationId, email.provider);
  if (!tokenResult) return;

  const mailProvider = getProvider(email.provider);
  await mailProvider.markRead(tokenResult.accessToken, email.providerMessageId, isRead);

  await prisma.email.update({
    where: { id: emailId, userId, organizationId },
    data: { isRead },
  });
}

export async function archiveEmail(
  userId: string,
  organizationId: string,
  emailId: string,
): Promise<void> {
  const email = await prisma.email.findFirst({
    where: { id: emailId, userId, organizationId },
  });
  if (!email) return;

  const tokenResult = await getValidAccessToken(userId, organizationId, email.provider);
  if (!tokenResult) return;

  const mailProvider = getProvider(email.provider);
  await mailProvider.archive(tokenResult.accessToken, email.providerMessageId);

  await prisma.email.update({
    where: { id: emailId, userId, organizationId },
    data: { isArchived: true },
  });
}

export async function trashEmail(
  userId: string,
  organizationId: string,
  emailId: string,
): Promise<void> {
  const email = await prisma.email.findFirst({
    where: { id: emailId, userId, organizationId },
  });
  if (!email) return;

  const tokenResult = await getValidAccessToken(userId, organizationId, email.provider);
  if (!tokenResult) return;

  const mailProvider = getProvider(email.provider);
  await mailProvider.trash(tokenResult.accessToken, email.providerMessageId);

  await prisma.email.delete({ where: { id: emailId, userId, organizationId } });
}

// CRM linking
export async function getEmailContacts(
  userId: string,
  organizationId: string
): Promise<Array<{ id: string; name: string; email: string | null }>> {
  const rows = await prisma.email.findMany({
    where: { userId, organizationId, contactId: { not: null } },
    select: { contactId: true },
    distinct: ["contactId"],
  });

  const contactIds = rows.map((r) => r.contactId).filter(Boolean) as string[];
  if (contactIds.length === 0) return [];

  return prisma.contact.findMany({
    where: { id: { in: contactIds }, organizationId, deletedAt: null },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });
}

export async function linkEmail(
  emailId: string,
  userId: string,
  organizationId: string,
  link: { dealId?: string; contactId?: string; companyId?: string }
): Promise<void> {
  await assertCrmLinksBelongToOrganization(organizationId, link);

  await prisma.email.updateMany({
    where: { id: emailId, userId, organizationId },
    data: link,
  });
}
