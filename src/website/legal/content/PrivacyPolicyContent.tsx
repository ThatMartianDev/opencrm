export const privacyPolicySections = [
  { id: "introduction", title: "Introduction" },
  { id: "information-collected", title: "Information collected" },
  { id: "workspace-data", title: "Workspace and CRM data" },
  { id: "information-use", title: "How information is used" },
  { id: "ai", title: "AI functionality" },
  { id: "sharing", title: "Sharing information" },
  { id: "cookies", title: "Cookies and similar technologies" },
  { id: "retention", title: "Data retention" },
  { id: "security", title: "Security" },
  { id: "choices", title: "User choices and rights" },
  { id: "international", title: "International transfers" },
  { id: "children", title: "Children's privacy" },
  { id: "changes", title: "Changes to this policy" },
  { id: "contact", title: "Contact" },
] as const;

export default function PrivacyPolicyContent() {
  return (
    <>
      <section id="introduction">
        <h2>1. Introduction</h2>
        <p>
          UntitledCRM is the current working name of a multi-tenant customer
          relationship management service (the &quot;Service&quot;). This Privacy Policy
          explains how information is collected, used, stored, and shared when
          you use the Service.
        </p>
        <p>
          The Service is currently in public beta. Its features and data
          practices may evolve as development continues. Material changes will
          be reflected in an updated version of this policy.
        </p>
      </section>

      <section id="information-collected">
        <h2>2. Information collected</h2>

        <h3>Account and authentication information</h3>
        <p>
          The Service collects your name, email address, optional profile image,
          email-verification information, and a password hash when you register
          with a password. If you use Google authentication, the Service
          receives the account identifiers and profile information needed to
          sign you in. Passwords are processed for authentication and stored as
          hashes rather than plain text.
        </p>

        <h3>Workspace information</h3>
        <p>
          The Service stores workspace names, URLs or slugs, optional logos,
          settings, membership records, roles, permissions, and invitations.
          One account may belong to multiple workspaces.
        </p>

        <h3>CRM records and user content</h3>
        <p>
          You and other workspace members may create contacts, companies,
          deals, tasks, notes, custom records, fields, relationships, activity
          entries, calendar events, emails, and other business information.
          Records may include names, contact details, commercial information,
          communications, dates, assignments, and free-form content.
        </p>

        <h3>Files</h3>
        <p>
          The Service processes files and profile or workspace images that you
          choose to upload, together with metadata such as file name, size,
          type, storage location, and the CRM record to which a file is linked.
        </p>

        <h3>Connected services</h3>
        <p>
          When you choose to connect Google Gmail or Google Calendar, the
          Service stores authorization tokens and account details needed to
          operate that connection. Depending on the connection, it may process
          email sender and recipient details, subjects, message bodies, labels,
          calendar events, attendees, dates, and synchronization identifiers.
        </p>

        <h3>Service activity and operational information</h3>
        <p>
          The Service records timestamps, CRM activity history, notification
          and delivery status, AI run status, proposed actions, results, and
          errors needed to provide and troubleshoot product functionality.
          Application errors may also be written to operational server logs.
          No product analytics or advertising-tracking integration is currently
          implemented in the application source.
        </p>

        <h3>Feedback</h3>
        <p>
          When you submit feedback, the Service collects your selected feedback
          type, message, and email address. The submission is delivered to the
          service operator by email and is not stored in the application
          database.
        </p>
      </section>

      <section id="workspace-data">
        <h2>3. Workspace and CRM data</h2>
        <p>
          CRM data often concerns your customers, prospects, employees,
          suppliers, or other third parties rather than only the account holder.
          You and your workspace are responsible for having an appropriate
          legal basis and authority to enter, upload, connect, and use that
          information in the Service.
        </p>
        <p>
          Workspace content is made available to members according to their
          role and permissions. Workspace owners and administrators control
          membership and may grant access that allows other members to view,
          create, update, or delete content.
        </p>
      </section>

      <section id="information-use">
        <h2>4. How information is used</h2>
        <p>Information is used to:</p>
        <ul>
          <li>create accounts, authenticate users, and maintain sessions;</li>
          <li>create and manage workspaces, memberships, and permissions;</li>
          <li>provide CRM records, search, files, email, calendar, and collaboration features;</li>
          <li>process instructions and perform user-requested actions;</li>
          <li>provide AI-assisted features such as Quick Catcher;</li>
          <li>send verification, invitation, and product notifications;</li>
          <li>protect the Service, enforce access controls, and limit certain abusive requests;</li>
          <li>diagnose errors and improve product reliability and functionality; and</li>
          <li>review feedback, respond when needed, and decide what to improve;</li>
          <li>respond to legal obligations and legitimate operational needs.</li>
        </ul>
      </section>

      <section id="ai">
        <h2>5. AI functionality</h2>
        <p>
          Quick Catcher uses AI to interpret a natural-language instruction and
          return structured proposed CRM actions. To provide this feature, the
          Service may send the instruction, relevant conversation history,
          workspace module and field definitions, and relevant record search or
          relationship results to an AI service operated through Azure OpenAI.
        </p>
        <p>
          The Service stores information about AI runs, including input,
          context, responses, proposed actions, results, errors, model details,
          and timing. The current codebase does not establish the AI provider&apos;s
          retention or model-training treatment of submitted information.
          Review the applicable provider terms and avoid submitting information
          you are not authorized to process.
        </p>
      </section>

      <section id="sharing">
        <h2>6. Sharing information</h2>
        <p>Information may be shared with:</p>
        <ul>
          <li>
            <strong>Workspace members</strong> according to workspace roles and
            permissions.
          </li>
          <li>
            <strong>Infrastructure and storage providers</strong>, including
            Supabase-hosted database and object-storage services, as needed to
            host and operate the Service.
          </li>
          <li>
            <strong>Google services</strong> when you choose Google sign-in,
            Gmail, or Google Calendar integrations.
          </li>
          <li>
            <strong>AI providers</strong>, currently Azure OpenAI, when you use
            AI-assisted functionality.
          </li>
          <li>
            <strong>Email delivery providers</strong> used to send verification
            codes, invitations, service messages, and feedback submissions.
          </li>
          <li>
            <strong>Authorities or other parties</strong> when disclosure is
            required by law, necessary to protect rights or security, or
            otherwise legally permitted.
          </li>
        </ul>
        <p>
          Optional third-party integrations are activated by a user and may be
          governed by the third party&apos;s own terms and privacy policy.
        </p>
      </section>

      <section id="cookies">
        <h2>7. Cookies and similar technologies</h2>
        <p>
          The Service uses essential, first-party cookies for authentication and
          security. These include a session cookie, a temporary registration
          cookie, temporary workspace-selection or workspace-creation cookies,
          and short-lived state cookies used to protect Google connection flows.
          Session cookies may remain valid for up to seven days; temporary flow
          cookies expire sooner.
        </p>
        <p>
          These cookies are used to sign users in, preserve the current
          workspace flow, and validate integration requests. The application
          does not currently implement analytics or advertising cookies, or
          application-specific localStorage or sessionStorage use.
        </p>
      </section>

      <section id="retention">
        <h2>8. Data retention</h2>
        <p>
          The Service does not currently define a single fixed retention period
          for account and workspace data. Information is generally retained
          while an account or workspace remains active and as needed to provide
          the Service, unless a user with appropriate permissions deletes it.
        </p>
        <p>
          Some CRM records use soft deletion, which hides the record while
          retaining it in the database. Other content, including individual
          files and certain records, may be deleted directly. Disconnecting a
          Gmail mailbox removes its locally synchronized email records and the
          associated connection record; token revocation is attempted with
          Google.
        </p>
        <p>
          Workspace owners can delete a workspace. The current implementation
          deletes the workspace and associated database records. Uploaded file
          objects and residual provider backups may not be removed at the same
          time, and no fixed backup-retention period currently applies.
        </p>
        <p>
          You may delete your account through user settings. After confirmation,
          the Service deletes your account, memberships, workspaces you own, and
          the active CRM data associated with those owned workspaces. Uploaded
          file objects and residual provider backups may take additional time to
          remove.
        </p>
        <p>
          Feedback is not retained in the application database. A delivered
          feedback message may remain in the operator&apos;s mailbox and with the
          email delivery provider until it is no longer needed, subject to those
          providers&apos; retention and deletion practices.
        </p>
      </section>

      <section id="security">
        <h2>9. Security</h2>
        <p>
          The Service uses measures including hashed passwords, authenticated
          sessions, secure and HTTP-only cookie settings in production,
          workspace-scoped access controls, role and permission checks, OAuth
          state validation, and rate limits on selected authentication and
          workspace actions.
        </p>
        <p>
          No method of storage or transmission is completely secure. The
          Service cannot guarantee absolute security, and no security
          certification is claimed by this policy.
        </p>
      </section>

      <section id="choices">
        <h2>10. User choices and rights</h2>
        <p>
          Depending on your role and permissions, you may update your profile,
          create or delete CRM content, disconnect Gmail, manage workspace
          members, and, if you are the owner, delete a workspace. Account
          deletion is available through user settings. A general data-export
          tool is not currently available as a self-service feature.
        </p>
        <p>
          You may have additional rights under the law where you live, such as
          rights to access, correct, delete, restrict, or receive certain
          personal information. Contact details for making a request are listed
          below. Requests may need to be verified and may be subject to lawful
          exceptions.
        </p>
      </section>

      <section id="international">
        <h2>11. International transfers</h2>
        <p>
          The Service relies on cloud, Google, email-delivery, and AI providers
          that may process information outside your country, including in
          countries with different data-protection laws. By using the Service,
          you understand that these providers may process information in the
          locations where they operate, subject to their applicable terms and
          safeguards.
        </p>
      </section>

      <section id="children">
        <h2>12. Children&apos;s privacy</h2>
        <p>
          The Service is a business product and is not intended for anyone under
          18. Do not create an account if you are under 18. Workspace users must
          not add children&apos;s personal information unless they have a lawful
          basis and appropriate authority to do so.
        </p>
      </section>

      <section id="changes">
        <h2>13. Changes to this Privacy Policy</h2>
        <p>
          This policy may be updated as the beta evolves, providers change, or
          legal requirements develop. The updated policy will show a revised
          &quot;Last updated&quot; date. Where required by applicable law, additional
          notice or consent will be provided.
        </p>
      </section>

      <section id="contact">
        <h2>14. Contact</h2>
        <p>
          The Service is operated by Ahmed Mohammed. For privacy questions,
          access requests, or deletion requests, email{" "}
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