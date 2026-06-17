"use server";

import { getSessionClaims } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";

export type LinkedAccount = {
    id: string;
    provider: string;
    providerAccountId: string;
    scope: string | null;
    createdAt: string;
};

export async function getLinkedAccounts(): Promise<LinkedAccount[]> {
    const session = await getSessionClaims();

    const accounts = await prisma.account.findMany({
        where: { userId: session.userId },
        select: {
            id: true,
            provider: true,
            providerAccountId: true,
            scope: true,
            createdAt: true,
        },
        orderBy: { createdAt: "desc" },
    });

    return accounts.map((a) => ({
        ...a,
        createdAt: a.createdAt.toISOString(),
    }));
}

export async function disconnectAccount(accountId: string): Promise<{ success: boolean; error?: string }> {
    const session = await getSessionClaims();

    // Verify the account belongs to the current user
    const account = await prisma.account.findUnique({
        where: { id: accountId },
    });

    if (!account || account.userId !== session.userId) {
        return { success: false, error: "Account not found" };
    }

    // Don't allow disconnecting if user has no password (would lock them out)
    const user = await prisma.user.findUnique({
        where: { id: session.userId },
        select: { passwordHash: true },
    });

    const accountCount = await prisma.account.count({
        where: { userId: session.userId },
    });

    if (!user?.passwordHash && accountCount <= 1) {
        return {
            success: false,
            error: "Cannot disconnect your only login method. Set a password first.",
        };
    }

    await prisma.account.delete({ where: { id: accountId } });

    return { success: true };
}

export async function getCalendarStatus(): Promise<{ connected: boolean; scope: string | null }> {
    const session = await getSessionClaims();

    const account = await prisma.account.findFirst({
        where: { userId: session.userId, provider: "google_calendar" },
        select: { scope: true, refreshToken: true },
    });

    return { connected: !!account?.refreshToken, scope: account?.scope ?? null };
}

export async function getGmailStatus(): Promise<{ connected: boolean; email: string | null; scope: string | null }> {
    const session = await getSessionClaims();

    const account = await prisma.account.findFirst({
        where: { userId: session.userId, provider: "google_gmail" },
        select: { providerAccountId: true, scope: true, refreshToken: true },
    });

    return {
        connected: !!account?.refreshToken,
        email: account?.providerAccountId ?? null,
        scope: account?.scope ?? null,
    };
}

export async function disconnectGmail(): Promise<{ success: boolean; error?: string }> {
    const session = await getSessionClaims();

    const account = await prisma.account.findFirst({
        where: { userId: session.userId, provider: "google_gmail" },
    });

    if (!account) {
        return { success: false, error: "No Gmail account connected" };
    }

    if (account.refreshToken) {
        try {
            await fetch(
                `https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(account.refreshToken)}`,
                { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" } }
            );
        } catch {
            // Best effort
        }
    }

    await prisma.email.deleteMany({
        where: { userId: session.userId, organizationId: session.organizationId, provider: "google_gmail" },
    });

    await prisma.account.delete({ where: { id: account.id } });

    return { success: true };
}

export async function disconnectCalendar(): Promise<{ success: boolean; error?: string }> {
    const session = await getSessionClaims();

    const account = await prisma.account.findFirst({
        where: { userId: session.userId, provider: "google_calendar" },
    });

    if (!account) {
        return { success: false, error: "No calendar connected" };
    }

    // Revoke the token at Google
    if (account.refreshToken) {
        try {
            await fetch(
                `https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(account.refreshToken)}`,
                { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" } }
            );
        } catch {
            // Best effort
        }
    }

    // Delete cached events
    await prisma.calendarEvent.deleteMany({
        where: { userId: session.userId, organizationId: session.organizationId },
    });

    // Delete account row
    await prisma.account.delete({ where: { id: account.id } });

    return { success: true };
}
