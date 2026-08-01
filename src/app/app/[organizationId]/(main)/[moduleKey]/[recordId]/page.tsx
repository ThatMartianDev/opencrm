import RecordItemPage from "@/modules/RecordModule/ui/RecordItemPage/RecordItemPage";

type PageProps = {
  params: Promise<{
    organizationId: string;
    moduleKey: string;
    recordId: string;
  }>;
};

const Page = async ({ params }: PageProps) => {
  const { moduleKey, recordId } = await params;
  return <RecordItemPage moduleKey={moduleKey} recordId={recordId} />;
};

export default Page;