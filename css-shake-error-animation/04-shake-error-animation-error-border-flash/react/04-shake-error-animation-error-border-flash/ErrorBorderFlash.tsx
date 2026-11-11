import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./ErrorBorderFlash.module.scss";

export type ErrorBorderFlashProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function ErrorBorderFlash({ duration = 500, easing = "ease-in-out", color = "#c2361a" }: ErrorBorderFlashProps) {
  const [run, setRun] = useState(0);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <div className={styles.bf} style={vars}>
      <div className={styles.field}>
        <input className={styles.input} type="text" placeholder="카드 번호" defaultValue="1234" onFocus={() => setRun((n) => n + 1)} />
        <span key={run} className={`${styles.ring} ${styles.flash}`} aria-hidden="true" />
      </div>
      <p className={styles.msg}>카드 번호를 확인하세요</p>
    </div>
  );
}
