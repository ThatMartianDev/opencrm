import type { Metadata } from "next";

import FeedbackPage from "@/website/contact/FeedbackPage/FeedbackPage";

export const metadata: Metadata = {
  title: "UntitledCRM — Feedback",
  description:
    "Report a bug, request a feature, or share an improvement during the public beta.",
};

export default function Page() {
  return <FeedbackPage />;
}