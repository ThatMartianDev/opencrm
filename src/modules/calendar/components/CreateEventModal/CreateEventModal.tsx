"use client";

import { useState } from "react";
import {
  CalendarRegular,
  ChevronDownRegular,
  ChevronUpRegular,
} from "@fluentui/react-icons";
import MainButton from "@/components/micro/MainButton/MainButton";
import S from "@/components/macro/ModalProvider/SharedStyles.module.css";
import { useToast } from "@/components/macro/Toaster";
import {
  ContactPicker,
  PickerContact,
  useContactPicker,
} from "@/components/macro/ContactPicker";
import {
  CompanyPicker,
  PickerCompany,
  useCompanyPicker,
} from "@/components/macro/CompanyPicker";
import DateTimePicker from "@/components/macro/DateTimePicker";
import { createEvent, updateEvent } from "../../actions";
import Styles from "./CreateEventModal.module.css";
import Selectable from "@/components/micro/FormFields/Selectable";
import { logActivity } from "@/modules/activity-log";
import { init } from "next/dist/compiled/webpack/webpack";

type CreateEventModalProps = {
  onClose: () => void;
  eventId?: string;
  initialTitle?: string;
  initialDescription?: string;
  initialLocation?: string;
  initialStartDate?: string;
  initialEndDate?: string;
  initialStartTime?: string;
  initialEndTime?: string;
  initialAllDay?: boolean;
  initialAttendees?: string;
  initialContactId?: string;
  initialContactName?: string;
};

type DateTimeValue = {
  start: Date;
  end?: Date;
};

const CreateEventModal = ({
  onClose,
  eventId,
  initialTitle,
  initialDescription,
  initialLocation,
  initialStartDate,
  initialEndDate,
  initialStartTime,
  initialEndTime,
  initialAllDay,
  initialAttendees,
  initialContactId,
  initialContactName,
}: CreateEventModalProps) => {
  const { toast } = useToast();
  const [title, setTitle] = useState(initialTitle || "");
  const [description, setDescription] = useState(initialDescription || "");
  const [location, setLocation] = useState(initialLocation || "");
  const [startDate, setStartDate] = useState(initialStartDate || "");
  const [startTime, setStartTime] = useState(initialStartTime || "");
  const [endDate, setEndDate] = useState(initialEndDate || "");
  const [endTime, setEndTime] = useState(initialEndTime || "");
  const [allDay, setAllDay] = useState(initialAllDay || false);
  const [autoGoogleMeet, setAutoGoogleMeet] = useState(false);
  const [attendees, setAttendees] = useState(initialAttendees || "");
  const [contactId, setContactId] = useState(initialContactId || "");
  const [contactName, setContactName] = useState(initialContactName || "");
  const [companyId, setCompanyId] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [creating, setCreating] = useState(false);
  const [moreOptions, setMoreOptions] = useState(false);
  const [whenTriggerRect, setWhenTriggerRect] = useState<DOMRect | null>(null);
  const [isWhenPickerOpen, setIsWhenPickerOpen] = useState(false);

  const contactPicker = useContactPicker();
  const companyPicker = useCompanyPicker();

  const handleSelectContact = (contact: PickerContact) => {
    setContactId(contact.id);
    setContactName(contact.name);
    contactPicker.close();
  };

  const handleSelectCompany = (company: PickerCompany) => {
    setCompanyId(company.id);
    setCompanyName(company.name);
    companyPicker.close();
  };

  const isEditMode = !!eventId;

  const formatDateForInput = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const formatTimeForInput = (date: Date) => {
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${hours}:${minutes}`;
  };

  const formatWhenLabel = () => {
    if (!startDate) return "Select date and time";

    const start = new Date(`${startDate}T${startTime || "09:00"}`);
    const end = new Date(`${endDate || startDate}T${endTime || "10:00"}`);

    const dateLabel = start.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    if (allDay) {
      return `${dateLabel} • All day`;
    }

    const startLabel = start.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    const endLabel = end.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    return `${dateLabel} • ${startLabel} - ${endLabel}`;
  };

  async function handleSubmit() {
    if (!title.trim()) return;
    if (!startDate) return;

    setCreating(true);
    const t = toast.loading(
      isEditMode ? "Updating event..." : "Creating event...",
    );

    const startDateTime = allDay
      ? new Date(`${startDate}T00:00:00`).toISOString()
      : new Date(`${startDate}T${startTime || "09:00"}`).toISOString();

    const endDateTime = allDay
      ? new Date(`${endDate || startDate}T23:59:59`).toISOString()
      : new Date(`${endDate || startDate}T${endTime || "10:00"}`).toISOString();

    const attendeeList = attendees
      .split(",")
      .map((e) => e.trim())
      .filter((e) => e.includes("@"))
      .map((email) => ({ email }));

    try {
      const payload = {
        title: title.trim(),
        description: description.trim() || undefined,
        location: location.trim() || undefined,
        autoGoogleMeet: !allDay && autoGoogleMeet,
        startTime: startDateTime,
        endTime: endDateTime,
        allDay,
        attendees: attendeeList.length > 0 ? attendeeList : undefined,
        contactId: contactId || undefined,
        companyId: companyId || undefined,
      };

      const result = isEditMode
        ? await updateEvent(eventId, payload)
        : await createEvent(payload);

      if (result.success) {
        if (contactId) {
          const determineOutcome = contactId !== initialContactId || title.trim() !== initialTitle ? "SCHEDULED" : initialStartTime !== payload.startTime ? "RESCHEDULED" : undefined;
          await logActivity({
            entityType: "contact",
            entityId: contactId,
            activityType: "MEETING",
            outcome: determineOutcome,
            title: isEditMode
              ? `Updated event: ${title}`
              : `Created event: ${title}`,
            description: isEditMode
              ? `Event "${title}" was updated.`
              : `Event "${title}" was created and linked to contact ${contactName}.`,
          });
        }

        t.success({
          title: isEditMode ? "Event updated" : "Event created",
          description: isEditMode
            ? `"${title}" has been updated.`
            : `"${title}" has been added to your calendar.`,
        });
        onClose();
      } else {
        t.error({
          title: `Failed to ${isEditMode ? "update" : "create"} event`,
          description: result.error || "Something went wrong.",
        });
      }
    } catch (err) {
      t.error({
        title: `Failed to ${isEditMode ? "update" : "create"} event`,
        description:
          err instanceof Error ? err.message : "Something went wrong.",
      });
    }

    setCreating(false);
  }

  return (
    <div className={S.modalCard}>
      <div className={S.modalHeader}>
        <span style={{ backgroundColor: "rgba(156, 39, 176, 0.1)" }}>
          <CalendarRegular fontSize={20} color="rgba(156, 39, 176, 1)" />
        </span>
        <h2>{isEditMode ? "Edit Event" : "Create Event"}</h2>
      </div>

      <div className={S.modalBody}>
        {/* Title */}
        <div className={Styles.field}>
          <label>Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Meeting with..."
          />
        </div>

        {/* Meeting link */}
        <div className={Styles.field}>
          <label>Meeting link</label>
          <input
            type="text"
            value={location}
            onChange={(e) => {
              const value = e.target.value;
              setLocation(value);
              if (value.trim()) {
                setAutoGoogleMeet(false);
              }
            }}
            placeholder="https://meet.google.com/... or Zoom/Teams link"
          />
          <Selectable
            id="autoGoogleMeet"
            isFormInput
            label={
              allDay
                ? "Auto Google Meet link (not available for all-day events)"
                : "Auto Generate Google Meet link"
            }
            name="autoGoogleMeet"
            value="autoGoogleMeet"
            type="checkbox"
            onChange={(e) => {
              const checked = e.target.checked;
              setAutoGoogleMeet(checked);
              if (checked) {
                setLocation("");
              }
            }}
          />
          {/* <span className={Styles.hint}>Paste a link, or use auto Google Meet generation below.</span> */}
        </div>

        {/* When */}
        <div className={Styles.field}>
          <label>When</label>
          <button
            type="button"
            className={`${Styles.pickerTrigger} ${Styles.whenTrigger} ${startDate ? Styles.whenValueFilled : ""}`}
            onClick={(e) => {
              setWhenTriggerRect(e.currentTarget.getBoundingClientRect());
              setIsWhenPickerOpen(true);
            }}
          >
            {formatWhenLabel()}
          </button>

          {isWhenPickerOpen && whenTriggerRect && (
            <DateTimePicker
              category="datetime"
              dataType={{ datetime: "single" }}
              triggerRect={whenTriggerRect}
              initialStart={
                startDate
                  ? new Date(`${startDate}T${startTime || "09:00"}`)
                  : undefined
              }
              initialEnd={
                endDate || startDate
                  ? new Date(`${endDate || startDate}T${endTime || "10:00"}`)
                  : undefined
              }
              onClose={() => setIsWhenPickerOpen(false)}
              onChange={(value: DateTimeValue) => {
                const { start, end } = value;
                const endDateTime =
                  end ?? new Date(start.getTime() + 60 * 60 * 1000);
                setStartDate(formatDateForInput(start));
                setEndDate(formatDateForInput(endDateTime));
                setStartTime(formatTimeForInput(start));
                setEndTime(formatTimeForInput(endDateTime));
              }}
            />
          )}
        </div>

        {/* Who */}
        <div className={Styles.field}>
          <label>Who</label>
          <div
            className={Styles.pickerTrigger}
            onClick={(e) => contactPicker.open(e.currentTarget)}
          >
            {contactName || "Select contact..."}
          </div>
          {contactPicker.isOpen && contactPicker.triggerRect && (
            <ContactPicker
              triggerRect={contactPicker.triggerRect}
              onSelect={handleSelectContact}
              onClose={contactPicker.close}
            />
          )}
        </div>

        {/* More Options */}
        <button
          className={Styles.moreOptionsToggle}
          onClick={() => setMoreOptions(!moreOptions)}
        >
          {moreOptions ? (
            <ChevronUpRegular fontSize={14} />
          ) : (
            <ChevronDownRegular fontSize={14} />
          )}
          <span>{moreOptions ? "Less options" : "More options"}</span>
        </button>

        {moreOptions && (
          <div className={Styles.moreOptions}>
            {/* All day toggle */}
            <Selectable
              id="allDay"
              isFormInput
              label="All day event"
              name="allDay"
              value="allDay"
              type="checkbox"
              onChange={(e) => setAllDay(e.target.checked)}
            />

            {/* Description */}
            <div className={Styles.field}>
              <label>Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Event details..."
                rows={3}
              />
            </div>

            {/* Attendees */}
            <div className={Styles.field}>
              <label>Other Attendees</label>
              <input
                type="text"
                value={attendees}
                onChange={(e) => setAttendees(e.target.value)}
                placeholder="email1@example.com, email2@example.com"
              />
              <span className={Styles.hint}>Comma-separated emails</span>
            </div>

            {/* Link to Company */}
            <div className={Styles.field}>
              <label>Link to Company</label>
              <div
                className={Styles.pickerTrigger}
                onClick={(e) => companyPicker.open(e.currentTarget)}
              >
                {companyName || "Select company..."}
              </div>
              {companyPicker.isOpen && companyPicker.triggerRect && (
                <CompanyPicker
                  triggerRect={companyPicker.triggerRect}
                  onSelect={handleSelectCompany}
                  onClose={companyPicker.close}
                />
              )}
            </div>
          </div>
        )}
      </div>

      <div className={S.modalFooter}>
        <MainButton type="secondary" text="Discard" onClick={onClose} />
        <MainButton
          type="primary"
          text={
            creating
              ? isEditMode
                ? "Updating..."
                : "Creating..."
              : isEditMode
                ? "Update Event"
                : "Create Event"
          }
          onClick={handleSubmit}
        />
      </div>
    </div>
  );
};

export default CreateEventModal;
