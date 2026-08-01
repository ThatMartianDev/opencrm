import RecordsModulePage from "@/modules/RecordModule/ui/RecordsModulePage/RecordsModulePage";
import { getRecordModulePage } from "@/modules/RecordModule/actions";

type PageProps = {
  params: Promise<{
    organizationId: string;
    moduleKey: string;
  }>;
};

const Page = async ({ params }: PageProps) => {
  const { moduleKey } = await params;
  const initialData = await getRecordModulePage(moduleKey, {
    page: 1,
    pageSize: 50,
    search: "",
  });

  return (
    <RecordsModulePage
      key={moduleKey}
      moduleKey={moduleKey}
      initialData={initialData}
    />
  );
};

export default Page;