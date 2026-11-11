import type { CSSProperties, ReactNode } from "react";
import styles from "./DateDividerAppear.module.scss";

export type DateDividerAppearProps = {
  children: ReactNode;
  /** 구분선이 내려와 자리잡는 데 걸리는 시간 (기본 300ms) */
  duration?: number;
  easing?: string;
  className?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string };

export default function DateDividerAppear({
  children,
  duration = 300,
  easing = "ease-out",
  className = "",
}: DateDividerAppearProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing };

  return (
    <span className={`${styles.divider} ${styles.enter} ${className}`} style={vars}>
      {children}
    </span>
  );
}
