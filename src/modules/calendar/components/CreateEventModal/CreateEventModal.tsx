"use client";

import { useState } from "react";
import { CalendarRegular } from "@fluentui/react-icons";
import MainButton from "@/components/micro/MainButton/MainButton";
import S from "@/components/macro/ModalProvider/SharedStyles.module.css";
import { useToast } from "@/components/macro/Toaster";
import { ContactPicker, PickerContact, useContactPicker } from "@/components/macro/ContactPicker";
import { CompanyPicker, PickerCompany, useCompanyPicker } from "@/components/macro/CompanyPicker";
import { createEvent } from "../../actions";
import Styles from "./CreateEventModal.module.css";

type CreateEventModalProps = {
  onClose: () => void;
};

const CreateEventModal = ({ onClose }: CreateEventModalProps) => {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("");
  const [allDay, setAllDay] = useState(false);
  const [attendees, setAttendees] = useState("");
  const [contactId, setContactId] = useState("");
  const [contactName, setContactName] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [creating, setCreating] = useState(false);

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

  async function handleCreate() {
    if (!title.trim()) {
      return;
    }
    if (!startDate) {
      return;
    }

    setCreating(true);
    const t = toast.loading("Creating event...");

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
      const result = await createEvent({
        title: title.trim(),
        description: description.trim() || undefined,
        location: location.trim() || undefined,
        startTime: startDateTime,
        endTime: endDateTime,
        allDay,
        attendees: attendeeList.length > 0 ? attendeeList : undefined,
        contactId: contactId || undefined,
        companyId: companyId || undefined,
      });

      if (result.success) {
        t.success({ title: "Event created", description: `"${title}" has been added to your calendar.` });
        onClose();
      } else {
        t.error({ title: "Failed to create event", description: result.error || "Something went wrong." });
      }
    } catch (err) {
      t.error({ title: "Failed to create event", description: err instanceof Error ? err.message : "Something went wrong." });
    }

    setCreating(false);
  }

  return (
    <div className={S.modalCard}>
      <div className={S.modalHeader}>
        <span style={{ backgroundColor: "rgba(156, 39, 176, 0.1)" }}>
          <CalendarRegular fontSize={20} color="rgba(156, 39, 176, 1)" />
        </span>
        <h2>Create Event</h2>
      </div>

      <div className={S.modalBody}>
        {/* Title */}
        <div className={Styles.field}>
          <label>Title *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Meeting with..."
          />
        </div>

        {/* All day toggle */}
        <div className={Styles.checkboxField}>
          <input
            type="checkbox"
            id="allDay"
            checked={allDay}
            onChange={(e) => setAllDay(e.target.checked)}
          />
          <label htmlFor="allDay">All day event</label>
        </div>

        {/* Date/Time */}
        <div className={Styles.row}>
          <div className={Styles.field}>
            <label>Start Date *</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                if (!endDate) setEndDate(e.target.value);
              }}
            />
          </div>
          {!allDay && (
            <div className={Styles.field}>
              <label>Start Time</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
          )}
        </div>

        <div className={Styles.row}>
          <div className={Styles.field}>
            <label>End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          {!allDay && (
            <div className={Styles.field}>
              <label>End Time</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          )}
        </div>

        {/* Location */}
        <div className={Styles.field}>
          <label>Location</label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Office, Zoom link, etc."
          />
        </div>

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
          <label>Attendees</label>
          <input
            type="text"
            value={attendees}
            onChange={(e) => setAttendees(e.target.value)}
            placeholder="email1@example.com, email2@example.com"
          />
          <span className={Styles.hint}>Comma-separated emails</span>
        </div>

        {/* Link to Contact */}
        <div className={Styles.field}>
          <label>Link to Contact</label>
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

      <div className={S.modalFooter}>
        <MainButton type="secondary" text="Discard" onClick={onClose} />
        <MainButton
          type="primary"
          text={creating ? "Creating..." : "Create Event"}
          onClick={handleCreate}
        />
      </div>
    </div>
  );
};

export default CreateEventModal;
