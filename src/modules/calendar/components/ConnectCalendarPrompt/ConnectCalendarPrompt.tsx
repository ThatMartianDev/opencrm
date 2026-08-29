"use client";

import { CalendarRegular } from "@fluentui/react-icons";
import Link from "next/link";
import { useWorkspaceData } from "@/modules/workspace/components/workspace-provider";
import Styles from "./ConnectCalendarPrompt.module.css";

const ConnectCalendarPrompt = () => {
  const { organization } = useWorkspaceData();

  return (
    <div className={Styles.container}>
      <div className={Styles.card}>
        <div className={Styles.icon}>
          <CalendarRegular fontSize={48} />
        </div>
        <h2>Connect Google Calendar</h2>
        <p>
          Link your Google Calendar to see your events, schedule meetings with contacts,
          and automatically link calendar events to deals and companies.
        </p>
        <Link href={`/app/${organization.slug}/settings/accounts?tab=calendar`} className={Styles.connectBtn}>
          Go to Settings to Connect
        </Link>
        <p className={Styles.permissions}>
          You can manage your calendar connection from Settings &rarr; Accounts &rarr; Calendar.
        </p>
      </div>
    </div>
  );
};

export default ConnectCalendarPrompt;
