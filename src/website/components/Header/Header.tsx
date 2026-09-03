import Link from "next/link";
import { Plus_Jakarta_Sans } from "next/font/google";

import MainButton from "@/components/micro/MainButton/MainButton";
import Styles from "./Header.module.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export default function Header() {
  return (
    <header className={`${Styles.header} ${plusJakartaSans.className}`}>
      <nav className={Styles.nav} aria-label="Main navigation">
        <Link className={Styles.wordmark} href="/" aria-label="CRM home">
          UntitledCRM
        </Link>

        <div className={Styles.navLinks}>
          <Link href="/#features">Features</Link>
          <Link href="/#whats-next">What&apos;s next</Link>
          <Link href="/feedback">Feedback</Link>
        </div>

        <div className={Styles.navActions}>
          <span className={Styles.loginAction}>
            <MainButton
              type="primary"
              htmlTag="a"
              text="Login"
              href="/login"
            />
          </span>
          <MainButton
            type="secondary"
            htmlTag="a"
            text="Try Beta"
            href="/register"
          />
        </div>
      </nav>
    </header>
  );
}