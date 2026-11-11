import type { CSSProperties } from "react";
import styles from "./SweepBorderInput.module.scss";

export type SweepBorderInputProps = {
  placeholder: string;
  /** 줄무늬가 한 바퀴 흐르는 시간 (기본 2000ms) */
  duration?: number;
  easing?: string;
  /** 줄무늬 색 */
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function SweepBorderInput({
  placeholder,
  duration = 2000,
  easing = "linear",
  color = "#2f6df6",
}: SweepBorderInputProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <div className={styles.frame} style={vars}>
      <input className={styles.input} type="text" placeholder={placeholder} readOnly />
    </div>
  );
}
