import { useCallback, useState } from "react";
import type { CSSProperties, MouseEvent, ReactNode } from "react";
import styles from "./RippleButton.module.scss";

export type RippleButtonProps = {
  children: ReactNode;
  /** 물결이 다 퍼지는 시간 (기본 600ms) */
  duration?: number;
  /** CSS easing (기본 cubic-bezier(.2,.8,.2,1)) */
  easing?: string;
  /** 버튼 색 */
  color?: string;
  /** 물결 색. 밝은 버튼이면 rgba(0,0,0,.18) */
  ripple?: string;
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void;
  type?: "button" | "submit";
  className?: string;
};

type Vars = CSSProperties & {
  "--duration"?: string;
  "--easing"?: string;
  "--color"?: string;
  "--ripple"?: string;
  "--x"?: string;
  "--y"?: string;
  "--d"?: string;
};

export default function RippleButton({
  children,
  duration = 600,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
  ripple = "rgba(255,255,255,.6)",
  onClick,
  type = "button",
  className = "",
}: RippleButtonProps) {
  const [pos, setPos] = useState<{ x: number; y: number; d: number; key: number } | null>(null);

  const handle = useCallback(
    (e: MouseEvent<HTMLButtonElement>) => {
      const r = e.currentTarget.getBoundingClientRect();
      const d = Math.max(r.width, r.height) * 2;
      setPos({ x: e.clientX - r.left, y: e.clientY - r.top, d, key: Date.now() });
      onClick?.(e);
    },
    [onClick]
  );

  const vars: Vars = {
    "--duration": `${duration}ms`,
    "--easing": easing,
    "--color": color,
    "--ripple": ripple,
    ...(pos ? { "--x": `${pos.x}px`, "--y": `${pos.y}px`, "--d": `${pos.d}px` } : {}),
  };

  return (
    <button type={type} className={`${styles.btn} ${className}`} style={vars} onClick={handle}>
      {children}
      {pos && <span key={pos.key} className={styles.ripple} aria-hidden="true" />}
    </button>
  );
}
