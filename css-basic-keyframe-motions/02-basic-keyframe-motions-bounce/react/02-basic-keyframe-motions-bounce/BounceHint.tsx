import type { CSSProperties, ReactNode } from "react";
import styles from "./BounceHint.module.scss";

export type BounceHintProps = {
  children: ReactNode;
  /** 한 번 튀는 데 걸리는 시간 (기본 1000ms) */
  duration?: number;
  /** CSS easing (기본 중력을 흉내낸 커스텀 베지어) */
  easing?: string;
  /** 화살표·글자 색 */
  color?: string;
};

type Vars = CSSProperties & {
  "--duration"?: string;
  "--easing"?: string;
  "--color"?: string;
};

export default function BounceHint({
  children,
  duration = 1000,
  easing = "cubic-bezier(.28,.84,.42,1)",
  color = "#17141a",
}: BounceHintProps) {
  const vars: Vars = {
    "--duration": `${duration}ms`,
    "--easing": easing,
    "--color": color,
  };
  return (
    <div className={styles.hint} style={vars}>
      <span className={styles.arrow} aria-hidden="true" />
      {children}
    </div>
  );
}
