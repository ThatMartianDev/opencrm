"use client";

import { useMemo, useState } from "react";
import { ChevronDownFilled, ChevronRightFilled,  } from "@fluentui/react-icons";
import { isToday, isSameWeek, addWeeks, format, startOfDay } from "date-fns";
import type { CalendarEventData } from "../../CalendarPage";
import Styles from "./AgendaView.module.css";

type AgendaViewProps = {
  events: CalendarEventData[];
  onEventClick: (event: CalendarEventData) => void;
};

type GroupedEvents = {
  pastDates: CalendarEventData[];
  today: CalendarEventData[];
  thisWeek: CalendarEventData[];
  nextWeek: CalendarEventData[];
  later: CalendarEventData[];
};

type GroupConfig = {
  key: keyof GroupedEvents;
  label: string;
  color: string;
};

const GROUPS: GroupConfig[] = [
  { key: "pastDates", label: "Past Dates", color: "#8b4513" },
  { key: "today", label: "Today", color: "#2e7d32" },
  { key: "thisWeek", label: "This week", color: "#1565c0" },
  { key: "nextWeek", label: "Next week", color: "#6a1b9a" },
  { key: "later", label: "Later", color: "#757575" },
];

const AgendaView = ({ events, onEventClick }: AgendaViewProps) => {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const toggleGroup = (key: string) => {
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const grouped = useMemo<GroupedEvents>(() => {
    const now = new Date();
    const result: GroupedEvents = {
      pastDates: [],
      today: [],
      thisWeek: [],
      nextWeek: [],
      later: [],
    };

    const sorted = [...events].sort(
      (a, b) =>
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
    );

    for (const event of sorted) {
      const eventDate = new Date(event.startTime);

      if (startOfDay(eventDate) < startOfDay(now) && !isToday(eventDate)) {
        result.pastDates.push(event);
      } else if (isToday(eventDate)) {
        result.today.push(event);
      } else if (isSameWeek(eventDate, now, { weekStartsOn: 0 })) {
        result.thisWeek.push(event);
      } else if (isSameWeek(eventDate, addWeeks(now, 1), { weekStartsOn: 0 })) {
        result.nextWeek.push(event);
      } else {
        result.later.push(event);
      }
    }

    return result;
  }, [events]);

  return (
    <div className={Styles.agendaView}>
      {GROUPS.map(({ key, label, color }) => {
        const groupEvents = grouped[key];
        const isCollapsed = collapsed[key] ?? false;
        const count = groupEvents.length;

        return (
          <section key={key} className={Styles.group}>
            <button
              className={Styles.groupHeader}
              onClick={() => toggleGroup(key)}
            >
              <span className={Styles.chevron}>
                {isCollapsed ? <ChevronRightFilled fontSize={18}/> : <ChevronDownFilled fontSize={18}/>}
              </span>
              <span className={Styles.groupLabel} style={{ color }}>
                {label}
              </span>
              <span className={Styles.groupCount}>
                {count} {count === 1 ? "item" : "items"}
              </span>
            </button>

            {!isCollapsed && count > 0 && (
              <div className={Styles.eventsList}>
                {groupEvents.map((event) => (
                  <button
                    key={event.id}
                    className={Styles.eventRow}
                    onClick={() => onEventClick(event)}
                  >
                    <div
                      className={Styles.eventIndicator}
                      style={{ backgroundColor: color }}
                    />
                    <div className={Styles.eventInfo}>
                      <span className={Styles.eventMeta}>
                        {event.allDay
                          ? format(new Date(event.startTime), "MMM d") +
                            " · All day"
                          : format(new Date(event.startTime), "MMM d · h:mm a")}
                      </span>
                      <span className={Styles.eventTitle}>{event.title}</span>

                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
};

export default AgendaView;
