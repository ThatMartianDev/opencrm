"use client";

import { useEffect, useState, useCallback } from "react";
import {
  CalendarRegular,
  ArrowSyncRegular,
} from "@fluentui/react-icons";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  format,
  addDays,
  subDays,
} from "date-fns";

import TabsControlHeader from "@/components/macro/TabsControlHeader/TabsControlHeader";
import { useModal } from "@/components/macro/ModalProvider/ModalProvider";
import {
  checkCalendarConnection,
  syncCalendar,
  fetchCalendarEvents,
} from "./actions";
import Styles from "./CalendarPage.module.css";
import ConnectCalendarPrompt from "./components/ConnectCalendarPrompt/ConnectCalendarPrompt";
import EventDetailPanel from "./components/EventDetailPanel/EventDetailPanel";
import AgendaView from "./components/AgendaView/AgendaView";
import CalendarGridView from "./components/CalendarGridView/CalendarGridView";
import type { DragSelection } from "./hooks/useDragSelect";
import { useToast } from "@/components/macro/Toaster";

export type CalendarEventData = Awaited<ReturnType<typeof fetchCalendarEvents>>[number];

type ActiveTab = "agenda" | "calendar";
type ViewMode = "week" | "month";

const CalendarPage = () => {
  const [connected, setConnected] = useState<boolean | null>(null);
  const [events, setEvents] = useState<CalendarEventData[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEventData | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>("agenda");
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const { openModal } = useModal();

  const {toast} = useToast();

  // Drag-to-select handler
  const handleDragSelect = useCallback((selection: DragSelection) => {
    openModal("calendar-event", {
      initialStartDate: format(selection.start, "yyyy-MM-dd"),
      initialEndDate: format(selection.end, "yyyy-MM-dd"),
      initialStartTime: format(selection.start, "HH:mm"),
      initialEndTime: format(selection.end, "HH:mm"),
    });
  }, [openModal]);

  // Check connection status
  useEffect(() => {
    checkCalendarConnection().then((r) => setConnected(r.connected));
  }, []);

  // Fetch events based on active view
  const loadEvents = useCallback(async () => {
    if (!connected) return;

    let start: Date;
    let end: Date;

    if (activeTab === "agenda") {
      start = subDays(new Date(), 30);
      end = addDays(new Date(), 60);
    } else if (viewMode === "week") {
      start = startOfWeek(currentDate, { weekStartsOn: 0 });
      end = endOfWeek(currentDate, { weekStartsOn: 0 });
    } else {
      start = startOfWeek(startOfMonth(currentDate));
      end = endOfWeek(endOfMonth(currentDate));
    }

    const data = await fetchCalendarEvents(start.toISOString(), end.toISOString());
    setEvents(data);
  }, [connected, currentDate, activeTab, viewMode]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  useEffect(() => {
    window.document.title = "Calendar | OpenCRM";
  }, []);

  // Sync and reload
  const handleSync = async () => {
    const t = toast.loading("Syncing with Google Calendar...");
    setSyncing(true);
    const syncResult = await syncCalendar();

    if (!syncResult.success) {
      const normalizedError = (syncResult.error || "").toLowerCase();
      if (normalizedError.includes("reconnect") || normalizedError.includes("not connected")) {
        setConnected(false);
      }

      t.error({ title: "Sync failed", description: syncResult.error || "Something went wrong." });
      setSyncing(false);
      return;
    }
    await loadEvents();
    t.success({ title: "Sync complete", description: "Your calendar has been synced." });
    setSyncing(false);
  };

  if (connected === null) {
    return <div className={Styles.loading}>Loading...</div>;
  }

  if (!connected) {
    return <ConnectCalendarPrompt />;
  }

  return (
    <div className={Styles.calendarPage}>
      <header className="global_header">
        <div className="g_header_section_name">
          <span style={{ backgroundColor: "rgba(156, 39, 176, 1)" }}>
            <CalendarRegular fontSize={20} color="#fff" />
          </span>
          <h2>Calendar</h2>
        </div>
      </header>

      <TabsControlHeader
        tabs={[
          { id: "agenda", label: "Agenda" },
          { id: "calendar", label: "Calendar" },
        ]}
        onTabBtnClick={(id) => setActiveTab(id as ActiveTab)}
        showMainBtn={true}
        mainButton={{ text: "Create Event", onClick: () => openModal("calendar-event") }}
        iconButtons={[
          {
            id: "sync",
            icon: <ArrowSyncRegular className={syncing ? Styles.spinning : ""} />,
            tooltip: "Sync with Google Calendar",
            onClick: handleSync,
          },
        ]}
      />

      {activeTab === "calendar" && (
        <CalendarGridView
          events={events}
          currentDate={currentDate}
          onDateChange={setCurrentDate}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onEventClick={setSelectedEvent}
          onDragSelect={handleDragSelect}
        />
      )}

      {activeTab === "agenda" && (
        <AgendaView events={events} onEventClick={setSelectedEvent} />
      )}

      {/* Event detail side panel */}
      {selectedEvent && (
        <EventDetailPanel
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onUpdate={loadEvents}
        />
      )}
    </div>
  );
};

export default CalendarPage;
