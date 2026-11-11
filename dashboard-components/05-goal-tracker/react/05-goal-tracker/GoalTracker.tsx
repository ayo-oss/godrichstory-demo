import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./GoalTracker.module.scss";

export type GoalTrackerProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const STEPS = [
  { label: "Sign up", p: 25 },
  { label: "First payment", p: 50 },
  { label: "Integration", p: 75 },
  { label: "Done", p: 100 },
];

export default function GoalTracker({ duration = 300, easing = "ease-out", color = "#4cd4a6" }: GoalTrackerProps) {
  const [idx, setIdx] = useState(0);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <div className={styles.gt} style={vars}>
      <div className={styles.top}>
        <span className={styles.ic}>◎</span>
        <strong className={styles.title}>Subscription goal</strong>
        <span className={styles.pct}>{idx + 1} / {STEPS.length}</span>
      </div>
      <div className={styles.track}>
        <div className={styles.fill} style={{ transform: `scaleX(${STEPS[idx].p / 100})` }} />
      </div>
      <ol className={styles.steps}>
        {STEPS.map((s, i) => (
          <li key={s.label} className={styles.step}>
            <span className={styles.dot}>
              <span className={`${styles.check} ${i <= idx ? styles.active : ""}`}>✓</span>
            </span>
            <span className={`${styles.label} ${i <= idx ? styles.activeLabel : ""}`}>{s.label}</span>
          </li>
        ))}
      </ol>
      {idx < STEPS.length - 1 && (
        <button type="button" className={styles.next} onClick={() => setIdx((i) => Math.min(i + 1, STEPS.length - 1))}>
          Next step
        </button>
      )}
    </div>
  );
}
