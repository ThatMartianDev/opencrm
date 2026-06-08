"use client";

import { ChevronDownFilled, ChevronLeftFilled, ChevronRightFilled, ChevronUpFilled } from "@fluentui/react-icons";
import { createPortal } from "react-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import Styles from "./DateTimePicker.module.css";
import MainButton from "@/components/micro/MainButton/MainButton";

type DateTimePickerProps = {
  category: "date" | "time" | "datetime";
  dataType: {
    date?: "range" | "single";
    time?: "range" | "single";
    datetime?: "range" | "single";
  };
  triggerRect: DOMRect;
  onClose: () => void;
  initialStart?: Date;
  initialEnd?: Date;
  onChange: (value: { start: Date; end?: Date }) => void;
};

type Position = {
  top: number;
  left: number;
};

type ClockTime = {
  hours24: number;
  minutes: number;
};

const WEEK_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function clamp(num: number, min: number, max: number) {
  return Math.max(min, Math.min(max, num));
}

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function to12Hour(hours24: number) {
  const period: "AM" | "PM" = hours24 >= 12 ? "PM" : "AM";
  const hour12 = ((hours24 + 11) % 12) + 1;
  return { period, hour12 };
}

function to24Hour(hour12: number, period: "AM" | "PM") {
  if (period === "AM") {
    return hour12 === 12 ? 0 : hour12;
  }
  return hour12 === 12 ? 12 : hour12 + 12;
}

function computePosition(
  triggerRect: DOMRect,
  popoverHeight: number,
  popoverWidth: number,
): Position {
  const gap = 8;
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  let left = triggerRect.left;
  left = Math.max(8, Math.min(left, vw - popoverWidth - 8));

  const spaceBelow = vh - triggerRect.bottom - gap;
  const spaceAbove = triggerRect.top - gap;

  let top = triggerRect.bottom + gap;
  if (spaceBelow < popoverHeight && spaceAbove > spaceBelow) {
    top = Math.max(8, triggerRect.top - popoverHeight - gap);
  }

  return { top, left };
}

function addMinutesSameDay(time: ClockTime, amount: number): ClockTime {
  const total = (time.hours24 * 60 + time.minutes + amount) % (24 * 60);
  const normalized = total < 0 ? total + 24 * 60 : total;
  return {
    hours24: Math.floor(normalized / 60),
    minutes: normalized % 60,
  };
}

const DatePicker = ({
  id,
  selectedDate,
  onSelect,
}: {
  id: string;
  selectedDate: Date | null;
  onSelect: (date: Date) => void;
}) => {
  const seedDate = selectedDate ?? new Date();
  const [currentMonth, setCurrentMonth] = useState(seedDate.getMonth());
  const [currentYear, setCurrentYear] = useState(seedDate.getFullYear());

  useEffect(() => {
    if (!selectedDate) return;
    setCurrentMonth(selectedDate.getMonth());
    setCurrentYear(selectedDate.getFullYear());
  }, [selectedDate]);

  const years = useMemo(
    () => Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - i),
    [],
  );

  const moveMonth = (offset: number) => {
    const next = new Date(currentYear, currentMonth + offset, 1);
    setCurrentYear(next.getFullYear());
    setCurrentMonth(next.getMonth());
  };

  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();
  const today = new Date();

  const cells: Array<{
    key: string;
    day: number;
    date: Date;
    isOtherMonth: boolean;
  }> = [];

  for (let i = firstDay - 1; i >= 0; i -= 1) {
    const day = daysInPrevMonth - i;
    cells.push({
      key: `prev-${day}`,
      day,
      date: new Date(currentYear, currentMonth - 1, day),
      isOtherMonth: true,
    });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({
      key: `curr-${day}`,
      day,
      date: new Date(currentYear, currentMonth, day),
      isOtherMonth: false,
    });
  }

  const trailing = (7 - (cells.length % 7)) % 7;
  for (let day = 1; day <= trailing; day += 1) {
    cells.push({
      key: `next-${day}`,
      day,
      date: new Date(currentYear, currentMonth + 1, day),
      isOtherMonth: true,
    });
  }

  return (
    <div className={Styles.datePicker}>
      <div className={Styles.datePickerHeader}>
        <button
          type="button"
          className={Styles.nav_btn}
          onClick={() => moveMonth(-1)}
        >
          <ChevronLeftFilled fontSize={16} />
        </button>
        <select
          name={`month_${id}`}
          id={`month_${id}`}
          value={currentMonth}
          onChange={(e) => setCurrentMonth(Number(e.target.value))}
        >
          {Array.from({ length: 12 }, (_, i) => (
            <option key={i} value={i}>
              {new Date(0, i).toLocaleString("default", { month: "long" })}
            </option>
          ))}
        </select>
        <select
          name={`year_${id}`}
          id={`year_${id}`}
          value={currentYear}
          onChange={(e) => setCurrentYear(Number(e.target.value))}
        >
          {years.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
        <button
          type="button"
          className={Styles.nav_btn}
          onClick={() => moveMonth(1)}
        >
          <ChevronRightFilled fontSize={16} />
        </button>
      </div>

      <div className={Styles.weekDays}>
        {WEEK_DAYS.map((day) => (
          <div key={day} className={Styles.weekDay}>
            {day}
          </div>
        ))}
      </div>

      <div className={Styles.dates}>
        {cells.map((cell) => {
          const isSelected =
            !cell.isOtherMonth &&
            !!selectedDate &&
            selectedDate.toDateString() === cell.date.toDateString();

          const isToday = cell.date.toDateString() === today.toDateString();
          const classes = [
            Styles.date,
            cell.isOtherMonth ? Styles.otherMonth : "",
            isSelected ? Styles.selectedDate : "",
            isToday ? Styles.today : "",
          ]
            .filter(Boolean)
            .join(" ");

          return (
            <button
              key={cell.key}
              type="button"
              disabled={cell.isOtherMonth}
              className={classes}
              onClick={() => onSelect(cell.date)}
            >
              {cell.day}
            </button>
          );
        })}
      </div>
    </div>
  );
};

const NumericSpinner = ({
  value,
  min,
  max,
  wrap,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  wrap?: boolean;
  onChange: (next: number) => void;
}) => {
  const [draft, setDraft] = useState(pad2(value));

  useEffect(() => {
    setDraft(pad2(value));
  }, [value]);

  const commit = (raw: string) => {
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) {
      setDraft(pad2(value));
      return;
    }
    onChange(clamp(parsed, min, max));
  };

  const step = (delta: number) => {
    if (wrap) {
      const size = max - min + 1;
      const normalized = (((value - min + delta) % size) + size) % size;
      onChange(min + normalized);
      return;
    }
    onChange(clamp(value + delta, min, max));
  };

  return (
    <div
      className={Styles.spinner}
      onWheel={(e) => {
        e.preventDefault();
        step(e.deltaY > 0 ? 1 : -1);
      }}
    >
      <button
        type="button"
        className={Styles.spinnerArrow}
        onClick={() => step(-1)}
      >
        <ChevronUpFilled fontSize={12} />
      </button>
      <input
        value={draft}
        inputMode="numeric"
        pattern="[0-9]*"
        className={Styles.spinnerInput}
        onChange={(e) =>
          setDraft(e.target.value.replace(/\D/g, "").slice(0, 2))
        }
        onBlur={() => commit(draft)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            commit(draft);
          }
          if (e.key === "ArrowUp") {
            e.preventDefault();
            step(-1);
          }
          if (e.key === "ArrowDown") {
            e.preventDefault();
            step(1);
          }
        }}
      />
      <button
        type="button"
        className={Styles.spinnerArrow}
        onClick={() => step(1)}
      >
        <ChevronDownFilled fontSize={12} />
      </button>
    </div>
  );
};

const TimePicker = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: ClockTime;
  onChange: (next: ClockTime) => void;
}) => {
  const { period, hour12 } = to12Hour(value.hours24);

  const updateHour12 = (nextHour12: number) => {
    onChange({
      hours24: to24Hour(nextHour12, period),
      minutes: value.minutes,
    });
  };

  const updatePeriod = (nextPeriod: "AM" | "PM") => {
    onChange({
      hours24: to24Hour(hour12, nextPeriod),
      minutes: value.minutes,
    });
  };

  return (
    <div className={Styles.timePicker}>
      <p className={Styles.timeLabel}>{label}</p>

      <div className={Styles.timePickerRow}>
        <div className={Styles.periodToggle}>
          <button
            type="button"
            className={period === "AM" ? Styles.periodActive : ""}
            onClick={() => updatePeriod("AM")}
          >
            AM
          </button>
          <button
            type="button"
            className={period === "PM" ? Styles.periodActive : ""}
            onClick={() => updatePeriod("PM")}
          >
            PM
          </button>
        </div>

        <div className={Styles.timeFields}>
          <NumericSpinner
            value={hour12}
            min={1}
            max={12}
            wrap
            onChange={updateHour12}
          />
          <span className={Styles.colon}>:</span>
          <NumericSpinner
            value={value.minutes}
            min={0}
            max={59}
            wrap
            onChange={(minutes) => onChange({ ...value, minutes })}
          />
        </div>
      </div>
    </div>
  );
};

const DateTimePicker = ({
  category,
  dataType,
  triggerRect,
  onClose,
  initialStart,
  initialEnd,
  onChange,
}: DateTimePickerProps) => {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<Position>({
    top: triggerRect.bottom + 8,
    left: triggerRect.left,
  });

  const isDateRange = category === "date" && dataType.date === "range";
  const isDatetimeSingle =
    category === "datetime" && dataType.datetime === "single";
  const showDatePanel = category === "date" || category === "datetime";
  const showTimePanel = category === "time" || isDatetimeSingle;
  const isTimeRange =
    (category === "time" && dataType.time === "range") || isDatetimeSingle;

  const [activeTab, setActiveTab] = useState<"date" | "time">(!showDatePanel && showTimePanel ? "time" : "date");

  const initialDateOnly = initialStart
    ? new Date(
        initialStart.getFullYear(),
        initialStart.getMonth(),
        initialStart.getDate(),
      )
    : new Date();

  const [selectedDate, setSelectedDate] = useState<Date | null>(
    showDatePanel ? initialDateOnly : null,
  );

  const [startTime, setStartTime] = useState<ClockTime>({
    hours24: initialStart?.getHours() ?? 9,
    minutes: initialStart?.getMinutes() ?? 0,
  });

  const [endTime, setEndTime] = useState<ClockTime>(() => {
    const fallback =
      initialEnd ??
      new Date((initialStart ?? new Date()).getTime() + 60 * 60 * 1000);
    return {
      hours24: fallback.getHours(),
      minutes: fallback.getMinutes(),
    };
  });

  useEffect(() => {
    const updatePosition = () => {
      const el = popoverRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setPosition(computePosition(triggerRect, rect.height, rect.width));
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [triggerRect]);

  const emitValue = (
    dateOverride?: Date | null,
    startOverride?: ClockTime,
    endOverride?: ClockTime,
  ) => {
    const date = dateOverride ?? selectedDate;

    if (showDatePanel && !date) {
      return;
    }

    const startClock = startOverride ?? startTime;
    const endClock = endOverride ?? endTime;

    const base = date ?? new Date();

    const start = new Date(base);
    start.setHours(startClock.hours24, startClock.minutes, 0, 0);

    if (!showTimePanel) {
      onChange({ start });
      return;
    }

    if (isTimeRange) {
      const end = new Date(base);
      end.setHours(endClock.hours24, endClock.minutes, 0, 0);
      onChange({ start, end });
      return;
    }

    onChange({ start });
  };

  const quickDateOptions = useMemo(() => {
    const base = new Date();
    const makeDate = (offsetDays: number) => {
      const d = new Date(base);
      d.setDate(base.getDate() + offsetDays);
      return new Date(d.getFullYear(), d.getMonth(), d.getDate());
    };

    return [
      { label: "Today", date: makeDate(0) },
      { label: "Tomorrow", date: makeDate(1) },
      { label: "Day After", date: makeDate(2) },
      { label: "In 3 Days", date: makeDate(3) },
      { label: "Next Week", date: makeDate(7) },
    ];
  }, []);

  const durationOptions = [15, 30, 45, 60, 90, 120];

  const slideIndex = activeTab === "date" ? 0 : 1;

  return createPortal(
    <>
      <div className={Styles.backdrop} onClick={onClose} />

      <div
        ref={popoverRef}
        className={Styles.dateTimePopover}
        style={{ top: position.top, left: position.left }}
      >
        <div className={Styles.sliderViewport}>
          <div
            className={Styles.sliderTrack}
            style={{ transform: `translateX(-${slideIndex * 100}%)` }}
          >
            <section className={Styles.tabPanel}>
              <div className={Styles.panelLayout}>
                <aside className={Styles.quickPanel}>
                  {quickDateOptions.map((item) => {
                    const selected =
                      !!selectedDate &&
                      selectedDate.toDateString() === item.date.toDateString();

                    return (
                      <button
                        key={item.label}
                        type="button"
                        className={`${Styles.quickAction} ${selected ? Styles.quickActionActive : ""}`}
                        onClick={() => {
                          setSelectedDate(item.date);
                          emitValue(item.date);
                          if (isDatetimeSingle) {
                            setActiveTab("time");
                          }
                        }}
                      >
                        <span>{item.label}</span>
                        <small>{item.date.toLocaleDateString()}</small>
                      </button>
                    );
                  })}
                </aside>

                <div className={Styles.detailPanel}>
                  {showDatePanel && (
                    <DatePicker
                      id="date-time-picker"
                      selectedDate={selectedDate}
                      onSelect={(date) => {
                        setSelectedDate(date);

                        if (isDateRange) {
                          onChange({ start: date, end: undefined });
                          return;
                        }

                        emitValue(date);

                        if (isDatetimeSingle) {
                          setActiveTab("time");
                        }
                      }}
                    />
                  )}
                </div>
              </div>
            </section>

            <section className={Styles.tabPanel}>
              <div className={Styles.panelLayout}>
                <aside className={Styles.quickPanel}>
                  {isTimeRange && (
                    <>
                      {durationOptions.map((minutes) => (
                        <button
                          key={minutes}
                          type="button"
                          className={Styles.quickAction}
                          onClick={() => {
                            const nextEnd = addMinutesSameDay(
                              startTime,
                              minutes,
                            );
                            setEndTime(nextEnd);
                            emitValue(undefined, undefined, nextEnd);
                          }}
                        >
                          <span>
                            {minutes >= 60 ? `${minutes / 60}h` : `${minutes}m`}
                          </span>
                          <small>after start</small>
                        </button>
                      ))}
                    </>
                  )}
                </aside>

                <div className={Styles.detailPanel}>
                  {showTimePanel && (
                    <div className={Styles.timePickersRow}>
                      <TimePicker
                        label={isTimeRange ? "Start" : "Time"}
                        value={startTime}
                        onChange={(next) => {
                          setStartTime(next);
                          emitValue(undefined, next);
                        }}
                      />

                      {isTimeRange && (
                        <TimePicker
                          label="End"
                          value={endTime}
                          onChange={(next) => {
                            setEndTime(next);
                            emitValue(undefined, undefined, next);
                          }}
                        />
                      )}
                    </div>
                  )}
                </div>
              </div>
            </section>
          </div>
        </div>

        <div className={Styles.popoverFooter}>
          {isDatetimeSingle && activeTab === "date" && (
            <MainButton
              type="tertiary"
              text="Set Time"
              onClick={() => {
                setActiveTab("time");
              }}
            />
          )}

          {isDatetimeSingle && activeTab === "time" && (
            <MainButton
              type="tertiary"
              text="Set Date"
              onClick={() => {
                setActiveTab("date");
              }}
            />
          )}

          <MainButton type="primary" text="Done" onClick={onClose} />
        </div>
      </div>
    </>,
    document.body,
  );
};

export default DateTimePicker;
