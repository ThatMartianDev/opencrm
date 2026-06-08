"use client";

import Styles from "./ViewModeSelector.module.css";

type ViewMode = "week" | "month";

type ViewModeSelectorProps = {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
};

const ViewModeSelector = ({ value, onChange }: ViewModeSelectorProps) => {
  return (
    <div className={Styles.selector}>
      <button
        className={`${Styles.option} ${value === "week" ? Styles.active : ""}`}
        onClick={() => onChange("week")}
      >
        Week
      </button>
      <button
        className={`${Styles.option} ${value === "month" ? Styles.active : ""}`}
        onClick={() => onChange("month")}
      >
        Month
      </button>
    </div>
  );
};

export default ViewModeSelector;
