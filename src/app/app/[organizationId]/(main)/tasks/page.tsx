import TasksPage from "@/modules/tasks/TasksPage";
import { getTasks } from "@/modules/tasks/actions";

const Page = async () => {
  const initialPage = await getTasks();

  return <TasksPage initialPage={initialPage} />;
};

export default Page;
