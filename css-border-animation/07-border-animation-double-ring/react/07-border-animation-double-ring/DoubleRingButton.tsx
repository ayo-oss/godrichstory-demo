import type { CSSProperties } from "react";
import styles from "./DoubleRingButton.module.scss";

export type DoubleRingButtonProps = {
  label: string;
  /** 실제 호버 시 바깥 링이 퍼지는 시간 (기본 300ms) */
  duration?: number;
  easing?: string;
  /** 링 색 */
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function DoubleRingButton({
  label,
  duration = 300,
  easing = "ease-out",
  color = "#fff7e6",
}: DoubleRingButtonProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <button className={styles.btn} style={vars} type="button">
      {label}
    </button>
  );
}
