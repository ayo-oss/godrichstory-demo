import type { CSSProperties, ReactNode } from "react";
import styles from "./LeftRightUnderline.module.scss";

export type LeftRightUnderlineProps = { children: ReactNode; href: string; duration?: number; color?: string; thickness?: number };

export default function LeftRightUnderline({ children, href, duration = 220, color = "currentColor", thickness = 3 }: LeftRightUnderlineProps) {
  const vars = { "--duration": `${duration}ms`, "--color": color, "--thickness": `${thickness}px` } as CSSProperties;
  return (
    <a className={styles.link} href={href} style={vars}>
      {children}
    </a>
  );
}
