import { Plus_Jakarta_Sans } from "next/font/google";

import Footer from "@/website/components/Footer/Footer";
import Header from "@/website/components/Header/Header";
import FeedbackForm from "./FeedbackForm";
import Styles from "./FeedbackPage.module.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export default function FeedbackPage() {
  return (
    <div className={`${Styles.page} ${plusJakartaSans.className}`}>
      <Header />
      <main>
        <section className={Styles.intro} aria-labelledby="feedback-title">
          <p className={Styles.eyebrow}>Public beta feedback</p>
          <h1 id="feedback-title">Tell us what could work better.</h1>
          <p>
            Report a bug, request a feature, or share an improvement. Direct
            feedback helps decide what gets fixed and built next.
          </p>
        </section>

        <section className={Styles.formSection} aria-label="Feedback form">
          <FeedbackForm />
          <aside className={Styles.aside}>
            <p className={Styles.asideLabel}>Useful feedback includes</p>
            <ol>
              <li>
                <span>01</span>
                What you were trying to do
              </li>
              <li>
                <span>02</span>
                What happened or felt unclear
              </li>
              <li>
                <span>03</span>
                What you expected instead
              </li>
            </ol>
            <p>
              For account or privacy requests, email{" "}
              <a href="mailto:thatmartiandev@gmail.com">
                thatmartiandev@gmail.com
              </a>
              .
            </p>
          </aside>
        </section>
      </main>
      <Footer />
    </div>
  );
}