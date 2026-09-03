"use client";

import {
  ArrowDownRegular,
  ArrowRightRegular,
  CalendarRegular,
  CheckmarkCircleRegular,
  ClockRegular,
  DocumentRegular,
  PeopleRegular,
} from "@fluentui/react-icons";
import Image from "next/image";

import { Plus_Jakarta_Sans } from "next/font/google";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

import Styles from "./HomePage.module.css";
import MainButton from "@/components/micro/MainButton/MainButton";
import Footer from "@/website/components/Footer/Footer";
import Header from "@/website/components/Header/Header";

const relationshipItems = [
  "Contacts",
  "Companies",
  "Deals",
  "Notes",
  "Tasks",
  "Files",
  "Email",
  "Calendar",
];

const roadmapItems = [
  {
    title: "Automation & workflows",
    description:
      "Automate repetitive processes and trigger actions based on changes in your CRM.",
  },
  {
    title: "Third-party integrations",
    description: "Connect the CRM with the tools teams already use.",
  },
  {
    title: "Expanded AI capabilities",
    description: "Smarter AI-assisted workflows, insights, and actions.",
  },
  {
    title: "Deeper email & calendar integration",
    description:
      "Bring more communication and scheduling context into the CRM.",
  },
  {
    title: "More powerful record relationships",
    description: "Connect and work with related records in more flexible ways.",
  },
  {
    title: "Reporting & analytics",
    description:
      "Better visibility into activity, pipelines, and business data.",
  },
];

const Arrow = () => <ArrowRightRegular aria-hidden="true" />;

export default function HomePage() {
  return (
    <div className={`${Styles.page} ${plusJakartaSans.className}`}>
      <Header />

      <main>
        <section className={Styles.hero} aria-labelledby="hero-title">
          <div className={Styles.heroCopy}>
            <div className={Styles.status}>
              <span aria-hidden="true" />
              Public beta · Free to try
            </div>
            <h1 id="hero-title">Less CRM maintenance. More actual work.</h1>
            <p>
              Turn customer information into action without spending your day
              maintaining the CRM.
            </p>
            <div className={Styles.heroActions}>
              <MainButton
                type="primary"
                htmlTag="a"
                text="Try the beta"
                href="/register"
                icon={{ type: "svg", src: <ArrowRightRegular color="#fff" /> }}
              />
              <MainButton
                type="secondary"
                htmlTag="a"
                text="See how it works"
                href="#quick-catcher"
                icon={{
                  type: "svg",
                  src: <ArrowDownRegular color="#000" aria-hidden="true" />,
                }}
              />
            </div>
          </div>
        </section>

        <section className={Styles.problemSection} id="features">
          <div className={Styles.sectionIntro}>
            <p className={Styles.eyebrow}>The whole relationship</p>
            <h2>Customer work doesn&apos;t happen in one place.</h2>
            <p>
              Working with a customer involves more than just their contact
              information. Conversations, deals, tasks, notes, files, and other
              activity all build up around the relationship.
            </p>
          </div>

          <div
            className={Styles.relationshipFlow}
            aria-label={relationshipItems.join(" to ")}
          >
            {relationshipItems.map((item, index) => (
              <div className={Styles.relationshipStep} key={item}>
                <span>{item}</span>
                {index < relationshipItems.length - 1 && <Arrow />}
              </div>
            ))}
          </div>

          <p className={Styles.sectionClosing}>
            Keep that information connected, see the full context, and act on it
            without jumping between disconnected tools.
          </p>
        </section>

        <section className={Styles.featureSection} id="quick-catcher">
          <div className={Styles.featureHeading}>
            <p className={Styles.eyebrow}>Quick Catcher</p>
            <h2>Tell your CRM what happened. Let it handle the busywork.</h2>
            <p>
              Turn a short, natural-language instruction into structured CRM
              actions with Quick Catcher.
            </p>
          </div>

          <div className={Styles.catcherExample}>
            <blockquote>
              “Ahmed said the latest order arrived damaged. Remind me to follow
              up with him next Tuesday.”
            </blockquote>
            <div
              className={Styles.actionResults}
              aria-label="Resulting CRM actions"
            >
              <div>
                <DocumentRegular aria-hidden="true" />
                <span>
                  <strong>Note</strong> Attached to the relevant order
                </span>
              </div>
              <div>
                <CheckmarkCircleRegular aria-hidden="true" />
                <span>
                  <strong>Task</strong> Follow up with Ahmed
                </span>
              </div>
              <div>
                <CalendarRegular aria-hidden="true" />
                <span>
                  <strong>Due date</strong> Next Tuesday
                </span>
              </div>
            </div>
          </div>

          <ProductImage
            src="/product/QuickCatcher.png"
            alt="Quick Catcher turning a plain-language update into CRM actions"
          />
        </section>

        <section className={`${Styles.featureSection} ${Styles.softBand}`}>
          <div className={Styles.featureHeading}>
            <p className={Styles.eyebrow}>Connected context</p>
            <h2>Everything about a relationship, in context.</h2>
            <p>
              See the people, companies, deals, notes, files, tasks, and
              activity surrounding a relationship without rebuilding the story
              across separate tools.
            </p>
          </div>

          <div className={Styles.contextLabels} aria-hidden="true">
            <span>
              <PeopleRegular /> Related records
            </span>
            <span>
              <DocumentRegular /> Activity history
            </span>
            <span>
              <ClockRegular /> Next actions
            </span>
          </div>
          <ProductImage
            src="/product/RecordPage.png"
            alt="Lead record showing related orders and a chronological activity history"
          />
        </section>

        <section className={Styles.splitFeature}>
          <div className={Styles.splitCopy}>
            <p className={Styles.eyebrow}>Flexible records</p>
            <h2>Your workflow doesn&apos;t have to fit our CRM.</h2>
            <p>
              Create your own record modules and fields when the standard CRM
              model doesn&apos;t match how your team works.
            </p>
            <div className={Styles.workflowList} aria-label="Example workflows">
              <span>Sales</span>
              <span>Operations</span>
              <span>Customer management</span>
              <span>Custom business workflows</span>
            </div>
          </div>
          <ProductImage
            src="/product/RecordModule.png"
            alt="Custom Orders record module with order-specific fields and statuses"
            compact
          />
        </section>

        {/* <section className={`${Styles.splitFeature} ${Styles.actionBand}`}>
          <div className={Styles.splitCopy}>
            <p className={Styles.eyebrow}>Keep work moving</p>
            <h2>From information to action.</h2>
            <p>
              Customer information is only useful when it leads to something
              happening. Tasks, calendar views, activity history, and
              notifications help keep follow-ups visible.
            </p>
            <div
              className={Styles.actionFlow}
              aria-label="Tasks to activity workflow"
            >
              <span>Tasks</span>
              <Arrow />
              <span>Calendar</span>
              <Arrow />
              <span>Notifications</span>
              <Arrow />
              <span>Activity</span>
            </div>
          </div>
          <ProductImage
            src="/product/Tasks.png"
            alt="Task list showing due dates, assignees, and related CRM records"
            compact
          />
        </section> */}

        <section className={Styles.philosophy}>
          <p className={Styles.eyebrow}>A simpler operating principle</p>
          <h2>The CRM should work for you. Not the other way around.</h2>
          <p>
            Capture information quickly. Keep the context connected. Turn it
            into action. Automate the repetitive parts.
          </p>
        </section>

        <section className={Styles.roadmap} id="whats-next">
          <div className={Styles.roadmapIntro}>
            <div>
              <p className={Styles.eyebrow}>Exploring next</p>
              <h2>Built now. Still evolving.</h2>
            </div>
            <p>
              The product is actively being developed during its public beta.
              These are planned and explored areas, not current promises.
            </p>
          </div>

          <div className={Styles.roadmapList}>
            {roadmapItems.map((item, index) => (
              <article key={item.title}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className={Styles.feedback} id="feedback">
          <div>
            <p className={Styles.eyebrow}>Public beta</p>
            <h2>Help shape what comes next.</h2>
          </div>
          <div className={Styles.feedbackCopy}>
            <p>
              Feedback from early users helps shape what gets built during the
              beta and beyond.
            </p>
            <p>
              If something feels wrong, confusing, missing, or surprisingly
              useful, that is exactly the kind of feedback that can help shape
              the beta.
            </p>
            <MainButton
              type="secondary"
              htmlTag="a"
              text="Share your feedback"
              href="/feedback"
              size="large"
            />
          </div>
        </section>

        <section className={Styles.finalCta}>
          <div className={Styles.status}>
            <span aria-hidden="true" />
            Public beta · Free to try
          </div>
          <h2>Spend less time maintaining your CRM.</h2>
          <p>Try the product during the public beta.</p>
          <MainButton
            type="primary"
            htmlTag="a"
            text="Create your workspace"
            href="/register"
            size="large"
          />
        </section>
      </main>

      <Footer />
    </div>
  );
}

function ProductImage({
  src,
  alt,
  compact = false,
}: {
  src: string;
  alt: string;
  compact?: boolean;
}) {
  return (
    <div
      className={`${Styles.productImage} ${compact ? Styles.compactImage : ""}`}
    >
      <Image
        src={src}
        alt={alt}
        fill
        sizes={
          compact
            ? "(max-width: 900px) 94vw, 56vw"
            : "(max-width: 900px) 94vw, 1200px"
        }
      />
    </div>
  );
}
