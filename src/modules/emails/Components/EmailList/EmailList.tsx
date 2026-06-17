"use client";

import { formatDistanceToNow } from "date-fns";
import type { EmailData } from "../../EmailsPage";
import Styles from "./EmailList.module.css";

type Props = {
  emails: EmailData[];
  selectedId: string | null;
  onSelect: (email: EmailData) => void;
};

function extractName(from: string): string {
  const match = from.match(/^([^<]+)</);
  return match ? match[1].trim() : from;
}

const EmailList = ({ emails, selectedId, onSelect }: Props) => {
  return (
    <ul className={Styles.list}>
      {emails.map((email) => (
        <li
          key={email.id}
          className={`${Styles.item} ${selectedId === email.id ? Styles.selected : ""} ${!email.isRead ? Styles.unread : ""}`}
          onClick={() => onSelect(email)}
        >
          <div className={Styles.row}>
            <span className={Styles.from}>{extractName(email.from)}</span>
            <span className={Styles.date}>
              {formatDistanceToNow(new Date(email.sentAt), { addSuffix: true })}
            </span>
          </div>
          <div className={Styles.subject}>{email.subject ?? "(no subject)"}</div>
          <div className={Styles.snippet}>{email.snippet ?? ""}</div>
        </li>
      ))}
    </ul>
  );
};

export default EmailList;
