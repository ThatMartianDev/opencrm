"use client";

import { useState } from "react";
import { DismissFilled, PersonAddRegular } from "@fluentui/react-icons";
import { MemberRole } from "@/generated/prisma/enums";
import { inviteMember } from "../../actions";
import MainButton from "@/components/micro/MainButton/MainButton";
import Styles from "./InviteMemberModal.module.css";
import SharedStyles from "@/components/macro/ModalProvider/SharedStyles.module.css";

type InviteMemberModalProps = {
    onClose: () => void;
};

export default function InviteMemberModal({ onClose }: InviteMemberModalProps) {
    const [email, setEmail] = useState("");
    const [role, setRole] = useState<MemberRole>(MemberRole.MEMBER);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!email.trim()) return;

        setLoading(true);
        setError("");
        setSuccess("");

        try {
            await inviteMember({ email: email.trim(), role });
            setSuccess(`Invitation sent to ${email}.`);
            setEmail("");
            setRole(MemberRole.MEMBER);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Failed to send invitation");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className={SharedStyles.modalCard}>
            <div className={SharedStyles.modalHeader}>
                <span><PersonAddRegular fontSize={18} /></span>
                <h2>Invite team member</h2>
                <button className={Styles.closeBtn} onClick={onClose}>
                    <DismissFilled fontSize={16} />
                </button>
            </div>
            <form onSubmit={handleSubmit} className={SharedStyles.modalBody}>
                <div className={Styles.field}>
                    <label className={Styles.label}>Email</label>
                    <input
                        className={Styles.input}
                        type="email"
                        placeholder="john@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        autoFocus
                    />
                </div>
                <div className={Styles.field}>
                    <label className={Styles.label}>Role</label>
                    <select
                        className={Styles.input}
                        value={role}
                        onChange={(e) => setRole(e.target.value as MemberRole)}
                    >
                        <option value={MemberRole.MEMBER}>Member</option>
                        <option value={MemberRole.MANAGER}>Manager</option>
                        <option value={MemberRole.ADMIN}>Admin</option>
                    </select>
                </div>
                {error && <p className={Styles.error}>{error}</p>}
                {success && <p className={Styles.success}>{success}</p>}
                <div className={SharedStyles.modalFooter} style={{ padding: 0, borderTop: "none" }}>
                    <MainButton type="tertiary" text="Cancel" onClick={onClose} />
                    <MainButton type="primary" text={loading ? "Sending..." : "Send invitation"} disabled={loading} />
                </div>
            </form>
        </div>
    );
}
