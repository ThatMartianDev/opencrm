"use client";

import { useState, useMemo } from "react";
import {
  DismissRegular,
  CalendarRegular,
  LocationRegular,
  PeopleRegular,
  LinkRegular,
  OpenRegular,
  DeleteRegular,
  ClockRegular,
  VideoRegular,
  NoteRegular,
  CheckmarkCircleRegular,
  PeopleFilled,
  EditRegular,
  PersonAddRegular,
} from "@fluentui/react-icons";
import { format, formatDistanceToNow, differenceInMinutes, isPast } from "date-fns";
import { useModal } from "@/components/macro/ModalProvider/ModalProvider";
import { useConfirm } from "@/components/macro/ConfirmDialog";
import AvatarFallback from "@/components/micro/AvatarFallback/AvatarFallback";
import { ContactPicker, PickerContact, useContactPicker } from "@/components/macro/ContactPicker";
import type { CalendarEventData } from "../../CalendarPage";
import { unlinkEvent, linkEvent, deleteEvent } from "../../actions";
import Styles from "./EventDetailPanel.module.css";

type EventDetailPanelProps = {
  event: CalendarEventData;
  onClose: () => void;
  onUpdate: () => void;
};

const EventDetailPanel = ({ event, onClose, onUpdate }: EventDetailPanelProps) => {
  const [unlinking, setUnlinking] = useState<string | null>(null);
  const [linking, setLinking] = useState(false);
  const { openModal } = useModal();
  const confirm = useConfirm();
  const contactPicker = useContactPicker();
  const attendees = event.attendees as Array<{ email: string; displayName?: string; responseStatus?: string }> | null;

  const handleUnlink = async (type: "deal" | "contact" | "company") => {
    setUnlinking(type);
    await unlinkEvent(event.id, { [type]: true });
    setUnlinking(null);
    onUpdate();
  };

  const handleLinkContact = async (contact: PickerContact) => {
    contactPicker.close();
    setLinking(true);
    await linkEvent(event.id, { contactId: contact.id });
    setLinking(false);
    onUpdate();
  };

  const handleDelete = async () => {
    const confirmed = await confirm({
      title: `Delete "${event.title}"?`,
      description: "This will permanently remove the event from Google Calendar.",
      confirmLabel: "Delete",
    });
    if (!confirmed) return;
    const result = await deleteEvent(event.id);
    if (result.success) {
      onClose();
      onUpdate();
    }
  };

  const handleEditEvent = () => {
    const start = new Date(event.startTime);
    const end = new Date(event.endTime);
    const attendeeEmails = attendees?.map((a) => a.email).join(", ") || "";

    openModal("calendar-event", {
      eventId: event.id,
      initialTitle: event.title,
      initialDescription: event.description || "",
      initialLocation: event.location || "",
      initialStartDate: format(start, "yyyy-MM-dd"),
      initialStartTime: format(start, "HH:mm"),
      initialEndDate: format(end, "yyyy-MM-dd"),
      initialEndTime: format(end, "HH:mm"),
      initialAllDay: event.allDay,
      initialAttendees: attendeeEmails,
      initialContactId: event.contactId || "",
      initialContactName: event.contact?.name || "",
    });
    onClose();
  };

  // Duration
  const duration = useMemo(() => {
    if (event.allDay) return "All day";
    const mins = differenceInMinutes(new Date(event.endTime), new Date(event.startTime));
    const hours = Math.floor(mins / 60);
    const remainMins = mins % 60;
    if (hours === 0) return `${remainMins}m`;
    if (remainMins === 0) return `${hours}h`;
    return `${hours}h ${remainMins}m`;
  }, [event.startTime, event.endTime, event.allDay]);

  // Relative time
  const relativeTime = useMemo(() => {
    const start = new Date(event.startTime);
    const distance = formatDistanceToNow(start, { addSuffix: true });
    return distance;
  }, [event.startTime]);

  const eventIsPast = isPast(new Date(event.endTime));

  // Detect video meeting link from description or location
  const meetingLink = useMemo(() => {
    const text = `${event.description || ""} ${event.location || ""}`;
    const meetMatch = text.match(/https:\/\/meet\.google\.com\/[a-z\-]+[^\s)"<]*/i);
    if (meetMatch) return meetMatch[0];
    const zoomMatch = text.match(/https:\/\/[a-z0-9]*\.?zoom\.us\/j\/\d+[^\s)"<]*/i);
    if (zoomMatch) return zoomMatch[0];
    const teamsMatch = text.match(/https:\/\/teams\.microsoft\.com\/l\/meetup-join\/[^\s)"<]*/i);
    if (teamsMatch) return teamsMatch[0];
    return null;
  }, [event.description, event.location]);

  // Status config
  const statusConfig: Record<string, { label: string; className: string }> = {
    confirmed: { label: "Confirmed", className: Styles.statusConfirmed },
    tentative: { label: "Tentative", className: Styles.statusTentative },
    cancelled: { label: "Cancelled", className: Styles.statusCancelled },
  };

  const status = event.status ? statusConfig[event.status] : null;

  const formatTimeRange = () => {
    if (event.allDay) {
      return format(new Date(event.startTime), "EEEE, MMMM d, yyyy");
    }
    const start = new Date(event.startTime);
    const end = new Date(event.endTime);
    return `${format(start, "EEEE, MMMM d · h:mm a")} – ${format(end, "h:mm a")}`;
  };

  return (
    <div className={Styles.overlay} onClick={onClose}>
      <div className={Styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={Styles.header}>
          <div className={Styles.headerLeft}>
            <h2 className={Styles.title}>{event.title}</h2>
            {status && (
              <span className={`${Styles.statusBadge} ${status.className}`}>
                {status.label}
              </span>
            )}
          </div>
          <div className={Styles.headerActions}>
            <button className={Styles.headerBtn} onClick={handleEditEvent} title="Edit event">
              <EditRegular />
            </button>
            <button className={`${Styles.headerBtn} ${Styles.headerDeleteBtn}`} onClick={handleDelete} title="Delete event">
              <DeleteRegular />
            </button>
            <button className={Styles.headerBtn} onClick={onClose} title="Close">
              <DismissRegular />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className={Styles.body}>
          {/* Time section */}
          <div className={Styles.timeSection}>
            <div className={Styles.timeRow}>
              <CalendarRegular className={Styles.icon} />
              <span className={Styles.timeText}>{formatTimeRange()}</span>
            </div>
            <div className={Styles.timeMeta}>
              <span className={Styles.chip}>
                <ClockRegular fontSize={12} />
                {duration}
              </span>
              <span className={`${Styles.chip} ${eventIsPast ? Styles.chipPast : Styles.chipUpcoming}`}>
                {relativeTime}
              </span>
            </div>
          </div>

          {/* Location */}
          {event.location && (
            <div className={Styles.infoRow}>
              <LocationRegular className={Styles.icon} />
              <span>{event.location}</span>
            </div>
          )}

          {/* Join meeting button */}
          {meetingLink && (
            <a
              href={meetingLink}
              target="_blank"
              rel="noopener noreferrer"
              className={Styles.joinMeeting}
            >
              <VideoRegular />
              Join video meeting
            </a>
          )}

          {/* Description */}
          {event.description && (
            <div className={Styles.descriptionBox}>
              <p>{event.description}</p>
            </div>
          )}

          {/* CRM Links */}
          <div className={Styles.section}>
            <div className={Styles.sectionHeader}>
              <LinkRegular className={Styles.icon} fontSize={20} />
              <span>Linked Contact</span>
            </div>
            <div className={Styles.links}>
              {event.deal && (
                <div className={Styles.linkItem}>
                  <span className={`${Styles.linkBadge} ${Styles.dealBadge}`}>Deal</span>
                  <div className={Styles.linkInfo}>
                    <span className={Styles.linkName}>{event.deal.title}</span>
                    {event.deal.stage && (
                      <span className={Styles.linkMeta}>{event.deal.stage}</span>
                    )}
                  </div>
                  <button
                    className={Styles.unlinkBtn}
                    onClick={() => handleUnlink("deal")}
                    disabled={unlinking === "deal"}
                    title="Unlink"
                  >
                    <DeleteRegular fontSize={16} />
                  </button>
                </div>
              )}
              {event.contact && (
                <div className={Styles.linkItem}>
                  <span className={`${Styles.linkBadge} ${Styles.contactBadge}`}>
                    <PeopleFilled fontSize={16} />
                  </span>
                  <div className={Styles.linkInfo}>
                    <span className={Styles.linkName}>{event.contact.name}</span>
                    {event.contact.email && (
                      <span className={Styles.linkMeta}>{event.contact.email}</span>
                    )}
                  </div>
                  <button
                    className={Styles.unlinkBtn}
                    onClick={() => handleUnlink("contact")}
                    disabled={unlinking === "contact"}
                    title="Unlink"
                  >
                    <DeleteRegular fontSize={14} />
                  </button>
                </div>
              )}
              {!event.contact && (
                <div className={Styles.linkContactRow}>
                  <button
                    className={Styles.linkContactBtn}
                    onClick={(e) => contactPicker.open(e.currentTarget)}
                    disabled={linking}
                  >
                    <PersonAddRegular fontSize={16} />
                    {linking ? "Linking..." : "Link a contact"}
                  </button>
                  {contactPicker.isOpen && contactPicker.triggerRect && (
                    <ContactPicker
                      triggerRect={contactPicker.triggerRect}
                      onSelect={handleLinkContact}
                      onClose={contactPicker.close}
                    />
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Attendees */}
          {attendees && attendees.length > 0 && (
            <div className={Styles.section}>
              <div className={Styles.sectionHeader}>
                <PeopleRegular className={Styles.icon} fontSize={20}/>
                <span>Other attendees ({attendees.length})</span>
              </div>
              <div className={Styles.attendeeList}>
                {attendees.map((a, i) => (
                  <div key={i} className={Styles.attendee}>
                    <AvatarFallback
                      name={a.displayName || a.email}
                      entityKind="customer"
                      entityId={a.email}
                      size={16}
                      letterCount={1}
                    />
                    <div className={Styles.attendeeInfo}>
                      <span className={Styles.attendeeName}>{a.displayName || a.email}</span>
                      {a.displayName && <span className={Styles.attendeeEmail}>{a.email}</span>}
                    </div>
                    {a.responseStatus && (
                      <span className={`${Styles.responseStatus} ${Styles[a.responseStatus] || ""}`}>
                        {a.responseStatus}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className={Styles.footer}>
          <div className={Styles.quickActions}>
            <button
              className={Styles.actionBtn}
              onClick={() => openModal("note", { contactId: event.contactId, dealId: event.dealId, companyId: event.companyId })}
            >
              <NoteRegular />
              Add note
            </button>
          </div>
          <div className={Styles.footerRight}>
            {event.htmlLink && (
              <a
                href={event.htmlLink}
                target="_blank"
                rel="noopener noreferrer"
                className={Styles.externalLink}
              >
                <OpenRegular />
                Google Calendar
              </a>
            )}
          </div>
        </div>

        {/* Synced info */}
        {event.syncedAt && (
          <div className={Styles.syncInfo}>
            Last synced {formatDistanceToNow(new Date(event.syncedAt), { addSuffix: true })}
          </div>
        )}
      </div>
    </div>
  );
};

export default EventDetailPanel;
