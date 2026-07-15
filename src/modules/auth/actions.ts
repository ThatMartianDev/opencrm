"use server";

import crypto from "crypto";
import { loginSchema } from "./schema";
import { AuthService } from "./service";
import { createSession, clearSession, getSessionClaims } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import actionError from "@/lib/action-utils/action-error";
import { prisma } from "@/lib/db/client";
import { hash } from "@/lib/auth";
import { sendEmail, templates } from "@/lib/email";
import { slugify } from "@/lib/utils";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { rateLimit } from "@/lib/rate-limit";

//  Registration Token Helpers 

const REGISTRATION_SECRET = () => new TextEncoder().encode(process.env.AUTH_SECRET?.trim() || "");

async function createRegistrationToken(userId: string, email: string): Promise<void> {
    const token = await new SignJWT({ userId, email })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("1h")
        .sign(REGISTRATION_SECRET());

    (await cookies()).set("registration_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60, // 1 hour
        path: "/",
    });
}

async function verifyRegistrationToken(): Promise<{ userId: string; email: string }> {
    const token = (await cookies()).get("registration_token")?.value;
    if (!token) throw new Error("Registration session expired. Please start over.");

    const { payload } = await jwtVerify(token, REGISTRATION_SECRET());
    if (!payload.userId || !payload.email) throw new Error("Invalid registration session");
    return { userId: payload.userId as string, email: payload.email as string };
}

async function clearRegistrationToken() {
    (await cookies()).delete("registration_token");
}

//  Step 1: Send verification code 

export async function sendVerificationCode(email: string) {
    if (!email || !email.includes("@")) {
        return { error: "Please enter a valid email" };
    }

    // Rate limit: 5 sends per email per 15 minutes
    const rl = rateLimit(`verify:${email.toLowerCase()}`, 5, 15 * 60 * 1000);
    if (!rl.success) {
        return { error: "Too many attempts. Please try again later." };
    }

    // Check if email is already fully registered
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser && existingUser.emailVerified && existingUser.passwordHash) {
        return { error: "An account with this email already exists. Please log in instead." };
    }

    // Generate 6-digit code
    const code = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Delete old codes for this email
    await prisma.emailVerification.deleteMany({ where: { email } });

    // Create new verification record
    await prisma.emailVerification.create({
        data: { email, code, expiresAt },
    });

    // Send email
    const emailContent = templates.verificationCode({ code });
    await sendEmail({ to: email, ...emailContent }).catch((err) => {
        console.error("Failed to send verification code:", err);
    });

    return { success: true };
}

//  Step 1b: Verify the code 

export async function verifyEmailCode(email: string, code: string) {
    // Rate limit: 10 attempts per email per 15 minutes
    const rl = rateLimit(`code:${email.toLowerCase()}`, 10, 15 * 60 * 1000);
    if (!rl.success) {
        return { error: "Too many attempts. Please try again later." };
    }

    const record = await prisma.emailVerification.findFirst({
        where: { email, code },
    });

    if (!record) {
        return { error: "Invalid code. Please try again." };
    }

    if (record.expiresAt < new Date()) {
        return { error: "Code expired. Please request a new one." };
    }

    // Clean up
    await prisma.emailVerification.deleteMany({ where: { email } });

    // Create or update user as email-verified
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
        user = await prisma.user.create({
            data: { email, emailVerified: true },
        });
    } else {
        user = await prisma.user.update({
            where: { email },
            data: { emailVerified: true },
        });
    }

    // Set a secure registration token cookie for subsequent steps
    await createRegistrationToken(user.id, email);

    return { success: true, userId: user.id };
}

//  Step 1c: Set password 

export async function setPassword(password: string) {
    const { userId } = await verifyRegistrationToken();

    if (password.length < 8) {
        return { error: "Password must be at least 8 characters" };
    }

    const hashedPassword = await hash(password);
    await prisma.user.update({
        where: { id: userId },
        data: { passwordHash: hashedPassword },
    });

    return { success: true };
}

//  Step 2: Profile setup 

export async function setupProfile(data: { name: string; avatarUrl?: string }) {
    const { userId } = await verifyRegistrationToken();

    if (!data.name || data.name.trim().length < 2) {
        return { error: "Name must be at least 2 characters" };
    }

    await prisma.user.update({
        where: { id: userId },
        data: { name: data.name.trim(), avatarUrl: data.avatarUrl || null },
    });

    return { success: true };
}

//  Step 3: Workspace setup 

export async function setupWorkspace(data: { name: string; slug?: string }) {
    // Support both email-signup flow (registration_token) and Google OAuth flow (pending_user_id)
    let userId: string;
    let isGoogleFlow = false;

    try {
        ({ userId } = await verifyRegistrationToken());
    } catch {
        const pendingUserId = (await cookies()).get("pending_user_id")?.value;
        if (!pendingUserId) {
            return { error: "Registration session expired. Please start over." };
        }
        userId = pendingUserId;
        isGoogleFlow = true;
    }

    if (!data.name || data.name.trim().length < 3) {
        return { error: "Workspace name must be at least 3 characters" };
    }

    const orgSlug = data.slug?.trim() || slugify(data.name);

    // Check slug uniqueness
    const existingOrg = await prisma.organization.findUnique({ where: { slug: orgSlug } });
    if (existingOrg) {
        return { error: "This workspace URL is already taken" };
    }

    const result = await prisma.$transaction(async (tx) => {
        const org = await tx.organization.create({
            data: { name: data.name.trim(), slug: orgSlug },
        });

        const member = await tx.member.create({
            data: { userId, organizationId: org.id, role: "OWNER" },
        });

        await tx.user.update({
            where: { id: userId },
            data: { onboardedAt: new Date() },
        });

        return { org, member };
    });

    // Clear the appropriate auth cookie
    if (isGoogleFlow) {
        (await cookies()).delete("pending_user_id");
    } else {
        await clearRegistrationToken();
    }

    await createSession({
        userId,
        memberId: result.member.id,
        organizationId: result.org.id,
        role: result.member.role,
    });

    return { success: true, organizationId: result.org.id };
}

//  Invitation: Accept 

export async function acceptInvitation(token: string) {
    let userId: string;

    // Try session first (existing user), then registration token (new user)
    try {
        const session = await getSessionClaims();
        userId = session.userId;
    } catch {
        const regToken = await verifyRegistrationToken();
        userId = regToken.userId;
        await clearRegistrationToken();
    }

    const invitation = await prisma.invitation.findUnique({
        where: { token },
        include: { organization: true },
    });

    if (!invitation) throw new Error("Invalid invitation");
    if (invitation.acceptedAt) throw new Error("Invitation already accepted");
    if (invitation.expiresAt < new Date()) throw new Error("Invitation expired");

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || invitation.email !== user.email) {
        throw new Error("This invitation was sent to a different email");
    }

    // Add user to org
    const member = await prisma.member.create({
        data: {
            userId,
            organizationId: invitation.organizationId,
            role: invitation.role,
        },
    });

    // Mark accepted
    await prisma.invitation.update({
        where: { id: invitation.id },
        data: { acceptedAt: new Date() },
    });

    // Mark user as onboarded if not already
    if (!user.onboardedAt) {
        await prisma.user.update({
            where: { id: userId },
            data: { onboardedAt: new Date() },
        });
    }

    // Update session to the new org
    await createSession({
        userId,
        memberId: member.id,
        organizationId: invitation.organizationId,
        role: member.role,
    });

    return { organizationId: invitation.organizationId };
}

//  Invitation: Get details 

export async function getInvitationByToken(token: string) {
    const invitation = await prisma.invitation.findUnique({
        where: { token },
        include: { organization: { select: { name: true } } },
    });

    if (!invitation) return null;
    if (invitation.acceptedAt || invitation.expiresAt < new Date()) return null;

    return {
        email: invitation.email,
        organizationName: invitation.organization.name,
        role: invitation.role,
    };
}

//  Login 

export async function login(_prev: unknown, formData: FormData) {
    let organizationId: string | null = null;

    try {
        const input = loginSchema.parse(Object.fromEntries(formData));

        // Rate limit: 10 attempts per email per 15 minutes
        const rl = rateLimit(`login:${input.email.toLowerCase()}`, 10, 15 * 60 * 1000);
        if (!rl.success) {
            return actionError(new Error("Too many login attempts. Please try again later."));
        }

        const { user, member } = await AuthService.login(input);
        if (!member) throw new Error("Member not found");
        await createSession({ userId: user.id, memberId: member.id, organizationId: member.organizationId, role: member.role });
        organizationId = member.organizationId;
    } catch (error) {
        return actionError(error);
    }

    if (!organizationId) {
        return actionError(new Error("Unable to determine organization"));
    }

    redirect(`/app/${organizationId}/home`);
}

//  Auth Status 

export async function getAuthStatus() {
    // Full session (existing member) first, then registration token — a
    // freshly registered invitee has no session yet (no membership), only the
    // registration token. acceptInvitation supports both, so both count as
    // authenticated here.
    try {
        const session = await getSessionClaims();
        return { authenticated: true, userId: session.userId };
    } catch {
        try {
            const regToken = await verifyRegistrationToken();
            return { authenticated: true, userId: regToken.userId };
        } catch {
            return { authenticated: false, userId: null };
        }
    }
}

//  Sign Out 

export async function signOut() {
    await clearSession();
    redirect("/login");
}