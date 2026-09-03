"use client";

import { MailRegular } from "@fluentui/react-icons";
import Link from "next/link";
import { useWorkspaceData } from "@/modules/workspace/components/workspace-provider";
import Styles from "./ConnectMailboxPrompt.module.css";

const ConnectMailboxPrompt = () => {
  const { organization } = useWorkspaceData();

  return (
    <div className={Styles.container}>
      <div className={Styles.card}>
        <div className={Styles.icon}>
          <MailRegular fontSize={48} />
        </div>
        <h2>Connect your Mailbox</h2>
        <p>
          Link your Gmail account to send and receive emails directly inside OpenCRM.
          Emails are automatically linked to your contacts, deals, and companies.
        </p>
        <Link
          href={`/app/${organization.slug}/settings/accounts?tab=mailbox`}
          className={Styles.connectBtn}
        >
          Go to Settings to Connect
        </Link>
        <p className={Styles.permissions}>
          You can manage your mailbox connection from Settings &rarr; Accounts &rarr; Mailbox.
        </p>
      </div>
    </div>
  );
};

export default ConnectMailboxPrompt;
