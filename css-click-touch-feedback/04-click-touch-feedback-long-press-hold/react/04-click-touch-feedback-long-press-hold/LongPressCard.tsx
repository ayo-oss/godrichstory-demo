import type { CSSProperties } from "react";
import styles from "./LongPressCard.module.scss";

export type LongPressCardProps = {
  label: string;
  /** 문턱을 넘은 뒤 반응이 펼쳐지는 시간 (기본 220ms) */
  duration?: number;
  /** 반응이 시작되기까지 참는 시간 — 누르는 순간엔 아무 일도 없다 (기본 600ms) */
  hold?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & {
  "--duration"?: string;
  "--hold"?: string;
  "--easing"?: string;
  "--color"?: string;
};

export default function LongPressCard({
  label,
  duration = 220,
  hold = 600,
  easing = "cubic-bezier(.2,1.4,.4,1)",
  color = "#2f6df6",
}: LongPressCardProps) {
  const vars: Vars = {
    "--duration": `${duration}ms`,
    "--hold": `${hold}ms`,
    "--easing": easing,
    "--color": color,
  };
  return (
    <div className={styles.card} style={vars} tabIndex={0}>
      {label}
    </div>
  );
}
