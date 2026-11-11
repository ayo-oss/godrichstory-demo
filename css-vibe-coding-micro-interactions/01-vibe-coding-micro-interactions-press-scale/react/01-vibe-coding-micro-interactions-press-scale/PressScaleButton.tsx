import type { CSSProperties, MouseEvent, ReactNode } from "react";
import styles from "./PressScaleButton.module.scss";

export type PressScaleButtonProps = {
  children: ReactNode;
  /** 눌렸다 돌아오는 시간 (기본 220ms) */
  duration?: number;
  /** CSS easing (기본 스프링) */
  easing?: string;
  /** 버튼 색 */
  color?: string;
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void;
  type?: "button" | "submit";
  className?: string;
};

type Vars = CSSProperties & {
  "--duration"?: string;
  "--easing"?: string;
  "--color"?: string;
};

export default function PressScaleButton({
  children,
  duration = 220,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
  onClick,
  type = "button",
  className = "",
}: PressScaleButtonProps) {
  const vars: Vars = {
    "--duration": `${duration}ms`,
    "--easing": easing,
    "--color": color,
  };

  return (
    <button type={type} className={`${styles.btn} ${className}`} style={vars} onClick={onClick}>
      {children}
    </button>
  );
}
