import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./ReducedMotionOutline.module.scss";

export type ReducedMotionOutlineProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function ReducedMotionOutline({ duration = 500, easing = "ease-out", color = "#c2361a" }: ReducedMotionOutlineProps) {
  const [run, setRun] = useState(0);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <div className={styles.rm} style={vars}>
      <label className={styles.label} htmlFor="rm-msg">문의 내용</label>
      <div className={styles.field}>
        <textarea key={run} id="rm-msg" rows={2} className={`${styles.textarea} ${styles.invalid}`} onFocus={() => setRun((n) => n + 1)} />
        <span key={`ring-${run}`} className={`${styles.ring} ${styles.invalid}`} aria-hidden="true" />
      </div>
      <p className={styles.msg}>10자 이상 입력해야 합니다</p>
    </div>
  );
}
