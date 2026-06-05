import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { buildGoogleCalendarAuthUrl, generateOAuthState } from "@/lib/auth/google";
import { getSessionClaims } from "@/lib/auth/session";

export async function GET() {
  // Ensure the user is logged in
  let session;
  try {
    session = await getSessionClaims();
  } catch {
    return NextResponse.redirect(new URL("/login", process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"));
  }

  const state = generateOAuthState();

  const cookieStore = await cookies();
  cookieStore.set("calendar_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 10,
    path: "/",
  });

  // Store org context so we know where to redirect after
  cookieStore.set("calendar_oauth_org", session.organizationId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 10,
    path: "/",
  });

  const url = buildGoogleCalendarAuthUrl(state);
  return NextResponse.redirect(url);
}
