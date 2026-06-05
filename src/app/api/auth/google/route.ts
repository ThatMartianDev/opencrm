import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { buildGoogleAuthUrl, generateOAuthState } from "@/lib/auth/google";

export async function GET() {
  const state = generateOAuthState();

  // Store state in a cookie to verify on callback
  (await cookies()).set("oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 10, // 10 minutes
    path: "/",
  });

  const url = buildGoogleAuthUrl(state);
  return NextResponse.redirect(url);
}
