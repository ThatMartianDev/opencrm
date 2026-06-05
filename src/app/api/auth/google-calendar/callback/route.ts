import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { exchangeCalendarCodeForTokens, getGoogleUser, refreshAccessToken } from "@/lib/auth/google";
import { getSessionClaims } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const cookieStore = await cookies();
  const storedState = cookieStore.get("calendar_oauth_state")?.value;
  const organizationId = cookieStore.get("calendar_oauth_org")?.value;
  cookieStore.delete("calendar_oauth_state");
  cookieStore.delete("calendar_oauth_org");

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  // Handle user denying access
  if (error) {
    return NextResponse.redirect(
      new URL(`/app/${organizationId}/calendar?error=calendar_denied`, baseUrl)
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      new URL(`/app/${organizationId}/calendar?error=calendar_invalid`, baseUrl)
    );
  }

  // Verify state matches
  if (!storedState || storedState !== state) {
    return NextResponse.redirect(
      new URL(`/app/${organizationId}/calendar?error=calendar_state_mismatch`, baseUrl)
    );
  }

  // Ensure user is logged in
  let session;
  try {
    session = await getSessionClaims();
  } catch {
    return NextResponse.redirect(new URL("/login", baseUrl));
  }

  try {
    // Exchange code for tokens
    const tokens = await exchangeCalendarCodeForTokens(code);

    // We need the user's Google ID for the providerAccountId.
    // Get it from the existing google account row, or fetch userinfo with a separate call.
    const existingGoogleAccount = await prisma.account.findFirst({
      where: { userId: session.userId, provider: "google" },
    });

    let providerAccountId: string;
    if (existingGoogleAccount) {
      providerAccountId = existingGoogleAccount.providerAccountId;
    } else {
      // If no google login account exists, use the user's email as identifier
      providerAccountId = session.userId;
    }

    const tokenExpiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    // Upsert the google_calendar account row
    await prisma.account.upsert({
      where: {
        provider_providerAccountId: {
          provider: "google_calendar",
          providerAccountId,
        },
      },
      update: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || undefined,
        tokenExpiresAt,
        scope: tokens.scope,
      },
      create: {
        userId: session.userId,
        provider: "google_calendar",
        providerAccountId,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || undefined,
        tokenExpiresAt,
        scope: tokens.scope,
      },
    });

    return NextResponse.redirect(
      new URL(`/app/${organizationId}/calendar?connected=true`, baseUrl)
    );
  } catch (err) {
    console.error("Google Calendar OAuth error:", err);
    return NextResponse.redirect(
      new URL(`/app/${organizationId}/calendar?error=calendar_exchange_failed`, baseUrl)
    );
  }
}
