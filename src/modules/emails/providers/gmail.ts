import type { IMailProvider, RawEmail, SendEmailInput } from "./types";

const GMAIL_API = "https://gmail.googleapis.com/gmail/v1/users/me";

// MIME helpers
function decodeBase64Url(data: string): string {
  // Gmail uses URL-safe base64; Node Buffer handles it fine
  return Buffer.from(data.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf-8");
}

type GmailMessagePart = {
  mimeType?: string;
  body?: { data?: string; size?: number };
  parts?: GmailMessagePart[];
  headers?: Array<{ name: string; value: string }>;
  filename?: string;
};

function extractBody(part: GmailMessagePart): { html: string | null; plain: string | null } {
  let html: string | null = null;
  let plain: string | null = null;

  function walk(p: GmailMessagePart) {
    if (p.mimeType === "text/html" && p.body?.data) {
      html = html ?? decodeBase64Url(p.body.data);
    } else if (p.mimeType === "text/plain" && p.body?.data) {
      plain = plain ?? decodeBase64Url(p.body.data);
    } else if (p.parts) {
      for (const child of p.parts) walk(child);
    }
  }

  walk(part);
  return { html, plain };
}

function hasAttachments(part: GmailMessagePart): boolean {
  if (part.filename && part.filename.length > 0 && part.body?.size && part.body.size > 0) {
    return true;
  }
  return part.parts?.some(hasAttachments) ?? false;
}

// Header helpers
function getHeader(headers: Array<{ name: string; value: string }>, name: string): string {
  return headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? "";
}

function parseAddressList(raw: string): string[] {
  if (!raw.trim()) return [];
  // Split on commas that are NOT inside quotes, keep entries as-is
  return raw
    .split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/)
    .map((s) => s.trim())
    .filter(Boolean);
}

// Message parser
type GmailMessage = {
  id: string;
  threadId: string;
  labelIds?: string[];
  snippet?: string;
  payload?: GmailMessagePart;
  internalDate?: string;
};

function parseGmailMessage(msg: GmailMessage): RawEmail {
  const headers = msg.payload?.headers ?? [];
  const labelIds = msg.labelIds ?? [];

  const { html, plain } = msg.payload ? extractBody(msg.payload) : { html: null, plain: null };

  const sentAtMs = msg.internalDate ? parseInt(msg.internalDate, 10) : Date.now();

  return {
    providerMessageId: msg.id,
    providerThreadId: msg.threadId,
    subject: getHeader(headers, "subject") || null,
    snippet: msg.snippet ?? null,
    body: html ?? plain,
    from: getHeader(headers, "from"),
    to: parseAddressList(getHeader(headers, "to")),
    cc: parseAddressList(getHeader(headers, "cc")),
    bcc: parseAddressList(getHeader(headers, "bcc")),
    replyTo: getHeader(headers, "reply-to") || null,
    isRead: !labelIds.includes("UNREAD"),
    isStarred: labelIds.includes("STARRED"),
    isSent: labelIds.includes("SENT"),
    isDraft: labelIds.includes("DRAFT"),
    isArchived: !labelIds.includes("INBOX") && !labelIds.includes("SENT") && !labelIds.includes("DRAFT"),
    labelIds,
    hasAttachments: msg.payload ? hasAttachments(msg.payload) : false,
    sentAt: new Date(sentAtMs),
  };
}

// MIME builder for sending
function buildMimeMessage(
  input: SendEmailInput,
  senderEmail: string,
  senderName: string | null,
  threadId?: string
): string {
  const boundary = `----=_Part_${Math.random().toString(36).slice(2)}`;

  const headers: string[] = [
    `From: ${senderName ? `${senderName} <${senderEmail}>` : senderEmail}`,
    `To: ${input.to.join(", ")}`,
    ...(input.cc?.length ? [`Cc: ${input.cc.join(", ")}`] : []),
    ...(input.bcc?.length ? [`Bcc: ${input.bcc.join(", ")}`] : []),
    `Subject: ${input.subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    ...(input.replyToMessageId ? [`In-Reply-To: <${input.replyToMessageId}>`] : []),
    ...(input.replyToMessageId ? [`References: <${input.replyToMessageId}>`] : []),
    ...(threadId ? [`X-Thread-Id: ${threadId}`] : []),
  ];

  // Plain text fallback — strip HTML tags
  const plainText = input.body.replace(/<[^>]+>/g, "").trim();

  const mime = [
    headers.join("\r\n"),
    "",
    `--${boundary}`,
    `Content-Type: text/plain; charset="UTF-8"`,
    `Content-Transfer-Encoding: quoted-printable`,
    "",
    plainText,
    "",
    `--${boundary}`,
    `Content-Type: text/html; charset="UTF-8"`,
    `Content-Transfer-Encoding: quoted-printable`,
    "",
    input.body,
    "",
    `--${boundary}--`,
  ].join("\r\n");

  return Buffer.from(mime).toString("base64url");
}

// GmailProvider
export class GmailProvider implements IMailProvider {
  readonly providerKey = "google_gmail" as const;

  // Helper for making authenticated API requests and handling errors
  private async request<T>(
    accessToken: string,
    path: string,
    options?: RequestInit
  ): Promise<T> {
    const response = await fetch(`${GMAIL_API}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Gmail API error ${response.status}: ${error}`);
    }

    return response.json() as Promise<T>;
  }

  async getAccountEmail(accessToken: string): Promise<string> {
    const profile = await this.request<{ emailAddress: string }>(accessToken, "/profile");
    return profile.emailAddress;
  }

  async fetchEmails(
    accessToken: string,
    syncCursor: string | null,
    options?: { maxResults?: number; lookbackDays?: number }
  ): Promise<{ emails: RawEmail[]; nextSyncToken: string | null; deletedMessageIds?: string[] }> {
    const maxResults = options?.maxResults ?? 100;

    // If a sync cursor is provided, perform incremental sync starting from it (historyId); otherwise, do a full sync
    if (syncCursor) {
      return this.fetchEmailsIncremental(accessToken, syncCursor, maxResults);
    }
    return this.fetchEmailsFull(accessToken, maxResults, options?.lookbackDays ?? 30);
  }

  private async fetchEmailsFull(
    accessToken: string,
    maxResults: number,
    lookbackDays: number
  ): Promise<{ emails: RawEmail[]; nextSyncToken: string | null; deletedMessageIds?: string[] }> {
    type ListResponse = { messages?: Array<{ id: string }>; nextPageToken?: string; resultSizeEstimate?: number };
    type ProfileResponse = { historyId: string };

    const messageIds: string[] = [];
    let pageToken: string | undefined;

    const after = Math.floor((Date.now() - lookbackDays * 24 * 60 * 60 * 1000) / 1000);

    do {
      const params = new URLSearchParams({
        maxResults: String(maxResults),
        q: `after:${after}`,
        ...(pageToken ? { pageToken } : {}),
      });

      const list = await this.request<ListResponse>(accessToken, `/messages?${params}`);
      for (const m of list.messages ?? []) messageIds.push(m.id);
      pageToken = list.nextPageToken;
    } while (pageToken);

    // Fetch full message details in parallel (batched to avoid rate limits)
    const emails = await this.batchFetchMessages(accessToken, messageIds);

    // Get current historyId for future incremental syncs
    const profile = await this.request<ProfileResponse>(accessToken, "/profile");

    return { emails, nextSyncToken: profile.historyId, deletedMessageIds: [] };
  }

  private async fetchEmailsIncremental(
    accessToken: string,
    historyId: string,
    maxResults: number
  ): Promise<{ emails: RawEmail[]; nextSyncToken: string | null; deletedMessageIds?: string[] }> {
    type HistoryRecord = {
      messagesAdded?: Array<{ message: { id: string; threadId: string; labelIds?: string[] } }>;
      messagesDeleted?: Array<{ message: { id: string } }>;
      labelsAdded?: Array<{ message: { id: string; labelIds?: string[] } }>;
      labelsRemoved?: Array<{ message: { id: string; labelIds?: string[] } }>;
    };
    type HistoryResponse = {
      history?: HistoryRecord[];
      nextPageToken?: string;
      historyId?: string;
    };

    const allHistory: HistoryRecord[] = [];
    let pageToken: string | undefined;
    let nextHistoryId: string | null = null;

    try {
      do {
        const params = new URLSearchParams({
          startHistoryId: historyId,
          maxResults: String(maxResults),
          ...(pageToken ? { pageToken } : {}),
        });
        // historyTypes must be repeated params, not comma-separated
        for (const t of ["messageAdded", "messageDeleted", "labelAdded", "labelRemoved"]) {
          params.append("historyTypes", t);
        }

        const history = await this.request<HistoryResponse>(accessToken, `/history?${params}`);
        allHistory.push(...(history.history ?? []));
        nextHistoryId = history.historyId ?? null;
        pageToken = history.nextPageToken;
      } while (pageToken);
    } catch (err) {
      // 404 means historyId is too old — signal full sync needed
      if (err instanceof Error && err.message.includes("404")) {
        throw new Error("GMAIL_HISTORY_EXPIRED");
      }
      throw err;
    }

    // Collect message IDs changed since last history cursor.
    // Fetching all changed messages keeps local flags (read/archive/etc.) in sync.
    const changedMessageIds = new Set<string>();
    const deletedMessageIds = new Set<string>();
    for (const record of allHistory) {
      for (const added of record.messagesAdded ?? []) {
        changedMessageIds.add(added.message.id);
      }
      for (const labeled of record.labelsAdded ?? []) {
        changedMessageIds.add(labeled.message.id);
      }
      for (const unlabeled of record.labelsRemoved ?? []) {
        changedMessageIds.add(unlabeled.message.id);
      }
      for (const deleted of record.messagesDeleted ?? []) {
        deletedMessageIds.add(deleted.message.id);
        changedMessageIds.delete(deleted.message.id);
      }
    }

    const emails = await this.batchFetchMessages(accessToken, [...changedMessageIds]);

    return { emails, nextSyncToken: nextHistoryId, deletedMessageIds: [...deletedMessageIds] };
  }

  private async batchFetchMessages(accessToken: string, messageIds: string[]): Promise<RawEmail[]> {
    const BATCH_SIZE = 20;
    const emails: RawEmail[] = [];

    for (let i = 0; i < messageIds.length; i += BATCH_SIZE) {
      const batch = messageIds.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map((id) =>
          this.request<GmailMessage>(accessToken, `/messages/${id}?format=full`)
        )
      );

      for (const result of results) {
        if (result.status === "fulfilled") {
          emails.push(parseGmailMessage(result.value));
        }
      }
    }

    return emails;
  }

  async fetchThread(accessToken: string, threadId: string): Promise<RawEmail[]> {
    type ThreadResponse = { messages: GmailMessage[] };
    const thread = await this.request<ThreadResponse>(
      accessToken,
      `/threads/${threadId}?format=full`
    );
    return (thread.messages ?? []).map(parseGmailMessage);
  }

  async sendEmail(
    accessToken: string,
    input: SendEmailInput,
    senderEmail: string,
    senderName: string | null
  ): Promise<string> {
    const raw = buildMimeMessage(input, senderEmail, senderName, input.replyToThreadId);

    const body: Record<string, unknown> = { raw };
    if (input.replyToThreadId) {
      body.threadId = input.replyToThreadId;
    }

    const sent = await this.request<{ id: string }>(accessToken, "/messages/send", {
      method: "POST",
      body: JSON.stringify(body),
    });

    return sent.id;
  }

  async markRead(accessToken: string, messageId: string, isRead: boolean): Promise<void> {
    await this.request(accessToken, `/messages/${messageId}/modify`, {
      method: "POST",
      body: JSON.stringify({
        addLabelIds: isRead ? [] : ["UNREAD"],
        removeLabelIds: isRead ? ["UNREAD"] : [],
      }),
    });
  }

  async archive(accessToken: string, messageId: string): Promise<void> {
    await this.request(accessToken, `/messages/${messageId}/modify`, {
      method: "POST",
      body: JSON.stringify({ removeLabelIds: ["INBOX"] }),
    });
  }

  async trash(accessToken: string, messageId: string): Promise<void> {
    await this.request(accessToken, `/messages/${messageId}/trash`, {
      method: "POST",
      body: JSON.stringify({}),
    });
  }
}
