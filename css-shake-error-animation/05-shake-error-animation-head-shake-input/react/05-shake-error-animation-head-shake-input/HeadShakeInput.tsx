import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./HeadShakeInput.module.scss";

export type HeadShakeInputProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function HeadShakeInput({ duration = 900, easing = "ease-out", color = "#c2361a" }: HeadShakeInputProps) {
  const [run, setRun] = useState(0);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <div className={styles.hs} style={vars}>
      <label className={styles.label} htmlFor="hs-pw">비밀번호 확인</label>
      <input
        key={run}
        id="hs-pw"
        className={`${styles.input} ${styles.shake}`}
        type="password"
        defaultValue="wrongpass"
        readOnly
        onFocus={() => setRun((n) => n + 1)}
      />
      <p className={styles.msg}>비밀번호가 일치하지 않습니다</p>
    </div>
  );
}
