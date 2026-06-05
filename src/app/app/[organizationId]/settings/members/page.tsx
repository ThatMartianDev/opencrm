"use client";

import { useEffect, useState } from "react";
import { useWorkspaceData } from "@/modules/workspace/components/workspace-provider";
import { useModal } from "@/components/macro/ModalProvider/ModalProvider";
import {
    getWorkspaceMembers,
    getWorkspaceInvitations,
    updateMemberRole,
    removeMember,
    revokeInvitation,
    resendInvitation,
} from "@/modules/workspace/actions";
import { MemberRole } from "@/generated/prisma/enums";
import AvatarFallback from "@/components/micro/AvatarFallback/AvatarFallback";
import MainButton from "@/components/micro/MainButton/MainButton";
import Styles from "./members.module.css";

type MemberRow = {
    id: string;
    role: MemberRole;
    joinedAt: Date;
    user: { id: string; name: string | null; email: string; avatarUrl: string | null };
};

type InvitationRow = {
    id: string;
    email: string;
    role: MemberRole;
    createdAt: Date;
    expiresAt: Date;
};

const ROLE_OPTIONS: MemberRole[] = [MemberRole.ADMIN, MemberRole.MANAGER, MemberRole.MEMBER];

export default function MembersPage() {
    const { member: currentMember } = useWorkspaceData();
    const { openModal } = useModal();

    const [members, setMembers] = useState<MemberRow[]>([]);
    const [invitations, setInvitations] = useState<InvitationRow[]>([]);
    const [loading, setLoading] = useState(true);

    const canManage = currentMember.role === "OWNER" || currentMember.role === "ADMIN";

    useEffect(() => {
        Promise.all([getWorkspaceMembers(), getWorkspaceInvitations()])
            .then(([m, i]) => {
                setMembers(m as MemberRow[]);
                setInvitations(i as InvitationRow[]);
            })
            .finally(() => setLoading(false));
    }, []);

    async function handleRoleChange(memberId: string, role: MemberRole) {
        try {
            await updateMemberRole(memberId, role);
            setMembers((prev) =>
                prev.map((m) => (m.id === memberId ? { ...m, role } : m))
            );
        } catch (err: unknown) {
            alert(err instanceof Error ? err.message : "Failed to update role");
        }
    }

    async function handleRemove(memberId: string) {
        if (!confirm("Are you sure you want to remove this member?")) return;

        try {
            await removeMember(memberId);
            setMembers((prev) => prev.filter((m) => m.id !== memberId));
        } catch (err: unknown) {
            alert(err instanceof Error ? err.message : "Failed to remove member");
        }
    }

    async function handleRevoke(invitationId: string) {
        if (!confirm("Revoke this invitation?")) return;

        try {
            await revokeInvitation(invitationId);
            setInvitations((prev) => prev.filter((i) => i.id !== invitationId));
        } catch (err: unknown) {
            alert(err instanceof Error ? err.message : "Failed to revoke invitation");
        }
    }

    async function handleResend(invitationId: string) {
        try {
            await resendInvitation(invitationId);
            alert("Invitation resent successfully");
        } catch (err: unknown) {
            alert(err instanceof Error ? err.message : "Failed to resend invitation");
        }
    }

    if (loading) {
        return <p>Loading members...</p>;
    }

    return (
        <div>
            <div className={Styles.header}>
                <div>
                    <h1 className={Styles.title}>Members</h1>
                    <p className={Styles.subtitle}>Manage your workspace members and invitations.</p>
                </div>
                {canManage && (
                    <MainButton
                        type="primary"
                        text="Invite member"
                        onClick={() => openModal("invite-member")}
                    />
                )}
            </div>

            <table className={Styles.table}>
                <thead>
                    <tr>
                        <th>Member</th>
                        <th>Role</th>
                        <th>Joined</th>
                        {canManage && <th></th>}
                    </tr>
                </thead>
                <tbody>
                    {members.map((m) => (
                        <tr key={m.id}>
                            <td>
                                <div className={Styles.memberCell}>
                                    <AvatarFallback
                                        name={m.user.name || m.user.email}
                                        entityKind="member"
                                        entityId={m.id}
                                        size={32}
                                        imageUrl={m.user.avatarUrl ?? undefined}
                                    />
                                    <div className={Styles.memberInfo}>
                                        <span className={Styles.memberName}>
                                            {m.user.name || m.user.email}
                                        </span>
                                        <span className={Styles.memberEmail}>{m.user.email}</span>
                                    </div>
                                </div>
                            </td>
                            <td>
                                {canManage && m.role !== "OWNER" ? (
                                    <select
                                        className={Styles.roleSelect}
                                        value={m.role}
                                        onChange={(e) => handleRoleChange(m.id, e.target.value as MemberRole)}
                                    >
                                        {ROLE_OPTIONS.map((r) => (
                                            <option key={r} value={r}>{r}</option>
                                        ))}
                                    </select>
                                ) : (
                                    <span className={Styles.roleBadge}>{m.role}</span>
                                )}
                            </td>
                            <td>{new Date(m.joinedAt).toLocaleDateString()}</td>
                            {canManage && (
                                <td>
                                    {m.role !== "OWNER" && m.id !== currentMember.id && (
                                        <button
                                            className={Styles.removeBtn}
                                            onClick={() => handleRemove(m.id)}
                                        >
                                            Remove
                                        </button>
                                    )}
                                </td>
                            )}
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* Pending Invitations */}
            <div className={Styles.invitationsSection}>
                <h2 className={Styles.sectionTitle}>Pending invitations ({invitations.length})</h2>

                {invitations.length === 0 ? (
                    <p className={Styles.emptyState}>No pending invitations</p>
                ) : (
                    <table className={Styles.table}>
                        <thead>
                            <tr>
                                <th>Email</th>
                                <th>Role</th>
                                <th>Sent</th>
                                <th>Expires</th>
                                {canManage && <th></th>}
                            </tr>
                        </thead>
                        <tbody>
                            {invitations.map((inv) => (
                                <tr key={inv.id}>
                                    <td>{inv.email}</td>
                                    <td><span className={Styles.roleBadge}>{inv.role}</span></td>
                                    <td>{new Date(inv.createdAt).toLocaleDateString()}</td>
                                    <td>{new Date(inv.expiresAt).toLocaleDateString()}</td>
                                    {canManage && (
                                        <td>
                                            <div className={Styles.inviteActions}>
                                                <button
                                                    className={Styles.inviteActionBtn}
                                                    onClick={() => handleResend(inv.id)}
                                                >
                                                    Resend
                                                </button>
                                                <button
                                                    className={`${Styles.inviteActionBtn} ${Styles.revokeBtn}`}
                                                    onClick={() => handleRevoke(inv.id)}
                                                >
                                                    Revoke
                                                </button>
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
