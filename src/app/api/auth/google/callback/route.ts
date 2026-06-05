import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { exchangeCodeForTokens, getGoogleUser } from "@/lib/auth/google";
import { createSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  // Handle user denying access
  if (error) {
    return NextResponse.redirect(new URL("/login?error=oauth_denied", request.url));
  }

  if (!code || !state) {
    return NextResponse.redirect(new URL("/login?error=oauth_invalid", request.url));
  }

  // Verify state matches
  const cookieStore = await cookies();
  const storedState = cookieStore.get("oauth_state")?.value;
  cookieStore.delete("oauth_state");

  if (!storedState || storedState !== state) {
    return NextResponse.redirect(new URL("/login?error=oauth_state_mismatch", request.url));
  }

  try {
    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code);
    const googleUser = await getGoogleUser(tokens.access_token);

    if (!googleUser.email || !googleUser.verified_email) {
      return NextResponse.redirect(new URL("/login?error=oauth_unverified_email", request.url));
    }

    // Find or create user + account
    const { user, isNewUser } = await findOrCreateUser(googleUser, tokens);

    // Find the user's membership
    const member = await prisma.member.findFirst({
      where: { userId: user.id },
      include: { organization: true },
    });

    // If the user has a membership, create session and redirect to app
    if (member) {
      await createSession({
        userId: user.id,
        memberId: member.id,
        organizationId: member.organizationId,
        role: member.role,
      });
      return NextResponse.redirect(new URL(`/app/${member.organizationId}`, request.url));
    }

    // New user with no org — check for pending invitation
    const invitation = await prisma.invitation.findFirst({
      where: { email: user.email, acceptedAt: null, expiresAt: { gt: new Date() } },
    });

    if (invitation) {
      // Accept invitation automatically
      const newMember = await prisma.member.create({
        data: {
          userId: user.id,
          organizationId: invitation.organizationId,
          role: invitation.role,
        },
      });
      await prisma.invitation.update({
        where: { id: invitation.id },
        data: { acceptedAt: new Date() },
      });
      await prisma.user.update({
        where: { id: user.id },
        data: { onboardedAt: new Date() },
      });
      await createSession({
        userId: user.id,
        memberId: newMember.id,
        organizationId: invitation.organizationId,
        role: newMember.role,
      });
      return NextResponse.redirect(new URL(`/app/${invitation.organizationId}`, request.url));
    }

    // Truly new user with no invitation — redirect to onboarding/workspace setup
    // Store userId in a short-lived cookie so the onboarding page knows who they are
    cookieStore.set("pending_user_id", user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 30, // 30 minutes
      path: "/",
    });

    return NextResponse.redirect(new URL("/register?step=workspace", request.url));
  } catch (err) {
    console.error("Google OAuth callback error:", err);
    return NextResponse.redirect(new URL("/login?error=oauth_failed", request.url));
  }
}

async function findOrCreateUser(
  googleUser: { id: string; email: string; name: string; picture: string },
  tokens: { access_token: string; refresh_token?: string; expires_in: number; scope: string }
) {
  // Check if we already have an account linked to this Google ID
  const existingAccount = await prisma.account.findUnique({
    where: { provider_providerAccountId: { provider: "google", providerAccountId: googleUser.id } },
    include: { user: true },
  });

  if (existingAccount) {
    // Update tokens
    await prisma.account.update({
      where: { id: existingAccount.id },
      data: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token ?? existingAccount.refreshToken,
        tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        scope: tokens.scope,
      },
    });
    return { user: existingAccount.user, isNewUser: false };
  }

  // Check if a user with this email already exists (password-based user linking to Google)
  const existingUser = await prisma.user.findUnique({ where: { email: googleUser.email } });

  if (existingUser) {
    // Link Google account to existing user
    await prisma.account.create({
      data: {
        userId: existingUser.id,
        provider: "google",
        providerAccountId: googleUser.id,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        scope: tokens.scope,
      },
    });

    // Update avatar/name if missing
    if (!existingUser.name || !existingUser.avatarUrl) {
      await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          name: existingUser.name || googleUser.name,
          avatarUrl: existingUser.avatarUrl || googleUser.picture,
          emailVerified: true,
        },
      });
    }

    return { user: existingUser, isNewUser: false };
  }

  // Create brand new user + account
  const newUser = await prisma.user.create({
    data: {
      email: googleUser.email,
      name: googleUser.name,
      avatarUrl: googleUser.picture,
      emailVerified: true,
    },
  });

  await prisma.account.create({
    data: {
      userId: newUser.id,
      provider: "google",
      providerAccountId: googleUser.id,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      scope: tokens.scope,
    },
  });

  return { user: newUser, isNewUser: true };
}
