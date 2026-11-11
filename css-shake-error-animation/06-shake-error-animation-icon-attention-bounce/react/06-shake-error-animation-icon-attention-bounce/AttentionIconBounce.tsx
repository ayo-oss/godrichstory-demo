import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./AttentionIconBounce.module.scss";

export type AttentionIconBounceProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function AttentionIconBounce({ duration = 700, easing = "cubic-bezier(.2,1.4,.4,1)", color = "#c2361a" }: AttentionIconBounceProps) {
  const [run, setRun] = useState(0);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <div className={styles.ib} style={vars} onClick={() => setRun((n) => n + 1)}>
      <span key={run} className={`${styles.icon} ${styles.bounce}`} aria-hidden="true">!</span>
      <p className={styles.msg}>필수 항목입니다</p>
    </div>
  );
}
