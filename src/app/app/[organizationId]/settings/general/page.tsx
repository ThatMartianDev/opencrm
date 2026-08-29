"use client";

import { useRef, useState } from "react";
import { useWorkspaceData } from "@/modules/workspace/components/workspace-provider";
import { updateWorkspace, deleteWorkspace } from "@/modules/workspace/actions";
import AvatarFallback from "@/components/micro/AvatarFallback/AvatarFallback";
import MainButton from "@/components/micro/MainButton/MainButton";
import Styles from "./general.module.css";

export default function GeneralPage() {
    const { organization } = useWorkspaceData();

    const [name, setName] = useState(organization.name);
    const [slug, setSlug] = useState(organization.slug);
    const [logoUrl, setLogoUrl] = useState<string | null>(organization.logoUrl);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState("");
    const [error, setError] = useState("");
    const [deleting, setDeleting] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState("");
    const [logoUploading, setLogoUploading] = useState(false);
    const [logoError, setLogoError] = useState("");
    const logoInputRef = useRef<HTMLInputElement>(null);

    async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;

        setLogoError("");
        setLogoUploading(true);

        try {
            const formData = new FormData();
            formData.append("file", file);

            const res = await fetch("/api/avatar/workspace", { method: "POST", body: formData });
            const data = await res.json();

            if (!res.ok) throw new Error(data.error || "Upload failed");

            setLogoUrl(data.logoUrl);
        } catch (err: unknown) {
            setLogoError(err instanceof Error ? err.message : "Upload failed");
        } finally {
            setLogoUploading(false);
            // Reset input so the same file can be re-selected
            if (logoInputRef.current) logoInputRef.current.value = "";
        }
    }

    async function handleSave() {
        setSaving(true);
        setError("");
        setSuccess("");

        try {
            const result = await updateWorkspace({ name, slug });
            if (result.workspaceSlug !== organization.slug) {
                window.location.replace(`/app/${result.workspaceSlug}/settings/general`);
                return;
            }
            setSuccess("Settings saved successfully");
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Failed to save");
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete() {
        if (confirmDelete !== organization.name) return;

        setDeleting(true);
        try {
            await deleteWorkspace();
            window.location.href = "/login";
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Failed to delete workspace");
            setDeleting(false);
        }
    }

    return (
        <div>
            <h1 className={Styles.title}>General</h1>
            <p className={Styles.subtitle}>Manage your workspace settings.</p>

            <div className={Styles.section}>
                <div className={Styles.logoSection}>
                    <div className={Styles.logoWrapper}>
                        <AvatarFallback
                            name={organization.name}
                            imageUrl={logoUrl ?? undefined}
                            entityKind="organization"
                            entityId={organization.id}
                            size={72}
                        />
                        <button
                            className={Styles.logoOverlay}
                            onClick={() => logoInputRef.current?.click()}
                            disabled={logoUploading}
                            aria-label="Change workspace logo"
                        >
                            {logoUploading ? "..." : "Edit"}
                        </button>
                        <input
                            ref={logoInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/gif,image/webp"
                            className={Styles.hiddenInput}
                            onChange={handleLogoChange}
                        />
                    </div>
                    <div className={Styles.logoInfo}>
                        <p className={Styles.logoLabel}>Workspace Logo</p>
                        <p className={Styles.logoHint}>PNGs, JPEGs, GIFs and WebPs under 10MB</p>
                        {logoError && <p className={Styles.errorMsg}>{logoError}</p>}
                    </div>
                </div>

                <div className="form-group">
                    <label htmlFor="ws-name" className="form-label">Workspace name</label>
                    <input
                        id="ws-name"
                        type="text"
                        value={name}
                        className="form-input"
                        onChange={(e) => setName(e.target.value)}
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="ws-slug" className="form-label">Workspace URL</label>
                    <input
                        id="ws-slug"
                        type="text"
                        value={slug}
                        className="form-input"
                        onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
                    />
                    <p className={Styles.hint}>Your workspace will be accessible at: .../{slug}</p>
                </div>

                <div className={Styles.actions}>
                    <MainButton type="primary" text={saving ? "Saving..." : "Save changes"} onClick={handleSave} disabled={saving} />
                </div>

                {success && <p className={Styles.successMsg}>{success}</p>}
                {error && <p className={Styles.errorMsg}>{error}</p>}
            </div>

            <div className={Styles.dangerZone}>
                <h3>Danger zone</h3>
                <p>
                    Permanently delete this workspace and all of its data. This action cannot be undone.
                </p>
                <div className="form-group">
                    <label htmlFor="confirm-delete" className="form-label">
                        Type <strong>{organization.name}</strong> to confirm
                    </label>
                    <input
                        id="confirm-delete"
                        type="text"
                        value={confirmDelete}
                        onChange={(e) => setConfirmDelete(e.target.value)}
                        placeholder={organization.name}
                        className="form-input"
                    />
                </div>
                <button
                    className={Styles.dangerBtn}
                    disabled={confirmDelete !== organization.name || deleting}
                    onClick={handleDelete}
                >
                    {deleting ? "Deleting..." : "Delete workspace"}
                </button>
            </div>
        </div>
    );
}
