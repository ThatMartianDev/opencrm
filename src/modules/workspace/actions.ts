
"use server";

import crypto from "crypto";
import { createSession, getSessionClaims } from "@/lib/auth/session";
import { WorkspaceService } from "./service";
import { MemberDataSize } from "./types";
import { prisma } from "@/lib/db/client";
import { MemberRole } from "@/generated/prisma/enums";
import { sendEmail, templates } from "@/lib/email";

export async function switchWorkspace(organizationId: string) {
    const session = await getSessionClaims();
    const membership = await prisma.member.findUnique({
        where: {
            userId_organizationId: {
                userId: session.userId,
                organizationId,
            },
        },
        select: {
            id: true,
            organizationId: true,
            role: true,
            organization: { select: { slug: true } },
        },
    });

    if (!membership) {
        throw new Error("Workspace access denied");
    }

    await createSession({
        userId: session.userId,
        memberId: membership.id,
        organizationId: membership.organizationId,
        role: membership.role,
    });

    return {
        organizationId: membership.organizationId,
        workspaceSlug: membership.organization.slug,
    };
}

export const getOrganizationData = async (organizationId: string) => {
    const session = await getSessionClaims();

    if (session.organizationId !== organizationId) {
        throw new Error("Forbidden workspace");
    }

    const bootstrap = await WorkspaceService.getWorkspaceBootstrap(organizationId, session.userId);
    return {
        id: bootstrap.organization.id,
        name: bootstrap.organization.name,
    };
};

export const getMemberData = async (memberId: string, dataSize: MemberDataSize) => {
    const session = await getSessionClaims();

    if (session.memberId !== memberId) {
        throw new Error("Forbidden workspace");
    }

    const member = await WorkspaceService.getMemberData(memberId, session.userId, dataSize);
    return member;
}

export async function inviteMember(input: { email: string; role: MemberRole }) {
    const session = await getSessionClaims();
    const { organizationId, userId } = session;

    // Only OWNER, ADMIN, and MANAGER can invite members
    if (!["OWNER", "ADMIN", "MANAGER"].includes(session.role)) {
        throw new Error("You don't have permission to invite members");
    }

    // Check if already a member
    const existingUser = await prisma.user.findUnique({ where: { email: input.email } });
    if (existingUser) {
        const existingMember = await prisma.member.findUnique({
            where: { userId_organizationId: { userId: existingUser.id, organizationId } },
        });
        if (existingMember) {
            throw new Error("This person is already a member of this workspace");
        }
    }

    // Check if there's already a pending invitation
    const existingInvite = await prisma.invitation.findUnique({
        where: { email_organizationId: { email: input.email, organizationId } },
    });
    if (existingInvite && !existingInvite.acceptedAt && existingInvite.expiresAt > new Date()) {
        throw new Error("An invitation has already been sent to this email");
    }

    // Delete expired/old invitation if exists
    if (existingInvite) {
        await prisma.invitation.delete({ where: { id: existingInvite.id } });
    }

    // Create invitation with token
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await prisma.invitation.create({
        data: {
            email: input.email,
            token,
            role: input.role,
            organizationId,
            invitedById: userId,
            expiresAt,
        },
    });

    // Send invite email
    const inviter = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
    const org = await prisma.organization.findUnique({ where: { id: organizationId }, select: { name: true } });

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const inviteUrl = `${baseUrl}/invitation/${token}`;

    const emailContent = templates.invite({
        inviteeName: input.email,
        organizationName: org?.name || "the workspace",
        inviterName: inviter?.name || "A teammate",
        inviteUrl,
    });

    await sendEmail({ to: input.email, ...emailContent }).catch((err) => {
        console.error("Failed to send invite email:", err);
    });

    return { email: input.email, role: input.role };
}

//  Settings: General 

export async function updateWorkspace(input: { name: string; slug: string }) {
    const session = await getSessionClaims();

    if (session.role !== "OWNER" && session.role !== "ADMIN") {
        throw new Error("Only owners and admins can update workspace settings");
    }

    if (!input.name || input.name.trim().length < 2) {
        throw new Error("Workspace name must be at least 2 characters");
    }

    if (!input.slug || input.slug.trim().length < 2) {
        throw new Error("Workspace URL must be at least 2 characters");
    }

    const slug = input.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-");

    // Check slug uniqueness (excluding current org)
    const existing = await prisma.organization.findFirst({
        where: { slug, id: { not: session.organizationId } },
    });
    if (existing) {
        throw new Error("This workspace URL is already taken");
    }

    await prisma.organization.update({
        where: { id: session.organizationId },
        data: { name: input.name.trim(), slug },
    });

    return { success: true, workspaceSlug: slug };
}

export async function getWorkspaceSettings() {
    const session = await getSessionClaims();

    const org = await prisma.organization.findUnique({
        where: { id: session.organizationId },
        select: { id: true, name: true, slug: true, plan: true, logoUrl: true, createdAt: true },
    });

    if (!org) throw new Error("Organization not found");
    return org;
}

//  Settings: Members 

export async function getWorkspaceMembers() {
    const session = await getSessionClaims();

    const members = await prisma.member.findMany({
        where: { organizationId: session.organizationId },
        select: {
            id: true,
            role: true,
            joinedAt: true,
            user: {
                select: { id: true, name: true, email: true, avatarUrl: true },
            },
        },
        orderBy: { joinedAt: "asc" },
    });

    return members;
}

export async function getWorkspaceInvitations() {
    const session = await getSessionClaims();

    const invitations = await prisma.invitation.findMany({
        where: {
            organizationId: session.organizationId,
            acceptedAt: null,
            expiresAt: { gt: new Date() },
        },
        select: {
            id: true,
            email: true,
            role: true,
            createdAt: true,
            expiresAt: true,
        },
        orderBy: { createdAt: "desc" },
    });

    return invitations;
}

export async function updateMemberRole(memberId: string, role: MemberRole) {
    const session = await getSessionClaims();

    if (session.role !== "OWNER" && session.role !== "ADMIN") {
        throw new Error("Only owners and admins can change roles");
    }

    const target = await prisma.member.findFirst({
        where: { id: memberId, organizationId: session.organizationId },
    });

    if (!target) throw new Error("Member not found");
    if (target.role === "OWNER") throw new Error("Cannot change the owner's role");
    if (role === "OWNER") throw new Error("Cannot assign owner role");

    await prisma.member.update({
        where: { id: memberId },
        data: { role },
    });

    return { success: true };
}

export async function removeMember(memberId: string) {
    const session = await getSessionClaims();

    if (session.role !== "OWNER" && session.role !== "ADMIN") {
        throw new Error("Only owners and admins can remove members");
    }

    if (memberId === session.memberId) {
        throw new Error("You cannot remove yourself");
    }

    const target = await prisma.member.findFirst({
        where: { id: memberId, organizationId: session.organizationId },
        include: {
            _count: {
                select: {
                    ownedRecords: true,
                    createdNotes: true,
                },
            },
        },
    });

    if (!target) throw new Error("Member not found");
    if (target.role === "OWNER") throw new Error("Cannot remove the workspace owner");
    if (target._count.ownedRecords > 0) {
        throw new Error("Transfer this member's records before removing them");
    }
    if (target._count.createdNotes > 0) {
        throw new Error("Delete or reassign this member's notes before removing them");
    }

    await prisma.member.delete({ where: { id: memberId } });

    return { success: true };
}

export async function revokeInvitation(invitationId: string) {
    const session = await getSessionClaims();

    if (session.role !== "OWNER" && session.role !== "ADMIN") {
        throw new Error("Only owners and admins can revoke invitations");
    }

    const invitation = await prisma.invitation.findFirst({
        where: { id: invitationId, organizationId: session.organizationId },
    });

    if (!invitation) throw new Error("Invitation not found");

    await prisma.invitation.delete({ where: { id: invitationId } });

    return { success: true };
}

export async function resendInvitation(invitationId: string) {
    const session = await getSessionClaims();

    if (session.role !== "OWNER" && session.role !== "ADMIN") {
        throw new Error("Only owners and admins can resend invitations");
    }

    const invitation = await prisma.invitation.findFirst({
        where: { id: invitationId, organizationId: session.organizationId },
    });

    if (!invitation) throw new Error("Invitation not found");

    // Reset expiry
    const newExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const newToken = crypto.randomBytes(32).toString("hex");

    await prisma.invitation.update({
        where: { id: invitationId },
        data: { expiresAt: newExpiry, token: newToken },
    });

    // Resend email
    const inviter = await prisma.user.findUnique({ where: { id: session.userId }, select: { name: true } });
    const org = await prisma.organization.findUnique({ where: { id: session.organizationId }, select: { name: true } });

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const inviteUrl = `${baseUrl}/invitation/${newToken}`;

    const emailContent = templates.invite({
        inviteeName: invitation.email,
        organizationName: org?.name || "the workspace",
        inviterName: inviter?.name || "A teammate",
        inviteUrl,
    });

    await sendEmail({ to: invitation.email, ...emailContent }).catch((err) => {
        console.error("Failed to resend invite email:", err);
    });

    return { success: true };
}

export async function deleteWorkspace() {
    const session = await getSessionClaims();

    if (session.role !== "OWNER") {
        throw new Error("Only the workspace owner can delete the workspace");
    }

    await prisma.organization.delete({ where: { id: session.organizationId } });

    return { success: true };
}

//  Profile 

export async function updateProfile(input: { name: string }) {
    const session = await getSessionClaims();

    if (!input.name || input.name.trim().length < 2) {
        throw new Error("Name must be at least 2 characters");
    }

    await prisma.user.update({
        where: { id: session.userId },
        data: { name: input.name.trim() },
    });

    return { success: true };
}