"use client";

import { Eye20Regular, EyeOff20Regular } from "@fluentui/react-icons";
import Link from "next/link";
import { login } from "@/modules/auth/actions";
import { useActionState, useEffect, useState } from "react";

import GoogleSignInButton from "./GoogleSignInButton";
import Styles from "./Styles.module.css";

const LoginForm = () => {
  const [state, formAction, pending] = useActionState(login, null);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    window.document.title = "Login | UntitledCRM";
  }, []);

  return (
    <div className={Styles.loginForm}>
      <div className={Styles.heading}>
        <p className={Styles.kicker}>Welcome back</p>
        <h1>Sign in to UntitledCRM</h1>
        <p>Pick up where you left off and keep your team moving.</p>
      </div>

      <form action={formAction}>
        {state?.error && (
          <p className={Styles.error} role="alert">
            {state.error}
          </p>
        )}
        <div className={Styles.field}>
          <label htmlFor="email">
            Email
          </label>
          <input
            type="email"
            name="email"
            id="email"
            placeholder="you@company.com"
            autoComplete="email"
            required
          />
          {state?.fieldErrors?.email?.map((message) => (
            <span className={Styles.fieldError} key={message}>{message}</span>
          ))}
        </div>
        <div className={Styles.field}>
          <label htmlFor="password">
            Password
          </label>
          <div className={Styles.passwordField}>
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              id="password"
              placeholder="Enter your password"
              autoComplete="current-password"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((visible) => !visible)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              title={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff20Regular /> : <Eye20Regular />}
            </button>
          </div>
          {state?.fieldErrors?.password?.map((message) => (
            <span className={Styles.fieldError} key={message}>{message}</span>
          ))}
        </div>
        <button type="submit" className={Styles.submitButton} disabled={pending}>
          {pending ? "Signing in..." : "Sign in"}
        </button>
      </form>

      <div className={Styles.divider}>
        <div className={Styles.line} />
        <span className={Styles.or}>or</span>
        <div className={Styles.line} />
      </div>

      <GoogleSignInButton />

      <p className={Styles.switchPrompt}>
        New to UntitledCRM? <Link href="/register">Create an account</Link>
      </p>
    </div>
  );
};

export default LoginForm;
