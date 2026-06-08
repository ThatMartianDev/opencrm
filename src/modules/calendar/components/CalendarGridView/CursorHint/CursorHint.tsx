"use client";

import { AddRegular } from "@fluentui/react-icons";
import Styles from "./CursorHint.module.css";

type CursorHintProps = {
  x: number;
  y: number;
  visible: boolean;
};

const CursorHint = ({ x, y, visible }: CursorHintProps) => {
  if (!visible) return null;

  return (
    <div
      className={Styles.cursorHint}
      style={{ left: x + 14, top: y + 14 }}
    >
      <AddRegular fontSize={14} />
      <span>Add event</span>
    </div>
  );
};

export default CursorHint;
