import TasksPage from "@/modules/tasks/TasksPage";
import { getTasks } from "@/modules/tasks/actions";

const Page = async () => {
    const initialPage = await getTasks();

    return (
        <div>
            <TasksPage initialPage={initialPage} />
        </div>
    );
};

export default Page;
