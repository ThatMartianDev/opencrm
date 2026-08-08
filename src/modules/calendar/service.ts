import { prisma } from "@/lib/db/client";
import { Prisma } from "@/generated/prisma/client";
import { refreshAccessToken } from "@/lib/auth/google";
import { assertCrmLinksBelongToOrganization } from "@/lib/dal/crm-links";

const GOOGLE_CALENDAR_API = "https://www.googleapis.com/calendar/v3";

type GoogleCalendarConferenceData = {
  entryPoints?: Array<{
    entryPointType?: string;
    uri?: string;
  }>;
};

type GoogleCalendarEvent = {
  id: string;
  summary?: string;
  description?: string;
  location?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  status?: string;
  htmlLink?: string;
  hangoutLink?: string;
  conferenceData?: GoogleCalendarConferenceData;
  attendees?: Array<{
    email: string;
    displayName?: string;
    responseStatus?: string;
  }>;
};

type GoogleCalendarListResponse = {
  items: GoogleCalendarEvent[];
  nextSyncToken?: string;
  nextPageToken?: string;
};

function isInvalidGrantRefreshError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  const normalizedMessage = error.message.toLowerCase();
  return (
    normalizedMessage.includes("invalid_grant") ||
    normalizedMessage.includes("token has been expired or revoked")
  );
}

function extractMeetingLink(event: Pick<GoogleCalendarEvent, "hangoutLink" | "conferenceData">): string | null {
  if (event.hangoutLink?.trim()) {
    return event.hangoutLink.trim();
  }

  const videoEntry = event.conferenceData?.entryPoints?.find(
    (entry) => entry.entryPointType === "video" && !!entry.uri?.trim()
  );

  return videoEntry?.uri?.trim() || null;
}

function mergeMeetingLinkIntoDescription(
  description: string | null | undefined,
  meetingLink: string | null | undefined
): string | null {
  const normalizedDescription = description?.trim() || "";
  const normalizedMeetingLink = meetingLink?.trim() || "";

  if (!normalizedMeetingLink) {
    return normalizedDescription || null;
  }

  if (normalizedDescription.includes(normalizedMeetingLink)) {
    return normalizedDescription;
  }

  const meetingLine = `Meeting link: ${normalizedMeetingLink}`;

  return normalizedDescription
    ? `${normalizedDescription}\n\n${meetingLine}`
    : meetingLine;
}

/**
 * Get a valid access token for the user's calendar account.
 * Refreshes automatically if expired.
 */
async function getValidAccessToken(
  userId: string,
  organizationId: string,
): Promise<{ accessToken: string; accountId: string } | null> {
  const account = await prisma.account.findFirst({
    where: { userId, organizationId, provider: "google_calendar" },
  });

  if (!account || !account.refreshToken) return null;

  // If token is expired or about to expire (5 min buffer)
  const isExpired = !account.tokenExpiresAt || account.tokenExpiresAt < new Date(Date.now() + 5 * 60 * 1000);

  if (isExpired) {
    try {
      const tokens = await refreshAccessToken(account.refreshToken);
      const newExpiresAt = new Date(Date.now() + tokens.expires_in * 1000);

      await prisma.account.update({
        where: { id: account.id },
        data: {
          accessToken: tokens.access_token,
          tokenExpiresAt: newExpiresAt,
          ...(tokens.refresh_token ? { refreshToken: tokens.refresh_token } : {}),
        },
      });

      return { accessToken: tokens.access_token, accountId: account.id };
    } catch (error) {
      if (isInvalidGrantRefreshError(error)) {
        // Google rejected the refresh token. Force reconnect by clearing token fields.
        await prisma.account.update({
          where: { id: account.id },
          data: {
            accessToken: null,
            refreshToken: null,
            tokenExpiresAt: null,
            syncToken: null,
          },
        });

        throw new Error("Google Calendar authorization expired. Please reconnect your Google Calendar.");
      }

      throw error;
    }
  }

  if (!account.accessToken) return null;

  return { accessToken: account.accessToken, accountId: account.id };
}

/**
 * Check if a user has Google Calendar connected
 */
export async function isCalendarConnected(
  userId: string,
  organizationId: string,
): Promise<boolean> {
  const account = await prisma.account.findFirst({
    where: { userId, organizationId, provider: "google_calendar" },
    select: { refreshToken: true },
  });
  return !!account?.refreshToken;
}

/**
 * Disconnect Google Calendar - revokes token and removes account + cached events
 */
export async function disconnectCalendar(userId: string, organizationId: string): Promise<void> {
  const account = await prisma.account.findFirst({
    where: { userId, organizationId, provider: "google_calendar" },
  });

  if (!account) return;

  // Revoke the token at Google
  if (account.refreshToken) {
    const { revokeGoogleToken } = await import("@/lib/auth/google");
    await revokeGoogleToken(account.refreshToken).catch(() => {
      // Best effort - token may already be invalid
    });
  }

  // Delete cached calendar events for this user in the org
  await prisma.calendarEvent.deleteMany({
    where: { userId, organizationId },
  });

  // Delete the account row
  await prisma.account.delete({ where: { id: account.id } });
}

/**
 * Sync calendar events from Google Calendar API.
 * Uses incremental sync (syncToken) when available.
 */
export async function syncCalendarEvents(
  userId: string,
  organizationId: string,
  options?: { forceFullSync?: boolean; timeMin?: Date; timeMax?: Date }
): Promise<{ synced: number; errors: number }> {
  const tokenResult = await getValidAccessToken(userId, organizationId);
  if (!tokenResult) {
    throw new Error("Google Calendar not connected");
  }

  const { accessToken, accountId } = tokenResult;

  // Get the stored sync token for incremental sync
  const account = await prisma.account.findUnique({ where: { id: accountId } });
  const syncToken = options?.forceFullSync ? null : account?.syncToken;

  let allEvents: GoogleCalendarEvent[] = [];
  let newSyncToken: string | undefined;
  let pageToken: string | undefined;

  try {
    do {
      const params = new URLSearchParams({
        maxResults: "250",
        singleEvents: "true",
        orderBy: "startTime",
        conferenceDataVersion: "1",
      });

      if (syncToken) {
        params.set("syncToken", syncToken);
      } else {
        // Full sync: get events from 3 months ago to 6 months ahead
        const timeMin = options?.timeMin || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
        const timeMax = options?.timeMax || new Date(Date.now() + 180 * 24 * 60 * 60 * 1000);
        params.set("timeMin", timeMin.toISOString());
        params.set("timeMax", timeMax.toISOString());
      }

      if (pageToken) {
        params.set("pageToken", pageToken);
      }

      const response = await fetch(
        `${GOOGLE_CALENDAR_API}/calendars/primary/events?${params.toString()}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      if (response.status === 410) {
        // Sync token expired — full sync needed
        return syncCalendarEvents(userId, organizationId, { forceFullSync: true });
      }

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Google Calendar API error: ${response.status} ${error}`);
      }

      const data: GoogleCalendarListResponse = await response.json();
      allEvents = allEvents.concat(data.items || []);
      newSyncToken = data.nextSyncToken;
      pageToken = data.nextPageToken;
    } while (pageToken);
  } catch (err) {
    throw err;
  }

  // Process events
  let synced = 0;
  let errors = 0;

  for (const event of allEvents) {
    try {
      if (!event.id) continue;

      // Handle cancelled events
      if (event.status === "cancelled") {
        await prisma.calendarEvent.deleteMany({
          where: { userId, organizationId, googleEventId: event.id },
        });
        synced++;
        continue;
      }

      const startTime = event.start?.dateTime
        ? new Date(event.start.dateTime)
        : event.start?.date
        ? new Date(event.start.date)
        : null;

      const endTime = event.end?.dateTime
        ? new Date(event.end.dateTime)
        : event.end?.date
        ? new Date(event.end.date)
        : null;

      if (!startTime || !endTime) continue;

      const allDay = !event.start?.dateTime;
      const descriptionWithMeetingLink = mergeMeetingLinkIntoDescription(
        event.description || null,
        extractMeetingLink(event)
      );

      await prisma.calendarEvent.upsert({
        where: {
          userId_organizationId_googleEventId: {
            userId,
            organizationId,
            googleEventId: event.id,
          },
        },
        update: {
          title: event.summary || "(No title)",
          description: descriptionWithMeetingLink,
          location: event.location || null,
          startTime,
          endTime,
          allDay,
          status: event.status || null,
          htmlLink: event.htmlLink || null,
          attendees: event.attendees ?? Prisma.JsonNull,
          syncedAt: new Date(),
        },
        create: {
          googleEventId: event.id,
          userId,
          organizationId,
          title: event.summary || "(No title)",
          description: descriptionWithMeetingLink,
          location: event.location || null,
          startTime,
          endTime,
          allDay,
          status: event.status || null,
          htmlLink: event.htmlLink || null,
          attendees: event.attendees ?? Prisma.JsonNull,
        },
      });

      synced++;
    } catch (err) {
      console.error(`Failed to sync event ${event.id}:`, err);
      errors++;
    }
  }

  // Store the new sync token
  if (newSyncToken) {
    await prisma.account.update({
      where: { id: accountId },
      data: { syncToken: newSyncToken },
    });
  }

  // Run auto-linking after sync
  await autoLinkCalendarEvents(userId, organizationId);

  return { synced, errors };
}

/**
 * Create a calendar event in Google Calendar and store locally
 */
export async function createCalendarEvent(
  userId: string,
  organizationId: string,
  event: {
    title: string;
    description?: string;
    location?: string;
    meetingLink?: string;
    autoGoogleMeet?: boolean;
    startTime: Date;
    endTime: Date;
    allDay?: boolean;
    attendees?: Array<{ email: string }>;
    dealId?: string;
    contactId?: string;
    companyId?: string;
  }
): Promise<string> {
  await assertCrmLinksBelongToOrganization(organizationId, event);

  const tokenResult = await getValidAccessToken(userId, organizationId);
  if (!tokenResult) throw new Error("Google Calendar not connected");

  const { accessToken } = tokenResult;
  const manualMeetingLink = event.location?.trim() || null;
  const shouldAutoCreateGoogleMeet = !!event.autoGoogleMeet && !event.allDay && !manualMeetingLink;
  const descriptionWithManualMeetingLink = mergeMeetingLinkIntoDescription(event.description, manualMeetingLink);

  const body: Record<string, unknown> = {
    summary: event.title,
    description: descriptionWithManualMeetingLink,
    location: event.location,
  };

  if (event.allDay) {
    const startDateStr = event.startTime.toISOString().split("T")[0];
    // Google Calendar all-day events use exclusive end date (add 1 day)
    const endDate = new Date(event.endTime);
    endDate.setDate(endDate.getDate() + 1);
    const endDateStr = endDate.toISOString().split("T")[0];
    body.start = { date: startDateStr };
    body.end = { date: endDateStr };
  } else {
    // Ensure end is after start
    const end = event.endTime > event.startTime
      ? event.endTime
      : new Date(event.startTime.getTime() + 60 * 60 * 1000); // default 1hr
    body.start = { dateTime: event.startTime.toISOString() };
    body.end = { dateTime: end.toISOString() };
  }

  if (event.attendees?.length) {
    body.attendees = event.attendees.map((a) => ({ email: a.email }));
  }

  if (shouldAutoCreateGoogleMeet) {
    body.conferenceData = {
      createRequest: {
        requestId: crypto.randomUUID(),
        conferenceSolutionKey: { type: "hangoutsMeet" },
      },
    };
  }

  const createEventEndpoint = shouldAutoCreateGoogleMeet
    ? `${GOOGLE_CALENDAR_API}/calendars/primary/events?conferenceDataVersion=1`
    : `${GOOGLE_CALENDAR_API}/calendars/primary/events`;

  const response = await fetch(createEventEndpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create calendar event: ${error}`);
  }

  const created: GoogleCalendarEvent = await response.json();
  const resolvedMeetingLink = extractMeetingLink(created) || manualMeetingLink;
  const descriptionWithMeetingLink = mergeMeetingLinkIntoDescription(
    created.description || descriptionWithManualMeetingLink,
    resolvedMeetingLink
  );

  // Store locally with CRM links
  const calendarEvent = await prisma.calendarEvent.create({
    data: {
      googleEventId: created.id,
      userId,
      organizationId,
      title: created.summary || event.title,
      description: descriptionWithMeetingLink,
      location: created.location || event.location || null,
      startTime: event.startTime,
      endTime: event.endTime,
      allDay: event.allDay || false,
      status: created.status || "confirmed",
      htmlLink: created.htmlLink || null,
      attendees: created.attendees ?? Prisma.JsonNull,
      dealId: event.dealId || null,
      contactId: event.contactId || null,
      companyId: event.companyId || null,
    },
  });

  return calendarEvent.id;
}

/**
 * Update a calendar event in Google Calendar and locally
 */
export async function updateCalendarEvent(
  eventId: string,
  userId: string,
  organizationId: string,
  data: {
    title: string;
    description?: string;
    location?: string;
    autoGoogleMeet?: boolean;
    startTime: Date;
    endTime: Date;
    allDay?: boolean;
    attendees?: Array<{ email: string }>;
    contactId?: string;
    companyId?: string;
  }
): Promise<void> {
  const calendarEvent = await prisma.calendarEvent.findFirst({
    where: { id: eventId, userId, organizationId },
  });
  if (!calendarEvent) throw new Error("Event not found");

  await assertCrmLinksBelongToOrganization(organizationId, data);

  const tokenResult = await getValidAccessToken(userId, organizationId);
  if (!tokenResult) throw new Error("Google Calendar not connected");

  const { accessToken } = tokenResult;
  const manualMeetingLink = data.location?.trim() || null;
  const shouldAutoCreateGoogleMeet = !!data.autoGoogleMeet && !data.allDay && !manualMeetingLink;
  const descriptionWithManualMeetingLink = mergeMeetingLinkIntoDescription(data.description, manualMeetingLink);

  const body: Record<string, unknown> = {
    summary: data.title,
    description: descriptionWithManualMeetingLink,
    location: data.location,
  };

  if (data.allDay) {
    const startDateStr = data.startTime.toISOString().split("T")[0];
    const endDate = new Date(data.endTime);
    endDate.setDate(endDate.getDate() + 1);
    const endDateStr = endDate.toISOString().split("T")[0];
    body.start = { date: startDateStr };
    body.end = { date: endDateStr };
  } else {
    const end = data.endTime > data.startTime
      ? data.endTime
      : new Date(data.startTime.getTime() + 60 * 60 * 1000);
    body.start = { dateTime: data.startTime.toISOString() };
    body.end = { dateTime: end.toISOString() };
  }

  if (data.attendees?.length) {
    body.attendees = data.attendees.map((a) => ({ email: a.email }));
  }

  if (shouldAutoCreateGoogleMeet) {
    body.conferenceData = {
      createRequest: {
        requestId: crypto.randomUUID(),
        conferenceSolutionKey: { type: "hangoutsMeet" },
      },
    };
  }

  const updateEventEndpoint = shouldAutoCreateGoogleMeet
    ? `${GOOGLE_CALENDAR_API}/calendars/primary/events/${calendarEvent.googleEventId}?conferenceDataVersion=1`
    : `${GOOGLE_CALENDAR_API}/calendars/primary/events/${calendarEvent.googleEventId}`;

  const response = await fetch(
    updateEventEndpoint,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to update calendar event: ${error}`);
  }

  const updated: GoogleCalendarEvent = await response.json();
  const resolvedMeetingLink = extractMeetingLink(updated) || manualMeetingLink;
  const descriptionWithMeetingLink = mergeMeetingLinkIntoDescription(
    updated.description || descriptionWithManualMeetingLink,
    resolvedMeetingLink
  );

  await prisma.calendarEvent.update({
    where: { id: eventId, userId, organizationId },
    data: {
      title: updated.summary || data.title,
      description: descriptionWithMeetingLink,
      location: updated.location || data.location || null,
      startTime: data.startTime,
      endTime: data.endTime,
      allDay: data.allDay || false,
      status: updated.status || "confirmed",
      htmlLink: updated.htmlLink || null,
      attendees: updated.attendees ?? Prisma.JsonNull,
      contactId: data.contactId || null,
      companyId: data.companyId || null,
      syncedAt: new Date(),
    },
  });
}

/**
 * Delete a calendar event from Google Calendar and locally
 */
export async function deleteCalendarEvent(
  eventId: string,
  userId: string,
  organizationId: string,
): Promise<void> {
  const calendarEvent = await prisma.calendarEvent.findFirst({
    where: { id: eventId, userId, organizationId },
  });
  if (!calendarEvent) throw new Error("Event not found");

  const tokenResult = await getValidAccessToken(userId, organizationId);
  if (!tokenResult) throw new Error("Google Calendar not connected");

  const { accessToken } = tokenResult;

  const response = await fetch(
    `${GOOGLE_CALENDAR_API}/calendars/primary/events/${calendarEvent.googleEventId}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  // 204 = success, 410 = already deleted
  if (!response.ok && response.status !== 410) {
    const error = await response.text();
    throw new Error(`Failed to delete calendar event: ${error}`);
  }

  await prisma.calendarEvent.delete({
    where: { id: eventId, userId, organizationId },
  });
}

/**
 * Get calendar events for display in the calendar page
 */
export async function getCalendarEvents(
  userId: string,
  organizationId: string,
  options: { start: Date; end: Date }
) {
  return prisma.calendarEvent.findMany({
    where: {
      userId,
      organizationId,
      AND: [
        { startTime: { lt: options.end } },
        { endTime: { gt: options.start } },
      ],
    },
    include: {
      deal: { select: { id: true, title: true, stage: true } },
      contact: { select: { id: true, name: true, email: true } },
      company: { select: { id: true, name: true } },
    },
    orderBy: { startTime: "asc" },
  });
}

/**
 * Link a calendar event to a CRM entity
 */
export async function linkCalendarEvent(
  eventId: string,
  userId: string,
  organizationId: string,
  link: { dealId?: string; contactId?: string; companyId?: string }
) {
  await assertCrmLinksBelongToOrganization(organizationId, link);

  return prisma.calendarEvent.update({
    where: { id: eventId, userId, organizationId },
    data: {
      dealId: link.dealId ?? undefined,
      contactId: link.contactId ?? undefined,
      companyId: link.companyId ?? undefined,
    },
  });
}

/**
 * Unlink a calendar event from CRM entities
 */
export async function unlinkCalendarEvent(
  eventId: string,
  userId: string,
  organizationId: string,
  unlink: { deal?: boolean; contact?: boolean; company?: boolean }
) {
  return prisma.calendarEvent.update({
    where: { id: eventId, userId, organizationId },
    data: {
      ...(unlink.deal ? { dealId: null } : {}),
      ...(unlink.contact ? { contactId: null } : {}),
      ...(unlink.company ? { companyId: null } : {}),
    },
  });
}

/**
 * Auto-link calendar events to CRM entities based on attendee emails
 */
async function autoLinkCalendarEvents(userId: string, organizationId: string): Promise<void> {
  // Get unlinked events that have attendees
  const unlinkedEvents = await prisma.calendarEvent.findMany({
    where: {
      userId,
      organizationId,
      dealId: null,
      contactId: null,
      companyId: null,
      attendees: { not: Prisma.AnyNull },
    },
  });

  if (unlinkedEvents.length === 0) return;

  // Get all contacts and companies for this org
  const [contacts, companies] = await Promise.all([
    prisma.contact.findMany({
      where: { organizationId, deletedAt: null, email: { not: null } },
      select: { id: true, email: true, companyId: true },
    }),
    prisma.company.findMany({
      where: { organizationId, deletedAt: null, email: { not: null } },
      select: { id: true, email: true },
    }),
  ]);

  // Build lookup maps
  const contactByEmail = new Map<string, { id: string; companyId: string | null }>();
  for (const c of contacts) {
    if (c.email) contactByEmail.set(c.email.toLowerCase(), { id: c.id, companyId: c.companyId });
  }

  const companyByDomain = new Map<string, string>();
  for (const c of companies) {
    if (c.email) {
      const domain = c.email.split("@")[1]?.toLowerCase();
      if (domain) companyByDomain.set(domain, c.id);
    }
  }

  // Process each unlinked event
  for (const event of unlinkedEvents) {
    const attendees = event.attendees as Array<{ email: string }> | null;
    if (!attendees || attendees.length === 0) continue;

    let contactId: string | null = null;
    let companyId: string | null = null;

    for (const attendee of attendees) {
      if (!attendee.email) continue;
      const email = attendee.email.toLowerCase();

      // Match by exact contact email
      const contactMatch = contactByEmail.get(email);
      if (contactMatch) {
        contactId = contactMatch.id;
        companyId = contactMatch.companyId;
        break;
      }

      // Match by company domain
      const domain = email.split("@")[1];
      if (domain) {
        const companyMatch = companyByDomain.get(domain);
        if (companyMatch) {
          companyId = companyMatch;
        }
      }
    }

    if (contactId || companyId) {
      // Also try to find a related deal
      let dealId: string | null = null;
      if (contactId) {
        const deal = await prisma.deal.findFirst({
          where: { organizationId, contactId, deletedAt: null, stage: { notIn: ["WON", "LOST"] } },
          orderBy: { updatedAt: "desc" },
          select: { id: true },
        });
        if (deal) dealId = deal.id;
      } else if (companyId) {
        const deal = await prisma.deal.findFirst({
          where: { organizationId, companyId, deletedAt: null, stage: { notIn: ["WON", "LOST"] } },
          orderBy: { updatedAt: "desc" },
          select: { id: true },
        });
        if (deal) dealId = deal.id;
      }

      await prisma.calendarEvent.update({
        where: { id: event.id },
        data: { contactId, companyId, dealId },
      });
    }
  }
}
