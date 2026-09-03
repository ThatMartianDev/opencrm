import type { Metadata } from "next";

import LegalDocument from "@/website/legal/LegalDocument/LegalDocument";
import UserAgreementContent, {
  userAgreementSections,
} from "@/website/legal/content/UserAgreementContent";

export const metadata: Metadata = {
  title: "UntitledCRM — User Agreement",
  description: "Terms for creating an account and using the public beta.",
};

export default function UserAgreementPage() {
  return (
    <LegalDocument
      title="User Agreement"
      description="The terms that apply when you create an account or use the public beta."
      sections={userAgreementSections}
    >
      <UserAgreementContent />
    </LegalDocument>
  );
}