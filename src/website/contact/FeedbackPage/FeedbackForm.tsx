"use client";

import Link from "next/link";
import { useActionState } from "react";

import { submitFeedback } from "@/modules/feedback/actions";
import { feedbackTypes } from "@/modules/feedback/options";
import type { FeedbackField, FeedbackState } from "@/modules/feedback/schema";
import Styles from "./FeedbackPage.module.css";

const initialState: FeedbackState = {};

export default function FeedbackForm() {
  const [state, formAction, pending] = useActionState(
    submitFeedback,
    initialState,
  );

  if (state.success) {
    return (
      <div className={Styles.success} role="status">
        <span aria-hidden="true">✓</span>
        <p className={Styles.successLabel}>Feedback sent</p>
        <h2>Thank you for helping shape the beta.</h2>
        <p>Your message has been delivered. We&apos;ll review it soon.</p>
        <Link href="/">Back to home</Link>
      </div>
    );
  }

  const fieldError = (field: FeedbackField) => state.fieldErrors?.[field]?.[0];

  return (
    <form action={formAction} className={Styles.form} noValidate>
      <div className={Styles.field}>
        <label htmlFor="feedback-type">What kind of feedback is this?</label>
        <select
          id="feedback-type"
          name="type"
          defaultValue=""
          aria-invalid={Boolean(fieldError("type"))}
          aria-describedby={fieldError("type") ? "feedback-type-error" : undefined}
          required
        >
          <option value="" disabled>
            Choose a type
          </option>
          {feedbackTypes.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
        {fieldError("type") && (
          <p className={Styles.fieldError} id="feedback-type-error">
            {fieldError("type")}
          </p>
        )}
      </div>

      <div className={Styles.field}>
        <label htmlFor="feedback-message">Message</label>
        <textarea
          id="feedback-message"
          name="message"
          rows={8}
          maxLength={5000}
          placeholder="Tell us what happened, what you expected, or what would make the product better."
          aria-invalid={Boolean(fieldError("message"))}
          aria-describedby={fieldError("message") ? "feedback-message-error" : "feedback-message-hint"}
          required
        />
        <p className={Styles.hint} id="feedback-message-hint">
          Please avoid including passwords or other sensitive information.
        </p>
        {fieldError("message") && (
          <p className={Styles.fieldError} id="feedback-message-error">
            {fieldError("message")}
          </p>
        )}
      </div>

      <div className={Styles.field}>
        <label htmlFor="feedback-email">Email</label>
        <input
          id="feedback-email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          aria-invalid={Boolean(fieldError("email"))}
          aria-describedby={fieldError("email") ? "feedback-email-error" : "feedback-email-hint"}
          required
        />
        <p className={Styles.hint} id="feedback-email-hint">
          Used only to identify your feedback and reply when needed.
        </p>
        {fieldError("email") && (
          <p className={Styles.fieldError} id="feedback-email-error">
            {fieldError("email")}
          </p>
        )}
      </div>

      <div className={Styles.hiddenField} aria-hidden="true">
        <label htmlFor="feedback-website">Website</label>
        <input
          id="feedback-website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      {state.error && (
        <p className={Styles.formError} role="alert">
          {state.error}
        </p>
      )}

      <button type="submit" disabled={pending}>
        {pending ? "Sending..." : "Send feedback"}
        <span aria-hidden="true">→</span>
      </button>

      <p className={Styles.privacyNote}>
        Your submission is handled according to the{" "}
        <Link href="/legal/privacy-policy">Privacy Policy</Link>.
      </p>
    </form>
  );
}