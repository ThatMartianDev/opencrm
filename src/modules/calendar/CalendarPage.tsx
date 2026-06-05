"use client";

import { useEffect, useState, useCallback } from "react";
import {
  CalendarRegular,
  ArrowSyncRegular,
  ChevronLeftRegular,
  ChevronRightRegular,
  CalendarTodayRegular,
} from "@fluentui/react-icons";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
} from "date-fns";

import TabsControlHeader from "@/components/macro/TabsControlHeader/TabsControlHeader";
import { useModal } from "@/components/macro/ModalProvider/ModalProvider";
import {
  checkCalendarConnection,
  syncCalendar,
  fetchCalendarEvents,
} from "./actions";
import Styles from "./CalendarPage.module.css";
import EventCard from "./components/EventCard/EventCard";
import ConnectCalendarPrompt from "./components/ConnectCalendarPrompt/ConnectCalendarPrompt";
import EventDetailPanel from "./components/EventDetailPanel/EventDetailPanel";

export type CalendarEventData = Awaited<ReturnType<typeof fetchCalendarEvents>>[number];

const CalendarPage = () => {
  const [connected, setConnected] = useState<boolean | null>(null);
  const [events, setEvents] = useState<CalendarEventData[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEventData | null>(null);
  const [syncing, setSyncing] = useState(false);
  const { openModal } = useModal();

  // Check connection status
  useEffect(() => {
    checkCalendarConnection().then((r) => setConnected(r.connected));
  }, []);

  // Fetch events when month changes or after connection
  const loadEvents = useCallback(async () => {
    if (!connected) return;
    const start = startOfWeek(startOfMonth(currentMonth));
    const end = endOfWeek(endOfMonth(currentMonth));
    const data = await fetchCalendarEvents(start.toISOString(), end.toISOString());
    setEvents(data);
  }, [connected, currentMonth]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  // Sync and reload
  const handleSync = async () => {
    setSyncing(true);
    await syncCalendar();
    await loadEvents();
    setSyncing(false);
  };

  // Navigation
  const goToPrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const goToNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const goToToday = () => setCurrentMonth(new Date());

  // Build calendar grid
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const getEventsForDay = (day: Date) =>
    events.filter((e) => isSameDay(new Date(e.startTime), day));

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
        tabs={[]}
        onTabBtnClick={() => {}}
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

      <div className={Styles.calendarControls}>
        <button onClick={goToPrevMonth} className={Styles.navBtn}>
          <ChevronLeftRegular />
        </button>
        <button onClick={goToToday} className={Styles.todayBtn}>
          <CalendarTodayRegular />
          Today
        </button>
        <button onClick={goToNextMonth} className={Styles.navBtn}>
          <ChevronRightRegular />
        </button>
        <h3 className={Styles.monthTitle}>{format(currentMonth, "MMMM yyyy")}</h3>
      </div>

      <div className={Styles.calendarGrid}>
        {/* Day headers */}
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div key={day} className={Styles.dayHeader}>
            {day}
          </div>
        ))}

        {/* Day cells */}
        {calendarDays.map((day) => {
          const dayEvents = getEventsForDay(day);
          return (
            <div
              key={day.toISOString()}
              className={`${Styles.dayCell} ${
                !isSameMonth(day, currentMonth) ? Styles.otherMonth : ""
              } ${isToday(day) ? Styles.today : ""}`}
            >
              <span className={Styles.dayNumber}>{format(day, "d")}</span>
              <div className={Styles.eventList}>
                {dayEvents.slice(0, 3).map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    onClick={() => setSelectedEvent(event)}
                  />
                ))}
                {dayEvents.length > 3 && (
                  <span className={Styles.moreEvents}>+{dayEvents.length - 3} more</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

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
