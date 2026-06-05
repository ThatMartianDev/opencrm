"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getInvitationByToken, acceptInvitation, getAuthStatus } from "@/modules/auth/actions";

type InviteData = {
    email: string;
    organizationName: string;
    role: string;
};

export default function InvitationPage() {
    const params = useParams();
    const router = useRouter();
    const token = params.token as string;

    const [inviteData, setInviteData] = useState<InviteData | null>(null);
    const [loading, setLoading] = useState(true);
    const [accepting, setAccepting] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        async function init() {
            // Check if user is authenticated (via session or registration token)
            const auth = await getAuthStatus();
            if (!auth.authenticated) {
                // Not logged in — redirect to register with invitation
                router.replace(`/register?invitation=${token}`);
                return;
            }

            const data = await getInvitationByToken(token);
            if (data) {
                setInviteData(data);
            }
            setLoading(false);
        }
        init();
    }, [token, router]);

    async function handleAccept() {
        setAccepting(true);
        setError("");

        try {
            const result = await acceptInvitation(token);
            router.push(`/app/${result.organizationId}/home`);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Failed to accept invitation");
            setAccepting(false);
        }
    }

    if (loading) {
        return <div><p>Loading invitation...</p></div>;
    }

    if (!inviteData) {
        return (
            <div>
                <h1>Invalid Invitation</h1>
                <p>This invitation link is invalid or has expired. Please ask your team admin to send a new one.</p>
            </div>
        );
    }

    return (
        <div>
            <h1>You&apos;re invited!</h1>
            <p>
                You&apos;ve been invited to join <strong>{inviteData.organizationName}</strong> as a <strong>{inviteData.role.toLowerCase()}</strong>.
            </p>
            {error && <p style={{ color: "red", fontSize: "0.875rem" }}>{error}</p>}
            <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
                <button onClick={handleAccept} disabled={accepting}>
                    {accepting ? "Joining..." : "Accept & Join"}
                </button>
                <button onClick={() => router.push("/")}>
                    Decline
                </button>
            </div>
        </div>
    );
}
