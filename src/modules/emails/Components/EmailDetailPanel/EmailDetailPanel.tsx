"use client";

import { useEffect, useCallback, useState, useRef } from "react";
import { format } from "date-fns";
import {
  DismissRegular,
  ArrowReplyRegular,
  ArrowReplyAllRegular,
  ArrowForwardRegular,
  ChevronDownRegular,
  ChevronUpRegular,
  MoreHorizontalRegular,
  ArchiveRegular,
  DeleteRegular,
  MailReadRegular,
  MailUnreadRegular,
} from "@fluentui/react-icons";

import IframeBody from "./IframeBody";

import { useToast } from "@/components/macro/Toaster";
import AvatarFallback from "@/components/micro/AvatarFallback/AvatarFallback";
import {
  markEmailReadAction,
  archiveEmailAction,
  trashEmailAction,
} from "../../actions";
import type { EmailData } from "../../EmailsPage";
import { useModal } from "@/components/macro/ModalProvider/ModalProvider";
import DOMPurify from "dompurify";
import Styles from "./EmailDetailPanel.module.css";


type Props = {
  email: EmailData;
  onRead: (emailId: string, isRead: boolean) => void;
  onArchive: (emailId: string) => void;
  onClose: () => void;
};

function parseSender(from: string): { name: string; email: string } {
  const match = from.match(/^\s*"?([^"<]+?)"?\s*(?:<([^>]+)>)?\s*$/);

  if (!match) {
    const fallback = from.trim();
    return { name: fallback, email: fallback };
  }

  const rawName = (match[1] || "").trim();
  const rawEmail = (match[2] || "").trim();

  if (rawEmail) {
    return { name: rawName || rawEmail, email: rawEmail };
  }

  return { name: rawName, email: rawName };
}

function extractEmailAddress(value: string): string {
  const match = value.match(/<([^>]+)>/);
  if (match?.[1]) return match[1].trim();
  return value.trim();
}

function parseAddressList(values: string[]): string[] {
  return values
    .map((value) => extractEmailAddress(value))
    .map((value) => value.trim())
    .filter(Boolean);
}

function dedupeAddresses(values: string[]): string[] {
  const seen = new Set<string>();
  const output: string[] = [];

  for (const value of values) {
    const normalized = value.toLowerCase();
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    output.push(value);
  }

  return output;
}

function sanitizeEmailHtml(input: string): string {
  return DOMPurify.sanitize(input, {
    USE_PROFILES: { html: true },
    ADD_ATTR: ["style", "class", "dir", "target", "rel"],
  });
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function withPrefix(subject: string | null, prefix: "Re:" | "Fwd:"): string {
  const base = (subject || "").trim();
  if (!base) return prefix;

  if (prefix === "Re:" && /^re:/i.test(base)) return base;
  if (prefix === "Fwd:" && /^(fwd:|fw:)/i.test(base)) return base;

  return `${prefix} ${base}`;
}

const EmailDetailPanel = ({ email, onRead, onArchive, onClose }: Props) => {
  const { toast } = useToast();
  const { openModal } = useModal();
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [metaOpen, setMetaOpen] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement | null>(null);
  const sender = parseSender(email.from);
  const hasMeta =
    email.to.length > 0 ||
    email.cc.length > 0 ||
    email.bcc.length > 0 ||
    !!email.replyTo;

  useEffect(() => {
    setMetaOpen(false);
  }, [email.id]);

  useEffect(() => {
    if (!email.isRead) {
      markEmailReadAction(email.id, true).then((res) => {
        if (res.success) onRead(email.id, true);
      });
    }
  }, [email.id, email.isRead, onRead]);

  useEffect(() => {
    function onClickOutside(event: MouseEvent) {
      if (!moreMenuRef.current) return;
      if (!moreMenuRef.current.contains(event.target as Node)) {
        setMoreMenuOpen(false);
      }
    }

    if (moreMenuOpen) {
      window.addEventListener("mousedown", onClickOutside);
    }

    return () => {
      window.removeEventListener("mousedown", onClickOutside);
    };
  }, [moreMenuOpen]);

  const handleArchive = useCallback(async () => {
    const res = await archiveEmailAction(email.id);
    if (res.success) {
      onArchive(email.id);
    } else {
      toast.error({ title: "Failed to archive email" });
    }
  }, [email.id, onArchive, toast]);

  const handleTrash = useCallback(async () => {
    const res = await trashEmailAction(email.id);
    if (res.success) {
      // removes from list too
      onArchive(email.id);
    } else {
      toast.error({ title: "Failed to delete email" });
    }
  }, [email.id, onArchive, toast]);

  const handleToggleRead = useCallback(async () => {
    const newRead = !email.isRead;
    const res = await markEmailReadAction(email.id, newRead);
    if (res.success) {
      onRead(email.id, newRead);
    } else {
      toast.error({ title: "Failed to update email" });
    }
  }, [email.id, email.isRead, onRead, toast]);

  const handleReplyIntent = useCallback(
    (kind: "reply" | "reply-all" | "forward") => {
      const fromEmail = extractEmailAddress(email.from);
      const toEmails = parseAddressList(email.to);
      const ccEmails = parseAddressList(email.cc);
      const replyToAddress = email.replyTo
        ? extractEmailAddress(email.replyTo)
        : "";
      const replyTarget =
        email.isSent
          ? toEmails[0] || ccEmails[0] || fromEmail
          : replyToAddress || fromEmail;

      const originalHtml = sanitizeEmailHtml(
        email.body || `<div>${escapeHtml(email.snippet || "")}</div>`,
      );

      if (kind === "reply") {
        openModal("compose-email", {
          mode: "reply",
          initialTo: replyTarget ? [replyTarget] : [],
          initialSubject: withPrefix(email.subject, "Re:"),
          quoteHtml:
            `<div class="gmail_quote gmail_quote_container">` +
            `<div dir="ltr" class="gmail_attr">On ${format(new Date(email.sentAt), "MMM d, yyyy 'at' h:mm a")}, ${escapeHtml(email.from)} wrote:<br></div>` +
            `<blockquote class="gmail_quote" style="margin:0px 0px 0px 0.8ex;border-left:1px solid rgb(204,204,204);padding-left:1ex">${originalHtml}</blockquote>` +
            `</div>`,
          replyToMessageId: email.providerMessageId,
          replyToThreadId: email.providerThreadId,
        });
        return;
      }

      if (kind === "reply-all") {
        const recipients = dedupeAddresses(
          email.isSent
            ? [...toEmails, ...ccEmails]
            : [replyTarget, ...toEmails, ...ccEmails],
        );

        openModal("compose-email", {
          mode: "reply-all",
          initialTo: recipients,
          initialSubject: withPrefix(email.subject, "Re:"),
          quoteHtml:
            `<div class="gmail_quote gmail_quote_container">` +
            `<div dir="ltr" class="gmail_attr">On ${format(new Date(email.sentAt), "MMM d, yyyy 'at' h:mm a")}, ${escapeHtml(email.from)} wrote:<br></div>` +
            `<blockquote class="gmail_quote" style="margin:0px 0px 0px 0.8ex;border-left:1px solid rgb(204,204,204);padding-left:1ex">${originalHtml}</blockquote>` +
            `</div>`,
          replyToMessageId: email.providerMessageId,
          replyToThreadId: email.providerThreadId,
        });
        return;
      }

      openModal("compose-email", {
        mode: "forward",
        initialTo: [],
        initialSubject: withPrefix(email.subject, "Fwd:"),
        quoteHtml:
          `<div>---------- Forwarded message ---------</div>` +
          `<div><b>From:</b> ${escapeHtml(email.from)}</div>` +
          `<div><b>Date:</b> ${format(new Date(email.sentAt), "EEE, MMM d, yyyy 'at' h:mm a")}</div>` +
          `<div><b>Subject:</b> ${escapeHtml(email.subject ?? "(no subject)")}</div>` +
          `<div><b>To:</b> ${escapeHtml(email.to.join(", ") || "-")}</div>` +
          (email.cc.length
            ? `<div><b>Cc:</b> ${escapeHtml(email.cc.join(", "))}</div>`
            : "") +
          `<br>` +
          `<blockquote class="gmail_quote" style="margin:0px 0px 0px 0.8ex;border-left:1px solid rgb(204,204,204);padding-left:1ex">${originalHtml}</blockquote>`,
      });
    },
    [email, openModal],
  );

  const handleMoreMenuAction = useCallback(
    (action: "toggleRead" | "archive" | "delete" | "close") => {
      setMoreMenuOpen(false);

      if (action === "toggleRead") {
        void handleToggleRead();
        return;
      }
      if (action === "archive") {
        void handleArchive();
        return;
      }
      if (action === "delete") {
        void handleTrash();
        return;
      }

      onClose();
    },
    [handleToggleRead, handleArchive, handleTrash, onClose],
  );

  return (
    <div className={Styles.panel}>
      <div className={Styles.header}>
        <h2 className={Styles.subject}>{email.subject ?? "(no subject)"}</h2>

        <div className={Styles.headerRow}>
          <div className={Styles.contactCard}>
            <AvatarFallback
              name={sender.name}
              entityKind="customer"
              fallbackSeed={sender.email}
              size={36}
            />
            <div className={Styles.senderInfo}>
              <p className={Styles.senderName}>{sender.name}</p>
              <div className={Styles.senderEmailRow}>
                <p className={Styles.senderEmail}>{sender.email}</p>
                {hasMeta && (
                  <button
                    className={Styles.metaToggleBtn}
                    onClick={() => setMetaOpen((prev) => !prev)}
                    title={metaOpen ? "Hide details" : "Show details"}
                    aria-expanded={metaOpen}
                  >
                    {metaOpen ? <ChevronUpRegular /> : <ChevronDownRegular />}
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className={Styles.rightActions}>
            <span className={Styles.sentAt}>
              {format(new Date(email.sentAt), "h:mm a (MMM d)")}
            </span>
            <button
              className={Styles.actionBtn}
              title="Reply"
              onClick={() => handleReplyIntent("reply")}
            >
              <ArrowReplyRegular />
            </button>
            <button
              className={Styles.actionBtn}
              title="Reply all"
              onClick={() => handleReplyIntent("reply-all")}
            >
              <ArrowReplyAllRegular />
            </button>
            <button
              className={Styles.actionBtn}
              title="Forward"
              onClick={() => handleReplyIntent("forward")}
            >
              <ArrowForwardRegular />
            </button>

            <div className={Styles.moreMenuWrap} ref={moreMenuRef}>
              <button
                className={Styles.actionBtn}
                title="More options"
                onClick={() => setMoreMenuOpen((prev) => !prev)}
              >
                <MoreHorizontalRegular />
              </button>

              {moreMenuOpen && (
                <div className={Styles.moreMenu} role="menu">
                  <button
                    className={Styles.moreMenuItem}
                    onClick={() => handleMoreMenuAction("toggleRead")}
                  >
                    <span>
                      {email.isRead ? "Mark as unread" : "Mark as read"}
                    </span>
                    {email.isRead ? <MailUnreadRegular /> : <MailReadRegular />}
                  </button>
                  <button
                    className={Styles.moreMenuItem}
                    onClick={() => handleMoreMenuAction("archive")}
                  >
                    <span>Archive</span>
                    <ArchiveRegular />
                  </button>
                  <button
                    className={`${Styles.moreMenuItem} ${Styles.moreMenuDanger}`}
                    onClick={() => handleMoreMenuAction("delete")}
                  >
                    <span>Delete</span>
                    <DeleteRegular />
                  </button>
                  <button
                    className={Styles.moreMenuItem}
                    onClick={() => handleMoreMenuAction("close")}
                  >
                    <span>Close</span>
                    <DismissRegular />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {metaOpen && (
          <div className={Styles.metaPanel}>
            <div className={Styles.metaRow}>
              <span className={Styles.metaKey}>To</span>
              <span className={Styles.metaValue}>
                {email.to.join(", ") || "-"}
              </span>
            </div>
            {email.cc.length > 0 && (
              <div className={Styles.metaRow}>
                <span className={Styles.metaKey}>Cc</span>
                <span className={Styles.metaValue}>{email.cc.join(", ")}</span>
              </div>
            )}
            {email.bcc.length > 0 && (
              <div className={Styles.metaRow}>
                <span className={Styles.metaKey}>Bcc</span>
                <span className={Styles.metaValue}>{email.bcc.join(", ")}</span>
              </div>
            )}
            {email.replyTo && (
              <div className={Styles.metaRow}>
                <span className={Styles.metaKey}>Reply-To</span>
                <span className={Styles.metaValue}>{email.replyTo}</span>
              </div>
            )}
            <div className={Styles.metaRow}>
              <span className={Styles.metaKey}>Sent</span>
              <span className={Styles.metaValue}>
                {format(new Date(email.sentAt), "MMM d, yyyy 'at' h:mm a")}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Body */}
      <div className={Styles.body}>
        {email.body ? (
          <IframeBody key={email.id} html={email.body} />
        ) : (
          <p className={Styles.noBody}>{email.snippet ?? "No content."}</p>
        )}
      </div>
    </div>
  );
};

export default EmailDetailPanel;
