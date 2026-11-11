import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./LikeCountButton.module.scss";

export type LikeCountButtonProps = {
  label?: string;
  note?: string;
  count?: number;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

// 1248 → "1,248" — 세 자리마다 쉼표
function fmt(n: number): string {
  const s = String(n);
  let out = "";
  for (let i = 0; i < s.length; i += 1) {
    if (i > 0 && (s.length - i) % 3 === 0) out += ",";
    out += s.charAt(i);
  }
  return out;
}

export default function LikeCountButton({
  label = "Like this post",
  note = "The number rolls up instead of being swapped",
  count = 1248,
  duration = 220,
  easing = "cubic-bezier(.2,1.4,.4,1)",
  color = "#ff4d1f",
}: LikeCountButtonProps) {
  const [demo, setDemo] = useState(true);
  const [on, setOn] = useState(false);
  const [beat, setBeat] = useState(0);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  // 누른 상태 하나가 하트 색과 굴림 위치를 같이 정한다
  function press() {
    setDemo(false);
    setOn((v) => !v);
    setBeat((v) => v + 1); // key 를 바꿔 연달아 눌러도 하트 반동이 매번 다시 돈다
  }

  return (
    <div className={`${styles.lk} ${demo ? styles.isDemo : ""}`} style={vars}>
      <button className={styles.btn} type="button" aria-pressed={on} aria-label={label} onClick={press}>
        <span key={beat} className={`${styles.heart} ${demo ? "" : styles.isBeat}`} aria-hidden="true">
          <svg viewBox="0 0 256 256" width="22" height="22">
            <g fill="currentColor">
              <path d="M232 102c0 66-104 122-104 122S24 168 24 102a54 54 0 0 1 54-54c22.59 0 41.94 12.31 50 32c8.06-19.69 27.41-32 50-32a54 54 0 0 1 54 54" opacity=".2" />
              <path d="M178 40c-20.65 0-38.73 8.88-50 23.89C116.73 48.88 98.65 40 78 40a62.07 62.07 0 0 0-62 62c0 70 103.79 126.66 108.21 129a8 8 0 0 0 7.58 0C136.21 228.66 240 172 240 102a62.07 62.07 0 0 0-62-62m-50 174.8c-18.26-10.64-96-59.11-96-112.8a46.06 46.06 0 0 1 46-46c19.45 0 35.78 10.36 42.6 27a8 8 0 0 0 14.8 0c6.82-16.67 23.15-27 42.6-27a46.06 46.06 0 0 1 46 46c0 53.61-77.76 102.15-96 112.8" />
            </g>
          </svg>
        </span>
        <span className={styles.win} aria-live="polite">
          <span className={styles.roll}>
            <span className={styles.n}>{fmt(count)}</span>
            <span className={styles.n}>{fmt(count + 1)}</span>
          </span>
        </span>
      </button>
      <p className={styles.note}>{note}</p>
    </div>
  );
}
