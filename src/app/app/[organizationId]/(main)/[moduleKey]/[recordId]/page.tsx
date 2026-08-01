import RecordItemPage from "@/modules/RecordModule/ui/RecordItemPage/RecordItemPage";
import { getRecordModuleRecord } from "@/modules/RecordModule/actions";

type PageProps = {
  params: Promise<{
    organizationId: string;
    moduleKey: string;
    recordId: string;
  }>;
};

const Page = async ({ params }: PageProps) => {
  const { moduleKey, recordId } = await params;
  const initialRecord = await getRecordModuleRecord(moduleKey, recordId);

  return (
    <RecordItemPage
      key={recordId}
      moduleKey={moduleKey}
      recordId={recordId}
      initialRecord={initialRecord}
    />
  );
};

export default Page;