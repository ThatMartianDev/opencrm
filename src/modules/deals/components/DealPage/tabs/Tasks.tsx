"use client";

import { useParams } from "next/navigation";
import TaskList from "@/modules/tasks/components/TaskList";
import { useModal } from "@/components/macro/ModalProvider/ModalProvider";

const TasksTab = () => {
    const { dealId } = useParams<{ dealId: string }>();
    const { openModal } = useModal();

    function handleCreateTask() {
        openModal("task", { dealId });
    }

    return (
        <TaskList dealId={dealId} showHeader={false} />
    );
};

export default TasksTab;