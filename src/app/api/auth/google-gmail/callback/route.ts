import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { exchangeGmailCodeForTokens } from "@/lib/auth/google";
import { getSessionClaims } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import { getProvider } from "@/modules/emails/providers";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const cookieStore = await cookies();
  const storedState = cookieStore.get("gmail_oauth_state")?.value;
  const organizationId = cookieStore.get("gmail_oauth_org")?.value;
  cookieStore.delete("gmail_oauth_state");
  cookieStore.delete("gmail_oauth_org");

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const redirectBase = `/app/${organizationId}/mailbox`;

  if (error) {
    return NextResponse.redirect(new URL(`${redirectBase}?error=gmail_denied`, baseUrl));
  }

  if (!code || !state) {
    return NextResponse.redirect(new URL(`${redirectBase}?error=gmail_invalid`, baseUrl));
  }

  if (!storedState || storedState !== state) {
    return NextResponse.redirect(
      new URL(`${redirectBase}?error=gmail_state_mismatch`, baseUrl)
    );
  }

  let session;
  try {
    session = await getSessionClaims();
  } catch {
    return NextResponse.redirect(new URL("/login", baseUrl));
  }

  try {
    const tokens = await exchangeGmailCodeForTokens(code);
    const tokenExpiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    // Fetch the Gmail address to use as providerAccountId
    const gmailProvider = getProvider("google_gmail");
    const accountEmail = await gmailProvider.getAccountEmail(tokens.access_token);

    await prisma.account.upsert({
      where: {
        userId_provider_providerAccountId: {
          userId: session.userId,
          provider: "google_gmail",
          providerAccountId: accountEmail,
        },
      },
      update: {
        accessToken: tokens.access_token,
        ...(tokens.refresh_token ? { refreshToken: tokens.refresh_token } : {}),
        tokenExpiresAt,
        scope: tokens.scope,
        syncToken: null, // reset so next sync is a full sync
      },
      create: {
        userId: session.userId,
        provider: "google_gmail",
        providerAccountId: accountEmail,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token ?? null,
        tokenExpiresAt,
        scope: tokens.scope,
      },
    });

    return NextResponse.redirect(
      new URL(`${redirectBase}?connected=true&firstSync=true`, baseUrl)
    );
  } catch (err) {
    console.error("Google Gmail OAuth error:", err);
    return NextResponse.redirect(
      new URL(`${redirectBase}?error=gmail_exchange_failed`, baseUrl)
    );
  }
}
