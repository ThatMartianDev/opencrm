import type { Metadata } from "next";

import LegalDocument from "@/website/legal/LegalDocument/LegalDocument";
import PrivacyPolicyContent, {
  privacyPolicySections,
} from "@/website/legal/content/PrivacyPolicyContent";

export const metadata: Metadata = {
  title: "UntitledCRM — Privacy Policy",
  description:
    "How information is collected, used, stored, and shared during the public beta.",
};

export default function PrivacyPolicyPage() {
  return (
    <LegalDocument
      title="Privacy Policy"
      description="How information is collected, used, stored, and shared when you use the public beta."
      sections={privacyPolicySections}
    >
      <PrivacyPolicyContent />
    </LegalDocument>
  );
}