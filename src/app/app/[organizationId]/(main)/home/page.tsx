
import {
    checkCalendarConnection,
    fetchCalendarEvents,
} from "@/modules/calendar/actions";
import { getUpcomingTasks } from "@/modules/tasks/actions";

import HomeDashboard from "./HomeDashboard";

const DashboardPage = async () => {
    const now = new Date();
    const calendarEnd = new Date(now);
    calendarEnd.setDate(calendarEnd.getDate() + 30);

    const [tasksResult, connectionResult] = await Promise.allSettled([
        getUpcomingTasks(6),
        checkCalendarConnection(),
    ]);

    const tasks = tasksResult.status === "fulfilled" ? tasksResult.value : [];
    const calendarConnected =
        connectionResult.status === "fulfilled" && connectionResult.value.connected;

    let events: Awaited<ReturnType<typeof fetchCalendarEvents>> = [];
    if (calendarConnected) {
        try {
            events = (
                await fetchCalendarEvents(now.toISOString(), calendarEnd.toISOString())
            ).slice(0, 5);
        } catch {
            events = [];
        }
    }

    return (
        <HomeDashboard
            initialTasks={tasks}
            events={events}
            calendarConnected={calendarConnected}
        />
    );
};

export default DashboardPage;