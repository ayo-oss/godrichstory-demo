import type { CSSProperties, MouseEvent, ReactNode } from "react";
import styles from "./PulseButton.module.scss";

export type PulseButtonProps = {
  children: ReactNode;
  /** 한 번 오가는 데 걸리는 시간 (기본 2000ms) */
  duration?: number;
  /** CSS easing (기본 ease-out) */
  easing?: string;
  /** 버튼 색 */
  color?: string;
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void;
  type?: "button" | "submit";
};

type Vars = CSSProperties & {
  "--duration"?: string;
  "--easing"?: string;
  "--color"?: string;
};

export default function PulseButton({
  children,
  duration = 2000,
  easing = "ease-out",
  color = "#0a4fe8",
  onClick,
  type = "button",
}: PulseButtonProps) {
  const vars: Vars = {
    "--duration": `${duration}ms`,
    "--easing": easing,
    "--color": color,
  };
  return (
    <button type={type} className={styles.btn} style={vars} onClick={onClick}>
      {children}
    </button>
  );
}
