"use client";

import type { CalendarEventData } from "../../CalendarPage";
import { format } from "date-fns";
import Styles from "./EventCard.module.css";

type EventCardProps = {
  event: CalendarEventData;
  onClick: () => void;
};

const EventCard = ({ event, onClick }: EventCardProps) => {
  const hasLink = !!(event.dealId || event.contactId || event.companyId);

  const colorClass = event.dealId
    ? Styles.deal
    : event.contactId
    ? Styles.contact
    : event.companyId
    ? Styles.company
    : Styles.default;

  return (
    <button className={`${Styles.card} ${colorClass}`} onClick={onClick}>
      <span className={Styles.time}>
        {event.allDay ? "All day" : format(new Date(event.startTime), "h:mm a")}
      </span>
      <span className={Styles.title}>{event.title}</span>
      {hasLink && <span className={Styles.linked}>●</span>}
    </button>
  );
};

export default EventCard;
