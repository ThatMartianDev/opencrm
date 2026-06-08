"use client";

import { useMemo, useState, useCallback } from "react";
import {
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  eachHourOfInterval,
  format,
  isSameDay,
  isToday,
  startOfDay,
  setHours,
  addHours,
} from "date-fns";
import type { CalendarEventData } from "../../../CalendarPage";
import { useDragSelect, type DragSelection } from "../../../hooks/useDragSelect";
import EventCard from "../../EventCard/EventCard";
import CursorHint from "../CursorHint/CursorHint";
import Styles from "./WeekGrid.module.css";

type WeekGridProps = {
  currentDate: Date;
  events: CalendarEventData[];
  onEventClick: (event: CalendarEventData) => void;
  onDragSelect: (selection: DragSelection) => void;
};

const WeekGrid = ({ currentDate, events, onEventClick, onDragSelect }: WeekGridProps) => {
  const weekDays = useMemo(() => {
    const start = startOfWeek(currentDate, { weekStartsOn: 0 });
    const end = endOfWeek(currentDate, { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [currentDate]);

  const hours = useMemo(() => {
    const day = startOfDay(new Date());
    return eachHourOfInterval({
      start: setHours(day, 0),
      end: setHours(day, 23),
    });
  }, []);

  const drag = useDragSelect({ onSelect: onDragSelect });

  // Cursor hint
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  const [cursorInGrid, setCursorInGrid] = useState(false);

  const handleGridMouseMove = useCallback((e: React.MouseEvent) => {
    setCursorPos({ x: e.clientX, y: e.clientY });
  }, []);

  const getEventsForDay = (day: Date) =>
    events.filter((e) => isSameDay(new Date(e.startTime), day));

  const getAllDayEvents = (day: Date) =>
    events.filter((e) => e.allDay && isSameDay(new Date(e.startTime), day));

  const getTimedEvents = (day: Date) =>
    events.filter((e) => !e.allDay && isSameDay(new Date(e.startTime), day));

  return (
    <div className={Styles.weekGrid}>
      {/* Header row with day names */}
      <div className={Styles.header}>
        <div className={Styles.timeGutter}></div>
        {weekDays.map((day) => (
          <div
            key={day.toISOString()}
            className={`${Styles.dayHeader} ${isToday(day) ? Styles.todayHeader : ""}`}
          >
            <span className={Styles.dayName}>{format(day, "EEE")}</span>
            <span className={`${Styles.dayNum} ${isToday(day) ? Styles.todayNum : ""}`}>
              {format(day, "d")}
            </span>
          </div>
        ))}
      </div>

      {/* All-day events row */}
      <div className={Styles.allDayRow}>
        <div className={Styles.timeGutter}>
          <span className={Styles.timeLabel}>All day</span>
        </div>
        {weekDays.map((day) => {
          const allDay = getAllDayEvents(day);
          return (
            <div key={day.toISOString()} className={Styles.allDayCell}>
              {allDay.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  onClick={() => onEventClick(event)}
                />
              ))}
            </div>
          );
        })}
      </div>

      {/* Time grid */}
      <div
        className={Styles.timeGrid}
        onMouseMove={handleGridMouseMove}
        onMouseEnter={() => setCursorInGrid(true)}
        onMouseLeave={() => { setCursorInGrid(false); drag.handleMouseLeave(); }}
      >
        <CursorHint x={cursorPos.x} y={cursorPos.y} visible={cursorInGrid && !drag.isDragging} />
        {hours.map((hour) => (
          <div key={hour.toISOString()} className={Styles.hourRow}>
            <div className={Styles.timeGutter}>
              <span className={Styles.timeLabel}>{format(hour, "h a")}</span>
            </div>
            {weekDays.map((day) => {
              const cellTime = setHours(day, hour.getHours());
              const cellEndTime = addHours(cellTime, 1);
              const dayEvents = getTimedEvents(day).filter(
                (e) => new Date(e.startTime).getHours() === hour.getHours()
              );
              const inSelection = drag.isInSelection(cellTime);
              return (
                <div
                  key={day.toISOString()}
                  className={`${Styles.hourCell} ${isToday(day) ? Styles.todayCol : ""} ${inSelection ? Styles.dragSelected : ""}`}
                  onMouseDown={(e) => { e.preventDefault(); drag.handleMouseDown(cellTime); }}
                  onMouseEnter={() => drag.handleMouseEnter(cellEndTime)}
                  onMouseUp={() => drag.handleMouseUp(cellEndTime)}
                >
                  {dayEvents.map((event) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      onClick={() => onEventClick(event)}
                    />
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

export default WeekGrid;
