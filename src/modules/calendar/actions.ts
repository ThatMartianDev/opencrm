"use server";

import { getSessionClaims } from "@/lib/auth/session";
import {
  syncCalendarEvents,
  getCalendarEvents,
  createCalendarEvent,
  linkCalendarEvent,
  unlinkCalendarEvent,
  disconnectCalendar,
  isCalendarConnected,
} from "./service";

export async function checkCalendarConnection() {
  const session = await getSessionClaims();
  const connected = await isCalendarConnected(session.userId);
  return { connected };
}

export async function syncCalendar() {
  const session = await getSessionClaims();
  try {
    const result = await syncCalendarEvents(session.userId, session.organizationId);
    return { success: true, ...result };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Sync failed";
    return { success: false, error: message, synced: 0, errors: 0 };
  }
}

export async function fetchCalendarEvents(start: string, end: string) {
  const session = await getSessionClaims();
  const events = await getCalendarEvents(session.userId, session.organizationId, {
    start: new Date(start),
    end: new Date(end),
  });
  return events;
}

export async function createEvent(data: {
  title: string;
  description?: string;
  location?: string;
  startTime: string;
  endTime: string;
  allDay?: boolean;
  attendees?: Array<{ email: string }>;
  dealId?: string;
  contactId?: string;
  companyId?: string;
}) {
  const session = await getSessionClaims();
  try {
    const eventId = await createCalendarEvent(session.userId, session.organizationId, {
      ...data,
      startTime: new Date(data.startTime),
      endTime: new Date(data.endTime),
    });
    return { success: true, eventId };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create event";
    return { success: false, error: message };
  }
}

export async function linkEvent(
  eventId: string,
  link: { dealId?: string; contactId?: string; companyId?: string }
) {
  const session = await getSessionClaims();
  try {
    await linkCalendarEvent(eventId, session.userId, link);
    return { success: true };
  } catch {
    return { success: false, error: "Failed to link event" };
  }
}

export async function unlinkEvent(
  eventId: string,
  unlink: { deal?: boolean; contact?: boolean; company?: boolean }
) {
  const session = await getSessionClaims();
  try {
    await unlinkCalendarEvent(eventId, session.userId, unlink);
    return { success: true };
  } catch {
    return { success: false, error: "Failed to unlink event" };
  }
}

export async function disconnectGoogleCalendar() {
  const session = await getSessionClaims();
  try {
    await disconnectCalendar(session.userId, session.organizationId);
    return { success: true };
  } catch {
    return { success: false, error: "Failed to disconnect calendar" };
  }
}
