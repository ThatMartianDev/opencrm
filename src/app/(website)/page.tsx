import type { Metadata } from "next";

import HomePage from "@/website/product/Homepage/HomePage";

export const metadata: Metadata = {
  title: "UntitledCRM | Less CRM maintenance. More actual work.",
  description:
    "Turn customer information into action without spending your day maintaining the CRM.",
};

export default function Page() {
  return <HomePage />;
}