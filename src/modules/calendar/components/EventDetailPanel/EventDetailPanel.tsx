"use client";

import { useState } from "react";
import {
  DismissRegular,
  CalendarRegular,
  LocationRegular,
  PeopleRegular,
  LinkRegular,
  OpenRegular,
  DeleteRegular,
} from "@fluentui/react-icons";
import { format } from "date-fns";
import type { CalendarEventData } from "../../CalendarPage";
import { linkEvent, unlinkEvent } from "../../actions";
import Styles from "./EventDetailPanel.module.css";

type EventDetailPanelProps = {
  event: CalendarEventData;
  onClose: () => void;
  onUpdate: () => void;
};

const EventDetailPanel = ({ event, onClose, onUpdate }: EventDetailPanelProps) => {
  const [linking, setLinking] = useState(false);
  const attendees = event.attendees as Array<{ email: string; displayName?: string; responseStatus?: string }> | null;

  const handleUnlink = async (type: "deal" | "contact" | "company") => {
    await unlinkEvent(event.id, { [type]: true });
    onUpdate();
  };

  const formatTime = () => {
    if (event.allDay) return "All day";
    const start = format(new Date(event.startTime), "MMM d, h:mm a");
    const end = format(new Date(event.endTime), "h:mm a");
    return `${start} – ${end}`;
  };

  return (
    <div className={Styles.overlay} onClick={onClose}>
      <div className={Styles.panel} onClick={(e) => e.stopPropagation()}>
        <div className={Styles.header}>
          <h3>{event.title}</h3>
          <button className={Styles.closeBtn} onClick={onClose}>
            <DismissRegular />
          </button>
        </div>

        <div className={Styles.content}>
          {/* Time */}
          <div className={Styles.row}>
            <CalendarRegular className={Styles.icon} />
            <span>{formatTime()}</span>
          </div>

          {/* Location */}
          {event.location && (
            <div className={Styles.row}>
              <LocationRegular className={Styles.icon} />
              <span>{event.location}</span>
            </div>
          )}

          {/* Description */}
          {event.description && (
            <div className={Styles.description}>
              <p>{event.description}</p>
            </div>
          )}

          {/* Attendees */}
          {attendees && attendees.length > 0 && (
            <div className={Styles.section}>
              <div className={Styles.sectionHeader}>
                <PeopleRegular className={Styles.icon} />
                <span>Attendees ({attendees.length})</span>
              </div>
              <div className={Styles.attendeeList}>
                {attendees.map((a, i) => (
                  <div key={i} className={Styles.attendee}>
                    <span className={Styles.attendeeName}>{a.displayName || a.email}</span>
                    {a.responseStatus && (
                      <span className={`${Styles.status} ${Styles[a.responseStatus] || ""}`}>
                        {a.responseStatus}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CRM Links */}
          <div className={Styles.section}>
            <div className={Styles.sectionHeader}>
              <LinkRegular className={Styles.icon} />
              <span>Linked to</span>
            </div>
            <div className={Styles.links}>
              {event.deal && (
                <div className={Styles.linkItem}>
                  <span className={`${Styles.linkBadge} ${Styles.dealBadge}`}>Deal</span>
                  <span>{event.deal.title}</span>
                  <button
                    className={Styles.unlinkBtn}
                    onClick={() => handleUnlink("deal")}
                    title="Unlink"
                  >
                    <DeleteRegular fontSize={14} />
                  </button>
                </div>
              )}
              {event.contact && (
                <div className={Styles.linkItem}>
                  <span className={`${Styles.linkBadge} ${Styles.contactBadge}`}>Contact</span>
                  <span>{event.contact.name}</span>
                  <button
                    className={Styles.unlinkBtn}
                    onClick={() => handleUnlink("contact")}
                    title="Unlink"
                  >
                    <DeleteRegular fontSize={14} />
                  </button>
                </div>
              )}
              {event.company && (
                <div className={Styles.linkItem}>
                  <span className={`${Styles.linkBadge} ${Styles.companyBadge}`}>Company</span>
                  <span>{event.company.name}</span>
                  <button
                    className={Styles.unlinkBtn}
                    onClick={() => handleUnlink("company")}
                    title="Unlink"
                  >
                    <DeleteRegular fontSize={14} />
                  </button>
                </div>
              )}
              {!event.deal && !event.contact && !event.company && (
                <p className={Styles.noLinks}>No CRM links. Events are auto-linked by attendee emails.</p>
              )}
            </div>
          </div>

          {/* Open in Google Calendar */}
          {event.htmlLink && (
            <a
              href={event.htmlLink}
              target="_blank"
              rel="noopener noreferrer"
              className={Styles.openExternal}
            >
              <OpenRegular />
              Open in Google Calendar
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

export default EventDetailPanel;
