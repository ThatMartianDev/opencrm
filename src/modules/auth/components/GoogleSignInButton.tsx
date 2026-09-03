"use client";

import { useEffect, useRef, useState } from "react";

import Styles from "./Styles.module.css";

const GOOGLE_AUTH_URL = "/api/auth/google";

export default function GoogleSignInButton() {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const trigger = triggerRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    cancelRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      trigger?.focus();
    };
  }, [isOpen]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={Styles.oauthBtn}
        onClick={() => setIsOpen(true)}
        aria-haspopup="dialog"
      >
        <GoogleIcon />
        <span>Continue with Google</span>
      </button>

      {isOpen && (
        <div
          className={Styles.modalBackdrop}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setIsOpen(false);
          }}
        >
          <section
            className={Styles.modal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="google-access-title"
            aria-describedby="google-access-description"
          >
            <div className={Styles.modalBadge} aria-hidden="true">
              Beta access
            </div>
            <h2 id="google-access-title">Google sign-in is limited for now</h2>
            <p id="google-access-description">
              This feature is currently open to selected test users. It will be
              available to everyone soon.
            </p>
            <div className={Styles.modalActions}>
              <a href={GOOGLE_AUTH_URL} className={Styles.modalPrimaryAction}>
                I&apos;m test user
              </a>
              <button
                ref={cancelRef}
                type="button"
                className={Styles.modalSecondaryAction}
                onClick={() => setIsOpen(false)}
              >
                Cancel
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}

function GoogleIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z"
        fill="#34A853"
      />
      <path
        d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z"
        fill="#EA4335"
      />
    </svg>
  );
}