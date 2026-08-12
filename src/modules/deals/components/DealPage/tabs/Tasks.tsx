"use client";

import { useParams } from "next/navigation";
import TaskList from "@/modules/tasks/components/TaskList";

const TasksTab = () => {
    const { dealId } = useParams<{ dealId: string }>();

    return (
        <TaskList dealId={dealId} showHeader={false} />
    );
};

export default TasksTab;