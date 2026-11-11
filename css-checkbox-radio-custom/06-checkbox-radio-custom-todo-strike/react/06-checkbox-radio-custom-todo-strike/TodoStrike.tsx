import { useState } from "react";
import type { CSSProperties, ChangeEvent } from "react";
import styles from "./TodoStrike.module.scss";

export type TodoStrikeProps = {
  label?: string;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function TodoStrike({
  label = "Submit report",
  duration = 300,
  easing = "ease-out",
  color = "#17141a",
}: TodoStrikeProps) {
  const [done, setDone] = useState(false);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <label className={styles.todo} style={vars}>
      <input
        type="checkbox"
        className={styles.srInput}
        checked={done}
        onChange={(e: ChangeEvent<HTMLInputElement>) => setDone(e.target.checked)}
      />
      <span className={styles.box} aria-hidden="true">
        {done && <span className={styles.check}>✓</span>}
      </span>
      <span className={styles.text}>
        <span className={styles.label} data-done={done}>{label}</span>
        <span className={styles.strike} data-done={done} aria-hidden="true" />
      </span>
    </label>
  );
}
