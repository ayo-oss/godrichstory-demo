import { CSSProperties, useState } from "react";
import styles from "./KeyRetrigger.module.scss";

function Badge({ value }: { value: number; key?: number }) {
  // The key on this element (set by the caller below) forces React to unmount and
  // remount it on every change, so the pop-in @keyframes — which only plays once per
  // mount — replays from scratch each time the score bumps.
  return <span className={styles.badge}>+{value}</span>;
}

export interface KeyRetriggerProps {
  duration?: string;
  easing?: string;
}

export default function KeyRetrigger({
  duration = "640ms",
  easing = "cubic-bezier(.2, 1.4, .4, 1)",
}: KeyRetriggerProps) {
  const [score, setScore] = useState(120);

  const style: CSSProperties & { "--duration"?: string; "--easing"?: string } = {
    "--duration": duration,
    "--easing": easing,
  };

  return (
    <div className={styles.wrap} style={style}>
      <span className={styles.label}>Score</span>
      <Badge key={score} value={score} />
      <button className={styles.btn} onClick={() => setScore((s) => s + 10)}>+10</button>
    </div>
  );
}
