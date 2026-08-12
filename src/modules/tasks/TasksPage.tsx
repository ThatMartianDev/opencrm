"use client";

import { TaskListSquareLtrFilled } from "@fluentui/react-icons";
import TaskList from "./components/TaskList";
import Styles from "./TasksPage.module.css";
import { useEffect } from "react";
import type { getTasks } from "./actions";
import { useWorkspaceData } from "@/modules/workspace/components/workspace-provider";

type TasksPageProps = {
    initialPage: Awaited<ReturnType<typeof getTasks>>;
};

const TasksPage = ({ initialPage }: TasksPageProps) => {
    const { member } = useWorkspaceData();
    const authorizationKey = `${member.id}:${member.role}:${member.permissions.join(",")}`;

    useEffect(() => {
        window.document.title = "Tasks";
    }, []);
    
    return (
        <div className={Styles.tasksPage}>
            <header className="global_header">
                <div className="g_header_section_name">
                    <span style={{ backgroundColor: "rgba(14, 118, 185, 1)" }}>
                        <TaskListSquareLtrFilled fontSize={20} color="#fff" />
                    </span>
                    <h2>Tasks</h2>
                </div>
            </header>
            <TaskList
                key={authorizationKey}
                showHeader={false}
                showTabsHeader
                initialPage={initialPage}
            />
        </div>
    );
};

export default TasksPage;
