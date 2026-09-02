import Link from "next/link";

export const userAgreementSections = [
  { id: "acceptance", title: "Acceptance" },
  { id: "service", title: "The service" },
  { id: "accounts", title: "Accounts" },
  { id: "workspaces", title: "Workspaces and organizations" },
  { id: "user-content", title: "User content" },
  { id: "acceptable-use", title: "Acceptable use" },
  { id: "ai", title: "AI features" },
  { id: "beta", title: "Beta status" },
  { id: "third-parties", title: "Third-party services" },
  { id: "intellectual-property", title: "Intellectual property" },
  { id: "feedback", title: "Feedback" },
  { id: "termination", title: "Suspension and termination" },
  { id: "disclaimers", title: "Disclaimers" },
  { id: "liability", title: "Limitation of liability" },
  { id: "changes", title: "Changes to this agreement" },
  { id: "governing-law", title: "Governing law" },
  { id: "contact", title: "Contact" },
] as const;

export default function UserAgreementContent() {
  return (
    <>
      <section id="acceptance">
        <h2>1. Acceptance</h2>
        <p>
          By creating an account or using UntitledCRM (the &quot;Service&quot;), you agree
          to this User Agreement and acknowledge the <Link href="/legal/privacy-policy">Privacy Policy</Link>,
          subject to applicable law. If you use the Service for an organization,
          you represent that you have authority to accept this agreement for
          that organization.
        </p>
        <p>
          If you do not agree, do not create an account or use the Service.
        </p>
      </section>

      <section id="service">
        <h2>2. The service</h2>
        <p>
          The Service is customer relationship management software currently
          offered in public beta. It supports workspaces, CRM and custom
          records, collaboration, tasks, notes, files, connected email and
          calendar features, notifications, and AI-assisted workflows.
        </p>
        <p>
          During development, features may be added, changed, or removed; bugs
          may occur; availability may vary; and workflows or interfaces may
          change. Roadmap items and previews are not commitments to deliver a
          feature on a particular date or at all.
        </p>
      </section>

      <section id="accounts">
        <h2>3. Accounts</h2>
        <p>
          You must provide accurate account information and keep it reasonably
          current. You are responsible for protecting your password and
          connected-account credentials, for activity under your account, and
          for using secure devices and networks when accessing the Service.
        </p>
        <p>
          You must promptly report suspected unauthorized access through the
          contact channel listed below. You may not share credentials in a way
          that bypasses workspace membership or permission controls.
        </p>
      </section>

      <section id="workspaces">
        <h2>4. Workspaces and organizations</h2>
        <p>
          An account may create or join multiple workspaces. Workspace owners
          and administrators may invite members and manage membership, roles,
          and permissions. They are responsible for granting appropriate access,
          removing access when it is no longer needed, and ensuring workspace
          use complies with applicable law and organizational requirements.
        </p>
        <p>
          Members may only access and act on workspace information as permitted
          by their assigned role, permissions, and the authority given to them
          by the workspace.
        </p>
      </section>

      <section id="user-content">
        <h2>5. User content</h2>
        <h3>User Content</h3>
        <p>
          &quot;User Content&quot; means information that you or other workspace members
          create, upload, connect, or store through the Service, including CRM
          records, communications, notes, files, custom fields, and related
          business information. You retain the rights you have in User Content.
        </p>
        <p>
          You grant the service operator a limited, non-exclusive right to host,
          store, process, transmit, display, and otherwise use User Content only
          as reasonably necessary to operate, secure, support, and provide the
          Service and user-requested integrations. This does not transfer
          ownership of User Content.
        </p>
        <h3>The Service</h3>
        <p>
          The Service, including its application, software, design, branding,
          underlying technology, and documentation, is separate from User
          Content and is protected as described in section 10.
        </p>
        <p>
          You are responsible for ensuring you have the rights, notices,
          permissions, and lawful basis needed to submit and use User Content,
          including personal information about customers and other third
          parties.
        </p>
      </section>

      <section id="acceptable-use">
        <h2>6. Acceptable use</h2>
        <p>You must not use the Service to:</p>
        <ul>
          <li>break the law or facilitate unlawful activity;</li>
          <li>access accounts, workspaces, records, or systems without authorization;</li>
          <li>bypass security, authentication, permissions, rate limits, or other safeguards;</li>
          <li>upload or distribute malware or harmful code;</li>
          <li>disrupt, overload, damage, or interfere with the Service or its infrastructure;</li>
          <li>use scraping, bots, or other automated access without prior written permission;</li>
          <li>submit content you do not have the right to use or process; or</li>
          <li>infringe privacy, intellectual-property, confidentiality, or other rights.</li>
        </ul>
      </section>

      <section id="ai">
        <h2>7. AI features</h2>
        <p>
          AI-assisted features, including Quick Catcher, may produce inaccurate,
          incomplete, or inappropriate proposed actions. You are responsible for
          reviewing AI output and confirming that resulting records or actions
          are accurate, authorized, and suitable before relying on them.
        </p>
        <p>
          Do not submit information to an AI feature unless you are authorized
          to process it. Additional information about AI processing appears in
          the <Link href="/legal/privacy-policy#ai">Privacy Policy</Link>.
        </p>
      </section>

      <section id="beta">
        <h2>8. Beta status</h2>
        <p>
          The Service is actively being developed. Beta functionality may be
          experimental, incomplete, changed without notice, or temporarily
          unavailable. You should maintain appropriate copies of important
          information and independently verify critical actions and records.
        </p>
        <p>
          The beta status does not limit rights or remedies that cannot legally
          be limited under applicable law.
        </p>
      </section>

      <section id="third-parties">
        <h2>9. Third-party services</h2>
        <p>
          The Service relies on third parties for hosting and storage, Google
          authentication and optional Gmail or Calendar connections, email
          delivery, and Azure OpenAI processing. A connection is only available
          where implemented and may require you to authorize the third party.
        </p>
        <p>
          Third-party services are governed by their own terms and policies and
          may change or become unavailable independently of the Service. The
          service operator is not responsible for third-party services except to
          the extent required by applicable law.
        </p>
      </section>

      <section id="intellectual-property">
        <h2>10. Intellectual property</h2>
        <p>
          The service operator and its licensors retain their rights in the
          Service, including the software, interface, design, branding,
          documentation, and underlying technology. Except for the limited right
          to use the Service under this agreement, no intellectual-property
          rights are transferred to you.
        </p>
        <p>This section does not give the service operator ownership of User Content.</p>
      </section>

      <section id="feedback">
        <h2>11. Feedback</h2>
        <p>
          You may submit suggestions, ideas, bug reports, feature requests, and
          other feedback. You allow the service operator to use, adapt, and
          incorporate that feedback to develop and improve the Service without
          restriction or compensation. This permission applies to feedback, not
          to unrelated User Content or customer data.
        </p>
      </section>

      <section id="termination">
        <h2>12. Suspension and termination</h2>
        <p>
          Access to an account or workspace may be restricted, suspended, or
          terminated for material violations of this agreement, abuse, security
          concerns, legal requirements, risks to other users or the Service, or
          other legitimate operational reasons. Where appropriate and legally
          permitted, reasonable efforts may be made to provide notice.
        </p>
        <p>
          You may terminate your account through user settings. After you
          confirm deletion, the Service will immediately delete your account,
          memberships, workspaces you own, and the active CRM data associated
          with those owned workspaces. Workspace owners may also delete an
          individual workspace and its associated active CRM data without
          deleting their account.
        </p>
        <p>
          Uploaded file objects and residual provider backups may not be removed
          at the same time as active database records. No fixed post-termination
          or backup-retention period currently applies, and deletion may take
          time to complete across service providers.
        </p>
      </section>

      <section id="disclaimers">
        <h2>13. Disclaimers</h2>
        <p>
          To the extent permitted by applicable law, the Service is provided on
          an &quot;as is&quot; and &quot;as available&quot; basis during beta. No guarantee is made
          that the Service will be uninterrupted, error-free, secure, permanently
          available, or suitable for every business, legal, accounting, or
          compliance purpose.
        </p>
        <p>
          You remain responsible for your business decisions, the accuracy and
          legality of User Content, configuration of workspace access, review of
          AI-assisted output, and appropriate backups or records required for
          your operations.
        </p>
      </section>

      <section id="liability">
        <h2>14. Limitation of liability</h2>
        <p>
          To the fullest extent permitted by law, the service operator will not
          be liable for indirect, incidental, special, consequential, exemplary,
          or punitive damages, or for lost profits, revenue, business, goodwill,
          or data, arising from or related to the Service.
        </p>
        <p>
          Nothing in this agreement excludes or limits liability that cannot be
          excluded or limited under applicable law.
        </p>
        <p>
          To the fullest extent permitted by law, the service operator&apos;s total
          liability arising from or related to the Service will not exceed the
          fees you paid to the Service during the 12 months before the event
          giving rise to the claim. This cap may be zero where no fees were paid.
        </p>
      </section>

      <section id="changes">
        <h2>15. Changes to this agreement</h2>
        <p>
          This agreement may be updated as the beta, business terms, providers,
          or legal requirements evolve. The updated agreement will show a
          revised &quot;Last updated&quot; date. Where required by applicable law,
          additional notice or renewed acceptance will be requested.
        </p>
      </section>

      <section id="governing-law">
        <h2>16. Governing law</h2>
        <p>
          This agreement is governed by the laws of Egypt, without regard to
          conflict-of-law principles. Subject to any rights that applicable law
          does not allow you to waive, disputes arising from this agreement or
          the Service will be submitted to the competent courts of Egypt.
        </p>
      </section>

      <section id="contact">
        <h2>17. Contact</h2>
        <p>
          The Service is operated by Ahmed Mohammed. For questions about this
          agreement, email{" "}
          <a href="mailto:thatmartiandev@gmail.com">thatmartiandev@gmail.com</a>.
        </p>
        <p>
          You can also find the operator on{" "}
          <a href="http://github.com/ThatMartianDev">GitHub</a> and{" "}
          <a href="https://www.linkedin.com/in/ahmed-mohammed-tmd">LinkedIn</a>.
        </p>
      </section>
    </>
  );
}