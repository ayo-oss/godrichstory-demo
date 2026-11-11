import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./ShakeHorizontal.module.scss";

export type ShakeHorizontalProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function ShakeHorizontal({ duration = 500, easing = "ease-out", color = "#c2361a" }: ShakeHorizontalProps) {
  const [invalid, setInvalid] = useState(true);
  const [run, setRun] = useState(0);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <div className={styles.sh} style={vars}>
      <label className={styles.label} htmlFor="sh-email">이메일</label>
      <input
        key={run}
        id="sh-email"
        className={`${styles.input} ${invalid ? styles.shake : ""}`}
        type="email"
        defaultValue="wrong@mail"
        readOnly
        onBlur={() => { setInvalid(true); setRun((n) => n + 1); }}
      />
      <p className={styles.msg}>올바른 이메일 형식이 아닙니다</p>
    </div>
  );
}
