import type { CSSProperties } from "react";
import styles from "./TextWipe.module.scss";

export type TextWipeProps = {
  children: string;
  /** 닦여 나오는 시간 (기본 600ms) */
  duration?: number;
  /** easing (기본 cubic-bezier(.2,.8,.2,1)) */
  easing?: string;
  /** 글자 색 (기본 #17141a) */
  color?: string;
  className?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function TextWipe({
  children,
  duration = 600,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#17141a",
  className = "",
}: TextWipeProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <h1 className={`${styles.headline} ${className}`} style={vars}>
      {children}
    </h1>
  );
}
