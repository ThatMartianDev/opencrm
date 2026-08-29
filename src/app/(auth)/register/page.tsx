"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import {
  sendVerificationCode,
  verifyEmailCode,
  setPassword,
  setupProfile,
  getInvitationByToken,
} from "@/modules/auth/actions";

type InviteData = {
  email: string;
  organizationName: string;
  role: string;
};

type Step = "email" | "code" | "password" | "profile" | "workspace";

const RegisterPageContent = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const invitationToken = searchParams.get("invitation") || null;

  const requestedStep = (searchParams.get("step") as Step) || "email";
  const initialStep = requestedStep === "workspace" ? "profile" : requestedStep;
  const [step, setStep] = useState<Step>(initialStep);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword_] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [inviteData, setInviteData] = useState<InviteData | null>(null);

  useEffect(() => {
    if (requestedStep === "workspace") {
      router.replace("/create-workspace");
    }
  }, [requestedStep, router]);

  if (requestedStep === "workspace") return null;

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

    router.push("/create-workspace");
  }

  return (
    <div>
      {invitationToken && inviteData && (
        <div
          style={{
            padding: "12px 16px",
            background: "#e8f5e9",
            borderRadius: 8,
            marginBottom: 16,
            fontSize: "0.875rem",
          }}
        >
          You&apos;ve been invited to join{" "}
          <strong>{inviteData.organizationName}</strong>. Complete your account
          setup to continue.
        </div>
      )}

      {step === "email" && (
        <>
          <h1>Create your account</h1>
          <p>Enter your email to get started.</p>
          {error && (
            <p style={{ color: "red", fontSize: "0.875rem" }}>{error}</p>
          )}
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
          <p>
            We sent a 6-digit code to <strong>{email}</strong>
          </p>
          {error && (
            <p style={{ color: "red", fontSize: "0.875rem" }}>{error}</p>
          )}
          <div>
            <label htmlFor="code">Verification code:</label>
            <input
              type="text"
              id="code"
              value={code}
              onChange={(e) =>
                setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              onKeyDown={(e) => e.key === "Enter" && handleVerifyCode()}
              maxLength={6}
              placeholder="000000"
              autoFocus
            />
          </div>
          <button
            onClick={handleVerifyCode}
            disabled={loading || code.length !== 6}
          >
            {loading ? "Verifying..." : "Verify"}
          </button>
          <button
            onClick={handleSendCode}
            disabled={loading}
            style={{ marginLeft: 8 }}
          >
            Resend code
          </button>
        </>
      )}

      {step === "password" && (
        <>
          <h1>Set your password</h1>
          <p>Choose a secure password for your account.</p>
          {error && (
            <p style={{ color: "red", fontSize: "0.875rem" }}>{error}</p>
          )}
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
          {error && (
            <p style={{ color: "red", fontSize: "0.875rem" }}>{error}</p>
          )}
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

    </div>
  );
};

const RegisterPage = () => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <RegisterPageContent />
    </Suspense>
  );
};

export default RegisterPage;
