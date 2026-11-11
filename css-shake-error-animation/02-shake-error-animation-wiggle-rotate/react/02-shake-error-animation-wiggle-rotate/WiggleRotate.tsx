import { useState } from "react";
import type { CSSProperties, ChangeEvent } from "react";
import styles from "./WiggleRotate.module.scss";

export type WiggleRotateProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function WiggleRotate({ duration = 600, easing = "ease-out", color = "#c2361a" }: WiggleRotateProps) {
  const [checked, setChecked] = useState(false);
  const [run, setRun] = useState(0);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  const submit = () => {
    if (!checked) setRun((n) => n + 1);
  };

  return (
    <div className={styles.wg} style={vars}>
      <label key={run} className={`${styles.row} ${!checked ? styles.wiggle : ""}`} htmlFor="wg-agree">
        <input id="wg-agree" type="checkbox" checked={checked} onChange={(e: ChangeEvent<HTMLInputElement>) => setChecked(e.target.checked)} />
        <span className={styles.text}>이용약관에 동의합니다</span>
      </label>
      <button type="button" className={styles.btn} onClick={submit}>제출</button>
      <p className={styles.msg}>계속하려면 약관에 동의해야 합니다</p>
    </div>
  );
}
