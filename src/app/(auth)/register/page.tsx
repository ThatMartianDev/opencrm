"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState } from "react";
import {
    sendVerificationCode,
    verifyEmailCode,
    setPassword,
    setupProfile,
    setupWorkspace,
    getInvitationByToken,
} from "@/modules/auth/actions";
import { slugify } from "@/lib/utils";

type InviteData = {
    email: string;
    organizationName: string;
    role: string;
};

type Step = "email" | "code" | "password" | "profile" | "workspace";

const RegisterPage = () => {
    const searchParams = useSearchParams();
    const router = useRouter();
    const invitationToken = searchParams.get("invitation") || null;

    const [step, setStep] = useState<Step>("email");
    const [email, setEmail] = useState("");
    const [code, setCode] = useState("");
    const [password, setPassword_] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [name, setName] = useState("");
    const [workspaceName, setWorkspaceName] = useState("");
    const [workspaceSlug, setWorkspaceSlug] = useState("");
    const [userId, setUserId] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [inviteData, setInviteData] = useState<InviteData | null>(null);

    //  Step: Email 
    async function handleSendCode() {
        if (!email.trim()) return;
        setError("");
        setLoading(true);

        const result = await sendVerificationCode(email.trim());
        setLoading(false);

        if (result.error) {
            setError(result.error);
            return;
        }

        setStep("code");
    }

    //  Step: Code 
    async function handleVerifyCode() {
        if (code.length !== 6) return;
        setError("");
        setLoading(true);

        const result = await verifyEmailCode(email, code);
        setLoading(false);

        if (result.error) {
            setError(result.error);
            return;
        }

        setUserId(result.userId!);
        setStep("password");
    }

    //  Step: Password 
    async function handleSetPassword() {
        if (password.length < 8) {
            setError("Password must be at least 8 characters");
            return;
        }
        if (password !== confirmPassword) {
            setError("Passwords don't match");
            return;
        }
        setError("");
        setLoading(true);

        const result = await setPassword(password);
        setLoading(false);

        if (result.error) {
            setError(result.error);
            return;
        }

        setStep("profile");
    }

    //  Step: Profile 
    async function handleSetupProfile() {
        if (!name.trim()) {
            setError("Please enter your name");
            return;
        }
        setError("");
        setLoading(true);

        const result = await setupProfile({ name: name.trim() });
        setLoading(false);

        if (result.error) {
            setError(result.error);
            return;
        }

        // If user has an invitation token, skip workspace setup
        if (invitationToken) {
            const invite = await getInvitationByToken(invitationToken);
            if (invite) {
                setInviteData(invite);
                // Redirect to invitation acceptance page
                router.push(`/invitation/${invitationToken}`);
                return;
            }
        }

        setStep("workspace");
    }

    //  Step: Workspace 
    async function handleSetupWorkspace() {
        if (!workspaceName.trim()) {
            setError("Please enter a workspace name");
            return;
        }
        setError("");
        setLoading(true);

        const slug = workspaceSlug.trim() || slugify(workspaceName);
        const result = await setupWorkspace({ name: workspaceName.trim(), slug });
        setLoading(false);

        if (result.error) {
            setError(result.error);
            return;
        }

        router.push(`/app/${result.organizationId}/home`);
    }

    return (
        <div>
            {invitationToken && inviteData && (
                <div style={{ padding: "12px 16px", background: "#e8f5e9", borderRadius: 8, marginBottom: 16, fontSize: "0.875rem" }}>
                    You&apos;ve been invited to join <strong>{inviteData.organizationName}</strong>. Complete your account setup to continue.
                </div>
            )}

            {step === "email" && (
                <>
                    <h1>Create your account</h1>
                    <p>Enter your email to get started.</p>
                    {error && <p style={{ color: "red", fontSize: "0.875rem" }}>{error}</p>}
                    <div>
                        <label htmlFor="email">Email:</label>
                        <input
                            type="email"
                            id="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleSendCode()}
                            required
                        />
                    </div>
                    <button onClick={handleSendCode} disabled={loading}>
                        {loading ? "Sending..." : "Continue"}
                    </button>
                </>
            )}

            {step === "code" && (
                <>
                    <h1>Check your email</h1>
                    <p>We sent a 6-digit code to <strong>{email}</strong></p>
                    {error && <p style={{ color: "red", fontSize: "0.875rem" }}>{error}</p>}
                    <div>
                        <label htmlFor="code">Verification code:</label>
                        <input
                            type="text"
                            id="code"
                            value={code}
                            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                            onKeyDown={(e) => e.key === "Enter" && handleVerifyCode()}
                            maxLength={6}
                            placeholder="000000"
                            autoFocus
                        />
                    </div>
                    <button onClick={handleVerifyCode} disabled={loading || code.length !== 6}>
                        {loading ? "Verifying..." : "Verify"}
                    </button>
                    <button onClick={handleSendCode} disabled={loading} style={{ marginLeft: 8 }}>
                        Resend code
                    </button>
                </>
            )}

            {step === "password" && (
                <>
                    <h1>Set your password</h1>
                    <p>Choose a secure password for your account.</p>
                    {error && <p style={{ color: "red", fontSize: "0.875rem" }}>{error}</p>}
                    <div>
                        <label htmlFor="password">Password:</label>
                        <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={(e) => setPassword_(e.target.value)}
                            required
                            autoFocus
                        />
                    </div>
                    <div>
                        <label htmlFor="confirmPassword">Confirm password:</label>
                        <input
                            type="password"
                            id="confirmPassword"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleSetPassword()}
                            required
                        />
                    </div>
                    <button onClick={handleSetPassword} disabled={loading}>
                        {loading ? "Setting password..." : "Continue"}
                    </button>
                </>
            )}

            {step === "profile" && (
                <>
                    <h1>Set up your profile</h1>
                    <p>How should we call you?</p>
                    {error && <p style={{ color: "red", fontSize: "0.875rem" }}>{error}</p>}
                    <div>
                        <label htmlFor="name">Name:</label>
                        <input
                            type="text"
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleSetupProfile()}
                            required
                            autoFocus
                        />
                    </div>
                    <button onClick={handleSetupProfile} disabled={loading}>
                        {loading ? "Saving..." : "Continue"}
                    </button>
                </>
            )}

            {step === "workspace" && (
                <>
                    <h1>Create your workspace</h1>
                    <p>This is where your team will collaborate.</p>
                    {error && <p style={{ color: "red", fontSize: "0.875rem" }}>{error}</p>}
                    <div className="form-group">
                        <label htmlFor="workspaceName" className="form-label">Workspace name:</label>
                        <input
                            type="text"
                            id="workspaceName"
                            value={workspaceName}
                            onChange={(e) => {
                                setWorkspaceName(e.target.value);
                                setWorkspaceSlug(slugify(e.target.value));
                            }}
                            className="form-input"
                            required
                            autoFocus
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="workspaceSlug" className="form-label">URL:</label>
                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <span style={{ fontSize: "0.875rem", color: "#666" }}>opencrm.app/</span>
                            <input
                                type="text"
                                id="workspaceSlug"
                                value={workspaceSlug}
                                onChange={(e) => setWorkspaceSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                                onKeyDown={(e) => e.key === "Enter" && handleSetupWorkspace()}
                                className="form-input"
                            />
                        </div>
                    </div>
                    <button onClick={handleSetupWorkspace} disabled={loading}>
                        {loading ? "Creating..." : "Create workspace"}
                    </button>
                </>
            )}
        </div>
    );
};

export default RegisterPage;