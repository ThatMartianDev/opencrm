import { Suspense } from "react";
import EmailsPage from "@/modules/emails/EmailsPage";

const Page = () => {
  return (
    <Suspense>
      <EmailsPage />
    </Suspense>
  );
};

export default Page;
