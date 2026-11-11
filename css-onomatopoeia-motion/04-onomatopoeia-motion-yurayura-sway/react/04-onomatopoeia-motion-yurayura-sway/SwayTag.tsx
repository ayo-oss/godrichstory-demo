import type { CSSProperties, ReactNode } from "react";
import styles from "./SwayTag.module.scss";

export type SwayTagProps = {
  children: ReactNode;
  /** 한 번 오가는 데 걸리는 시간 (기본 2400ms) */
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & {
  "--duration"?: string;
  "--easing"?: string;
  "--color"?: string;
};

export default function SwayTag({
  children,
  duration = 2400,
  easing = "ease-in-out",
  color = "#2f6df6",
}: SwayTagProps) {
  const vars: Vars = {
    "--duration": `${duration}ms`,
    "--easing": easing,
    "--color": color,
  };
  return (
    <div className={styles.wrap}>
      <span className={styles.string} aria-hidden="true" />
      <span className={styles.tag} style={vars}>
        {children}
      </span>
    </div>
  );
}
