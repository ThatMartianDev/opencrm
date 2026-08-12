import { ActivityLog } from "@/modules/activity-log";
import Styles from "./RecordActivityLog.module.css";

const RecordActivityLog = ({
  recordId,
  refreshKey,
}: {
  recordId: string;
  refreshKey: number;
}) => (
  <ActivityLog
    className={Styles.activityLog}
    entityType="record"
    entityId={recordId}
    refreshKey={refreshKey}
  />
);

export default RecordActivityLog;