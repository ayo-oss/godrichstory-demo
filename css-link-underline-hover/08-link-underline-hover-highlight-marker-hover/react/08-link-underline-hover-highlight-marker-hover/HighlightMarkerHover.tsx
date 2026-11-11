import type { CSSProperties, ReactNode } from "react";
import styles from "./HighlightMarkerHover.module.scss";

export type HighlightMarkerHoverProps = { children: ReactNode; href: string; duration?: number; color?: string; skew?: number };

export default function HighlightMarkerHover({ children, href, duration = 300, color = "#ffd23f", skew = -6 }: HighlightMarkerHoverProps) {
  const vars = { "--duration": `${duration}ms`, "--color": color, "--skew": `${skew}deg` } as CSSProperties;
  return (
    <a className={styles.link} href={href} style={vars}>
      {children}
    </a>
  );
}
