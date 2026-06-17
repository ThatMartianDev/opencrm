import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { buildGoogleGmailAuthUrl, generateOAuthState } from "@/lib/auth/google";
import { getSessionClaims } from "@/lib/auth/session";

export async function GET() {
  let session;
  try {
    session = await getSessionClaims();
  } catch {
    return NextResponse.redirect(
      new URL("/login", process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000")
    );
  }

  const state = generateOAuthState();

  const cookieStore = await cookies();
  cookieStore.set("gmail_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 10,
    path: "/",
  });

  cookieStore.set("gmail_oauth_org", session.organizationId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 10,
    path: "/",
  });

  const url = buildGoogleGmailAuthUrl(state);
  return NextResponse.redirect(url);
}
