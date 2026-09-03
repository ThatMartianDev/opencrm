import Link from "next/link";
import { Plus_Jakarta_Sans } from "next/font/google";

import Styles from "./Footer.module.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export default function Footer() {
  return (
    <footer className={`${Styles.footer} ${plusJakartaSans.className}`}>
      <div className={Styles.footerBrand}>
        <Link className={Styles.wordmark} href="/">
          UntitledCRM
        </Link>
        <p>Less CRM maintenance. More actual work.</p>
      </div>
      <nav className={Styles.footerLinks} aria-label="Footer navigation">
        <Link href="/">Home</Link>
        <Link href="/#features">Features</Link>
        <Link href="/#whats-next">What&apos;s next</Link>
        <Link href="/feedback">Feedback</Link>
        <Link href="/login">Log in</Link>
        <Link href="/register">Try the beta</Link>
        <Link href="/legal/privacy-policy">Privacy Policy</Link>
        <Link href="/legal/user-agreement">User Agreement</Link>
        <span title="Repository URL not published yet">
          GitHub showcase repository
        </span>
      </nav>
      <p className={Styles.footerNote}>
        UntitledCRM is a working name. The final product name is still being
        decided.
      </p>
    </footer>
  );
}