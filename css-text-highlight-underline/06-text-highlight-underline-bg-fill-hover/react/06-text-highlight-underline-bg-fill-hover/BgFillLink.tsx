import type { CSSProperties, ReactNode } from "react";
import styles from "./BgFillLink.module.scss";

export type BgFillLinkProps = {
  children: ReactNode;
  href?: string;
  /** 배경이 다 차는 시간 (기본 2000ms) */
  duration?: number;
  easing?: string;
  /** 채워지는 색 */
  color?: string;
};

type Vars = CSSProperties & {
  "--duration"?: string;
  "--easing"?: string;
  "--color"?: string;
};

export default function BgFillLink({
  children,
  href = "#",
  duration = 2000,
  easing = "ease-out",
  color = "#2f6df6",
}: BgFillLinkProps) {
  const vars: Vars = {
    "--duration": `${duration}ms`,
    "--easing": easing,
    "--color": color,
  };
  return (
    <a className={styles.nav} href={href} style={vars}>
      {children}
    </a>
  );
}
