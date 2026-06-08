"use client";

import { useState, useCallback, useMemo } from "react";
import {
  ChevronLeftRegular,
  ChevronRightRegular,
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
  addWeeks,
  subWeeks,
} from "date-fns";

import type { CalendarEventData } from "../../CalendarPage";
import { useDragSelect, type DragSelection } from "../../hooks/useDragSelect";
import EventCard from "../EventCard/EventCard";
import WeekGrid from "./WeekGrid/WeekGrid";
import ViewModeSelector from "./ViewModeSelector/ViewModeSelector";
import CursorHint from "./CursorHint/CursorHint";
import Styles from "./CalendarGridView.module.css";

type ViewMode = "week" | "month";

type CalendarGridViewProps = {
  events: CalendarEventData[];
  currentDate: Date;
  onDateChange: (date: Date) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onEventClick: (event: CalendarEventData) => void;
  onDragSelect: (selection: DragSelection) => void;
};

const CalendarGridView = ({
  events,
  currentDate,
  onDateChange,
  viewMode,
  onViewModeChange,
  onEventClick,
  onDragSelect,
}: CalendarGridViewProps) => {
  const monthDrag = useDragSelect({ onSelect: onDragSelect });

  // Cursor hint tracking
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  const [cursorInGrid, setCursorInGrid] = useState(false);
  const [cursorOverEventCard, setCursorOverEventCard] = useState(false);

  const handleGridMouseMove = useCallback((e: React.MouseEvent) => {
    setCursorPos({ x: e.clientX, y: e.clientY });
    const target = e.target as HTMLElement | null;
    setCursorOverEventCard(
      Boolean(target?.closest('[data-calendar-event-card="true"]')),
    );
  }, []);

  // Navigation
  const goToPrev = () => {
    if (viewMode === "week") {
      onDateChange(subWeeks(currentDate, 1));
    } else {
      onDateChange(subMonths(currentDate, 1));
    }
  };

  const goToNext = () => {
    if (viewMode === "week") {
      onDateChange(addWeeks(currentDate, 1));
    } else {
      onDateChange(addMonths(currentDate, 1));
    }
  };

  const goToToday = () => onDateChange(new Date());

  // Build month grid
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const calendarDays = useMemo(
    () => eachDayOfInterval({ start: calendarStart, end: calendarEnd }),
    [calendarStart.getTime(), calendarEnd.getTime()],
  );

  const getEventsForDay = (day: Date) =>
    events.filter((e) => isSameDay(new Date(e.startTime), day));

  // Navigation title
  const navTitle =
    viewMode === "week"
      ? `${format(startOfWeek(currentDate, { weekStartsOn: 0 }), "MMM d")} – ${format(endOfWeek(currentDate, { weekStartsOn: 0 }), "MMM d")}`
      : format(currentDate, "MMMM ");
  const year = format(currentDate, "yyyy");

  return (
    <>
      <div className={Styles.calendarControls}>
        <div className={Styles.monthTitleWrapper}>
          <h3 className={Styles.monthTitle}>{navTitle}</h3>
          <i>{year}</i>
        </div>
        <div className={Styles.navButtons}>
          <button onClick={goToPrev} className={Styles.navBtn}>
            <ChevronLeftRegular />
          </button>
          <button onClick={goToToday} className={Styles.todayBtn}>
            Today
          </button>
          <button onClick={goToNext} className={Styles.navBtn}>
            <ChevronRightRegular />
          </button>
        </div>
        <div className={Styles.viewModeWrapper}>
          <ViewModeSelector value={viewMode} onChange={onViewModeChange} />
        </div>
      </div>

      {viewMode === "month" ? (
        <div
          className={Styles.calendarGrid}
          onMouseMove={handleGridMouseMove}
          onMouseEnter={() => setCursorInGrid(true)}
          onMouseLeave={() => {
            setCursorInGrid(false);
            setCursorOverEventCard(false);
            monthDrag.handleMouseLeave();
          }}
        >
          <CursorHint
            x={cursorPos.x}
            y={cursorPos.y}
            visible={
              cursorInGrid && !monthDrag.isDragging && !cursorOverEventCard
            }
          />
          {/* Day headers */}
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div key={day} className={Styles.dayHeader}>
              {day}
            </div>
          ))}

          {/* Day cells */}
          {calendarDays.map((day) => {
            const dayEvents = getEventsForDay(day);
            const inSelection = monthDrag.isInSelection(day);
            return (
              <div
                key={day.toISOString()}
                className={`${Styles.dayCell} ${
                  !isSameMonth(day, currentDate) ? Styles.otherMonth : ""
                } ${isToday(day) ? Styles.today : ""} ${inSelection ? Styles.dragSelected : ""}`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  monthDrag.handleMouseDown(day);
                }}
                onMouseEnter={() => monthDrag.handleMouseEnter(day)}
                onMouseUp={() => monthDrag.handleMouseUp(day)}
              >
                <span className={Styles.dayNumber}>{format(day, "d")}</span>
                <div className={Styles.eventList}>
                  {dayEvents.slice(0, 3).map((event) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      onClick={() => onEventClick(event)}
                    />
                  ))}
                  {dayEvents.length > 3 && (
                    <span className={Styles.moreEvents}>
                      +{dayEvents.length - 3} more
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <WeekGrid
          currentDate={currentDate}
          events={events}
          onEventClick={onEventClick}
          onDragSelect={onDragSelect}
        />
      )}
    </>
  );
};

export default CalendarGridView;
