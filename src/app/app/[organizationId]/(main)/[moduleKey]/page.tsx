import RecordsModulePage from "@/modules/RecordModule/ui/RecordsModulePage/RecordsModulePage";

type PageProps = {
  params: Promise<{
    organizationId: string;
    moduleKey: string;
  }>;
};

const Page = async ({ params }: PageProps) => {
  const { moduleKey } = await params;
  return <RecordsModulePage moduleKey={moduleKey} />;
};

export default Page;