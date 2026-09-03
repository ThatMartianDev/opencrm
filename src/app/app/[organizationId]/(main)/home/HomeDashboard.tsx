"use client";

import {
  BotSparkleRegular,
  CalendarRegular,
  CheckmarkRegular,
  ChevronRightRegular,
  ClockRegular,
  TaskListSquareLtrRegular,
} from "@fluentui/react-icons";
import { format, isToday, isTomorrow, startOfDay } from "date-fns";
import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";

import { useModal } from "@/components/macro/ModalProvider/ModalProvider";
import type { fetchCalendarEvents } from "@/modules/calendar/actions";
import { getUpcomingTasks, updateTaskStatus } from "@/modules/tasks/actions";
import { TaskStatus } from "@/generated/prisma/enums";
import { useWorkspaceData } from "@/modules/workspace/components/workspace-provider";

import Styles from "./HomeDashboard.module.css";

type HomeTask = Awaited<ReturnType<typeof getUpcomingTasks>>[number];
type CalendarEvent = Awaited<ReturnType<typeof fetchCalendarEvents>>[number];

type HomeDashboardProps = {
  initialTasks: HomeTask[];
  events: CalendarEvent[];
  calendarConnected: boolean;
};

function getGreeting(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

const subscribeToLocalTime = () => () => undefined;
const getLocalGreeting = () => getGreeting(new Date().getHours());
const getServerGreeting = () => "Welcome back";
const getLocalDate = () => format(new Date(), "EEEE, MMMM d");
const getServerDate = () => "Today";

function formatTaskDueDate(dueDate: Date | string | null) {
  if (!dueDate) return "No due date";

  const date = new Date(dueDate);
  if (isToday(date)) return "Today";
  if (isTomorrow(date)) return "Tomorrow";
  if (date < startOfDay(new Date())) return `Overdue · ${format(date, "MMM d")}`;
  return format(date, "EEE, MMM d");
}

function formatEventDate(startTime: Date | string, allDay: boolean) {
  const date = new Date(startTime);
  const day = isToday(date)
    ? "Today"
    : isTomorrow(date)
      ? "Tomorrow"
      : format(date, "EEE, MMM d");

  return allDay ? `${day} · All day` : `${day} · ${format(date, "h:mm a")}`;
}

const HomeDashboard = ({
  initialTasks,
  events,
  calendarConnected,
}: HomeDashboardProps) => {
  const [tasks, setTasks] = useState(initialTasks);
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);
  const greeting = useSyncExternalStore(
    subscribeToLocalTime,
    getLocalGreeting,
    getServerGreeting,
  );
  const dateLabel = useSyncExternalStore(
    subscribeToLocalTime,
    getLocalDate,
    getServerDate,
  );
  const { openModal } = useModal();
  const { organization, user } = useWorkspaceData();
  const workspacePath = `/app/${organization.slug}`;
  const firstName = user.name.trim().split(/\s+/)[0];
  const greetingName = firstName ? `, ${firstName}` : "";

  useEffect(() => {
    window.document.title = "Home | OpenCRM";
  }, []);

  async function completeTask(taskId: string) {
    setUpdatingTaskId(taskId);
    try {
      await updateTaskStatus(taskId, TaskStatus.COMPLETED);
      const refreshedTasks = await getUpcomingTasks(6);
      setTasks(refreshedTasks);
    } catch (error) {
      console.error("Unable to complete task", error);
    } finally {
      setUpdatingTaskId(null);
    }
  }

  return (
    <div className={Styles.page}>
      <header className={Styles.header}>
        <div>
          <p className={Styles.date}>{dateLabel}</p>
          <h1>{greeting}{greetingName}</h1>
          <p>Here&apos;s what needs your attention.</p>
        </div>
        <button
          type="button"
          className={Styles.catcherButton}
          onClick={() => openModal("quick_catcher")}
        >
          <BotSparkleRegular aria-hidden="true" />
          <span>Quick Catcher</span>
        </button>
      </header>

      <div className={Styles.dashboardGrid}>
        <section className={Styles.panel} aria-labelledby="tasks-heading">
          <div className={Styles.panelHeader}>
            <div className={Styles.panelTitle}>
              <TaskListSquareLtrRegular aria-hidden="true" />
              <h2 id="tasks-heading">Tasks</h2>
            </div>
            <Link href={`${workspacePath}/tasks`} className={Styles.viewAll}>
              View all
              <ChevronRightRegular aria-hidden="true" />
            </Link>
          </div>

          {tasks.length > 0 ? (
            <ul className={Styles.taskList}>
              {tasks.map((task) => {
                const overdue = task.dueDate
                  ? new Date(task.dueDate) < startOfDay(new Date())
                  : false;

                return (
                  <li key={task.id}>
                    <button
                      type="button"
                      className={Styles.completeButton}
                      onClick={() => completeTask(task.id)}
                      disabled={updatingTaskId === task.id}
                      aria-label={`Complete ${task.name}`}
                      title="Mark as complete"
                    >
                      <CheckmarkRegular aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className={Styles.taskDetails}
                      onClick={() => openModal("task", { id: task.id })}
                    >
                      <span className={Styles.itemTitle}>{task.name}</span>
                      <span className={overdue ? Styles.overdue : Styles.itemMeta}>
                        <ClockRegular aria-hidden="true" />
                        {formatTaskDueDate(task.dueDate)}
                        {task.deal && ` · ${task.deal.title}`}
                        {task.record && ` · ${task.record.displayName}`}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className={Styles.emptyState}>
              <CheckmarkRegular aria-hidden="true" />
              <p>You&apos;re all caught up.</p>
              <span>No open tasks need your attention.</span>
            </div>
          )}
        </section>

        <section className={Styles.panel} aria-labelledby="calendar-heading">
          <div className={Styles.panelHeader}>
            <div className={Styles.panelTitle}>
              <CalendarRegular aria-hidden="true" />
              <h2 id="calendar-heading">Upcoming</h2>
            </div>
            <Link href={`${workspacePath}/calendar`} className={Styles.viewAll}>
              View calendar
              <ChevronRightRegular aria-hidden="true" />
            </Link>
          </div>

          {!calendarConnected ? (
            <div className={Styles.emptyState}>
              <CalendarRegular aria-hidden="true" />
              <p>Connect your calendar</p>
              <span>See your next meetings alongside your work.</span>
              <Link href={`${workspacePath}/calendar`}>Connect calendar</Link>
            </div>
          ) : events.length > 0 ? (
            <ul className={Styles.eventList}>
              {events.map((event) => (
                <li key={event.id}>
                  <span className={Styles.eventMarker} aria-hidden="true" />
                  <div>
                    <span className={Styles.itemTitle}>{event.title}</span>
                    <span className={Styles.itemMeta}>
                      {formatEventDate(event.startTime, event.allDay)}
                      {event.location && ` · ${event.location}`}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className={Styles.emptyState}>
              <CalendarRegular aria-hidden="true" />
              <p>No upcoming events.</p>
              <span>Your next 30 days are clear.</span>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default HomeDashboard;