import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./ShakeOnceReset.module.scss";

export type ShakeOnceResetProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

// DOM 판의 리플로우 트릭 대신, React 는 key 를 바꿔 요소를 통째로 새로 마운트한다 —
// 같은 효과(매번 처음부터 재생)를 React 답게 낸다.
export default function ShakeOnceReset({ duration = 500, easing = "ease-out", color = "#c2361a" }: ShakeOnceResetProps) {
  const [run, setRun] = useState(0);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <div className={styles.rs} style={vars}>
      <label className={styles.label} htmlFor="rs-pw">비밀번호</label>
      <input key={run} id="rs-pw" className={`${styles.input} ${styles.shake}`} type="password" defaultValue="wrong1" readOnly />
      <button type="button" className={styles.btn} onClick={() => setRun((n) => n + 1)}>다시 확인</button>
      <p className={styles.msg}>비밀번호가 틀렸습니다</p>
    </div>
  );
}
