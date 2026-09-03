import type { ReactNode } from "react";
import { Plus_Jakarta_Sans } from "next/font/google";

import Footer from "@/website/components/Footer/Footer";
import Header from "@/website/components/Header/Header";
import Styles from "./LegalDocument.module.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

type SectionLink = {
  id: string;
  title: string;
};

type LegalDocumentProps = {
  title: string;
  description: string;
  sections: readonly SectionLink[];
  children: ReactNode;
};

export default function LegalDocument({
  title,
  description,
  sections,
  children,
}: LegalDocumentProps) {
  return (
    <div className={`${Styles.page} ${plusJakartaSans.className}`}>
      <Header />
      <main>
        <header className={Styles.documentHeader}>
          <div>
            <p className={Styles.eyebrow}>Public beta legal</p>
            <h1>{title}</h1>
            <p className={Styles.description}>{description}</p>
            <dl className={Styles.dates}>
              <div>
                <dt>Effective date</dt>
                <dd>
                  <time dateTime="2026-09-02">September 2, 2026</time>
                </dd>
              </div>
              <div>
                <dt>Last updated</dt>
                <dd>
                  <time dateTime="2026-09-02">September 2, 2026</time>
                </dd>
              </div>
            </dl>
          </div>
        </header>

        <div className={Styles.documentLayout}>
          <aside className={Styles.tableOfContents}>
            <nav aria-label={`${title} sections`}>
              <p>On this page</p>
              <ol>
                {sections.map((section) => (
                  <li key={section.id}>
                    <a href={`#${section.id}`}>{section.title}</a>
                  </li>
                ))}
              </ol>
            </nav>
          </aside>

          <article className={Styles.content}>{children}</article>
        </div>
      </main>
      <Footer />
    </div>
  );
}