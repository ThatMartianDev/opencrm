"use client";
import { CheckmarkCircleFilled } from "@fluentui/react-icons";
import Link from "next/link";
import type { ReactNode } from "react";
import { Plus_Jakarta_Sans } from "next/font/google";

import Styles from "./AuthShell.module.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

type AuthShellProps = {
  children: ReactNode;
};

const benefits = [
  "Keep every customer conversation in context",
  "Move deals forward with one connected workspace",
  "Turn follow-ups into clear, shared next steps",
];

const AuthShell = ({ children }: AuthShellProps) => {
  return (
    <main className={`${Styles.shell} ${plusJakartaSans.className}`}>
      <section className={Styles.formPanel}>
        <header className={Styles.header}>
          <Link href="/" className={Styles.brand} aria-label="UntitledCRM home">
            <span className={Styles.brandMark} aria-hidden="true">
              <span />
            </span>
            <span>UntitledCRM</span>
            <span className={Styles.betaTag}>Beta</span>
          </Link>
        </header>

        <div className={Styles.formArea}>{children}</div>

        <footer className={Styles.footer}>
          <span>&copy; UntitledCRM</span>
          <Link href="/legal/privacy-policy">Privacy</Link>
          <Link href="/legal/user-agreement">Terms</Link>
        </footer>
      </section>

      <aside className={Styles.storyPanel}>
        <div className={Styles.storyGrid} aria-hidden="true" />
        <div className={Styles.storyContent}>
          <p className={Styles.eyebrow}>The whole relationship, in one place</p>
          <h2>Turn customer context into momentum.</h2>
          <p className={Styles.storyCopy}>
            UntitledCRM brings your relationships, pipeline, and daily work
            together so your team always knows what comes next.
          </p>
          <ul className={Styles.benefits}>
            {benefits.map((benefit) => (
              <li key={benefit}>
                <CheckmarkCircleFilled aria-hidden="true" />
                <span>{benefit}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className={Styles.panelNote}>Built for teams that value clarity.</p>
      </aside>
    </main>
  );
};

export default AuthShell;