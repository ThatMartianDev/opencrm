"use client";

import { useRef, useState } from "react";
import { useWorkspaceData } from "@/modules/workspace/components/workspace-provider";
import { updateProfile } from "@/modules/workspace/actions";
import AvatarFallback from "@/components/micro/AvatarFallback/AvatarFallback";
import MainButton from "@/components/micro/MainButton/MainButton";
import Styles from "./profile.module.css";

export default function ProfilePage() {
    const { user } = useWorkspaceData();

    const [name, setName] = useState(user.name || "");
    const [avatarUrl, setAvatarUrl] = useState<string | null>(user.avatarUrl);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState("");
    const [error, setError] = useState("");
    const [avatarUploading, setAvatarUploading] = useState(false);
    const [avatarError, setAvatarError] = useState("");
    const avatarInputRef = useRef<HTMLInputElement>(null);

    async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;

        setAvatarError("");
        setAvatarUploading(true);

        try {
            const formData = new FormData();
            formData.append("file", file);

            const res = await fetch("/api/avatar/user", { method: "POST", body: formData });
            const data = await res.json();

            if (!res.ok) throw new Error(data.error || "Upload failed");

            setAvatarUrl(data.avatarUrl);
        } catch (err: unknown) {
            setAvatarError(err instanceof Error ? err.message : "Upload failed");
        } finally {
            setAvatarUploading(false);
            if (avatarInputRef.current) avatarInputRef.current.value = "";
        }
    }

    async function handleSave() {
        setSaving(true);
        setError("");
        setSuccess("");

        try {
            await updateProfile({ name });
            setSuccess("Profile updated successfully");
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Failed to save");
        } finally {
            setSaving(false);
        }
    }

    return (
        <div>
            <h1 className={Styles.title}>Profile</h1>
            <p className={Styles.subtitle}>Manage your personal details.</p>

            <div className={Styles.avatarSection}>
                <div className={Styles.avatarWrapper}>
                    <AvatarFallback
                        name={user.name || user.email}
                        imageUrl={avatarUrl ?? undefined}
                        entityKind="member"
                        entityId={user.id}
                        size={64}
                    />
                    <button
                        className={Styles.avatarOverlay}
                        onClick={() => avatarInputRef.current?.click()}
                        disabled={avatarUploading}
                        aria-label="Change profile picture"
                    >
                        {avatarUploading ? "..." : "Edit"}
                    </button>
                    <input
                        ref={avatarInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/gif,image/webp"
                        className={Styles.hiddenInput}
                        onChange={handleAvatarChange}
                    />
                </div>
                <div className={Styles.avatarInfo}>
                    <p className={Styles.avatarLabel}>Profile Picture</p>
                    <p className={Styles.avatarHint}>PNGs, JPEGs and GIFs under 10MB</p>
                    {avatarError && <p className={Styles.errorMsg}>{avatarError}</p>}
                </div>
            </div>

            <div className={Styles.fields}>
                <div className="form-group">
                    <label htmlFor="profile-name" className="form-label">Name</label>
                    <input
                        id="profile-name"
                        type="text"
                        value={name}
                        className="form-input"
                        onChange={(e) => setName(e.target.value)}
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="profile-email" className="form-label">Email address</label>
                    <input
                        id="profile-email"
                        type="email"
                        value={user.email}
                        className="form-input"
                        disabled
                    />
                </div>
            </div>

            <div className={Styles.actions}>
                <MainButton type="primary" text={saving ? "Saving..." : "Save changes"} onClick={handleSave} disabled={saving} />
            </div>

            {success && <p className={Styles.successMsg}>{success}</p>}
            {error && <p className={Styles.errorMsg}>{error}</p>}
        </div>
    );
}
