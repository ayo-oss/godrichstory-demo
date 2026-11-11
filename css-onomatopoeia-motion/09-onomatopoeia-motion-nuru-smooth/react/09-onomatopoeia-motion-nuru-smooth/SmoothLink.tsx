import type { CSSProperties, ReactNode } from "react";
import styles from "./SmoothLink.module.scss";

export type SmoothLinkProps = {
  children: ReactNode;
  href?: string;
  /** 미끄러지는 데 걸리는 시간 (기본 700ms) */
  duration?: number;
  /** CSS easing (기본 ease-out-expo 근사) */
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & {
  "--duration"?: string;
  "--easing"?: string;
  "--color"?: string;
};

export default function SmoothLink({
  children,
  href = "#",
  duration = 700,
  easing = "cubic-bezier(.16,1,.3,1)",
  color = "#2f6df6",
}: SmoothLinkProps) {
  const vars: Vars = {
    "--duration": `${duration}ms`,
    "--easing": easing,
    "--color": color,
  };
  return (
    <a className={styles.link} href={href} style={vars}>
      {children}
      <span className={styles.arrow} aria-hidden="true">
        →
      </span>
    </a>
  );
}
