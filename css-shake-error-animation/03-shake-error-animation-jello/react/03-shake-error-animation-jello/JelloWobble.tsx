import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./JelloWobble.module.scss";

export type JelloWobbleProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function JelloWobble({ duration = 800, easing = "ease-out", color = "#c2361a" }: JelloWobbleProps) {
  const [run, setRun] = useState(0);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <div className={styles.je} style={vars}>
      <button key={run} type="button" className={`${styles.btn} ${styles.jello}`} onClick={() => setRun((n) => n + 1)}>
        저장
      </button>
      <p className={styles.msg}>저장하지 못했습니다. 다시 시도하세요</p>
    </div>
  );
}
