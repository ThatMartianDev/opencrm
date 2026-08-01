import { AddRegular, HistoryRegular } from "@fluentui/react-icons";
import Styles from "./RecordActivityLog.module.css";

const RecordActivityLog = () => {
  return (
    <aside className={Styles.activityLog}>
      <div className={Styles.header}>
        <h3>
          <HistoryRegular fontSize={18} />
          Activity
        </h3>
        <button type="button" disabled title="Activity logging is not available yet">
          <AddRegular fontSize={14} />
          Log Activity
        </button>
      </div>
      <div className={Styles.empty}>No activity yet</div>
    </aside>
  );
};

export default RecordActivityLog;