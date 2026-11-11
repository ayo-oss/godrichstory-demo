import type { CSSProperties } from "react";
import styles from "./Coverflow.module.scss";

export type CoverflowProps = {
  /** 카드 5장이 한 바퀴 흐르는 시간 (기본 2000ms) */
  duration?: number;
  easing?: string;
  /** 카드 배경 */
  color?: string;
  count?: number;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string; "--i"?: number };

// JS 없이 같은 keyframes 를 음수 animation-delay 로 어긋나게 돌려 흐름을 만든다
export default function Coverflow({
  duration = 2000,
  easing = "ease-out",
  color = "#fff7e6",
  count = 5,
}: CoverflowProps) {
  const base: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  return (
    <ul className={styles.flow}>
      {Array.from({ length: count }, (_, i) => (
        <li key={i} className={styles.card} style={{ ...base, "--i": i } as Vars} aria-label="앨범 커버" />
      ))}
    </ul>
  );
}
