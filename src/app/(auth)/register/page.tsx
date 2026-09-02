"use client";

import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState, Suspense } from "react";
import AuthShell from "@/modules/auth/components/AuthShell/AuthShell";
import {
  sendVerificationCode,
  verifyEmailCode,
  setPassword,
  setupProfile,
  getInvitationByToken,
} from "@/modules/auth/actions";
import Styles from "../Styles.module.css";

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
  const stepNumber = ["email", "code", "password", "profile"].indexOf(step) + 1;

  useEffect(() => {
    window.document.title = "Create account | UntitledCRM";
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
    <div className={Styles.registerForm}>
      <div className={Styles.progressHeader}>
        <span>Step {stepNumber} of 4</span>
        <div
          className={Styles.progressTrack}
          role="progressbar"
          aria-label="Account setup progress"
          aria-valuemin={1}
          aria-valuemax={4}
          aria-valuenow={stepNumber}
        >
          <span style={{ width: `${stepNumber * 25}%` }} />
        </div>
      </div>

      {invitationToken && inviteData && (
        <div className={Styles.invitationNotice}>
          You&apos;ve been invited to join{" "}
          <strong>{inviteData.organizationName}</strong>. Complete your account
          setup to continue.
        </div>
      )}

      {step === "email" && (
        <section className={Styles.stepContent}>
          <div className={Styles.heading}>
            <p className={Styles.kicker}>Get started</p>
            <h1>Create your account</h1>
            <p>Use your work email to begin setting up UntitledCRM.</p>
          </div>
          {error && (
            <p className={Styles.error} role="alert">{error}</p>
          )}
          <div className={Styles.field}>
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              placeholder="you@company.com"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendCode()}
              required
            />
          </div>
          <button className={Styles.primaryButton} onClick={handleSendCode} disabled={loading || !email.trim()}>
            {loading ? "Sending..." : "Continue"}
          </button>
          <p className={Styles.legalCopy}>
            By creating an account, you agree to the{" "}
            <Link href="/legal/user-agreement">User Agreement</Link> and
            acknowledge the{" "}
            <Link href="/legal/privacy-policy">Privacy Policy</Link>.
          </p>
          <p className={Styles.switchPrompt}>
            Already have an account? <Link href="/login">Sign in</Link>
          </p>
        </section>
      )}

      {step === "code" && (
        <section className={Styles.stepContent}>
          <div className={Styles.heading}>
            <p className={Styles.kicker}>Verify your email</p>
            <h1>Check your inbox</h1>
            <p>We sent a 6-digit code to <strong>{email}</strong>.</p>
          </div>
          {error && (
            <p className={Styles.error} role="alert">{error}</p>
          )}
          <div className={Styles.field}>
            <label htmlFor="code">Verification code</label>
            <input
              type="text"
              id="code"
              className={Styles.codeInput}
              value={code}
              onChange={(e) =>
                setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              onKeyDown={(e) => e.key === "Enter" && handleVerifyCode()}
              maxLength={6}
              placeholder="000000"
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
            />
          </div>
          <div className={Styles.buttonGroup}>
            <button
              className={Styles.primaryButton}
              onClick={handleVerifyCode}
              disabled={loading || code.length !== 6}
            >
              {loading ? "Verifying..." : "Verify email"}
            </button>
            <button
              className={Styles.secondaryButton}
              onClick={handleSendCode}
              disabled={loading}
            >
              Resend code
            </button>
          </div>
          <button className={Styles.textButton} onClick={() => { setError(""); setStep("email"); }}>
            Use a different email
          </button>
        </section>
      )}

      {step === "password" && (
        <section className={Styles.stepContent}>
          <div className={Styles.heading}>
            <p className={Styles.kicker}>Secure your account</p>
            <h1>Create a password</h1>
            <p>Use at least 8 characters to keep your workspace protected.</p>
          </div>
          {error && (
            <p className={Styles.error} role="alert">{error}</p>
          )}
          <div className={Styles.field}>
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              placeholder="At least 8 characters"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword_(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div className={Styles.field}>
            <label htmlFor="confirmPassword">Confirm password</label>
            <input
              type="password"
              id="confirmPassword"
              placeholder="Enter it again"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSetPassword()}
              required
            />
          </div>
          <button className={Styles.primaryButton} onClick={handleSetPassword} disabled={loading}>
            {loading ? "Setting password..." : "Continue"}
          </button>
        </section>
      )}

      {step === "profile" && (
        <section className={Styles.stepContent}>
          <div className={Styles.heading}>
            <p className={Styles.kicker}>One last detail</p>
            <h1>Set up your profile</h1>
            <p>Tell your teammates what they should call you.</p>
          </div>
          {error && (
            <p className={Styles.error} role="alert">{error}</p>
          )}
          <div className={Styles.field}>
            <label htmlFor="name">Full name</label>
            <input
              type="text"
              id="name"
              placeholder="Your name"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSetupProfile()}
              required
              autoFocus
            />
          </div>
          <button className={Styles.primaryButton} onClick={handleSetupProfile} disabled={loading || !name.trim()}>
            {loading ? "Saving..." : "Finish setup"}
          </button>
        </section>
      )}
    </div>
  );
};

const RegisterPage = () => {
  return (
    <AuthShell>
      <Suspense fallback={<div className={Styles.loading}>Preparing your account...</div>}>
        <RegisterPageContent />
      </Suspense>
    </AuthShell>
  );
};

export default RegisterPage;
