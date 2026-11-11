import type { CSSProperties, ReactNode } from "react";
import styles from "./DottedMorphUnderline.module.scss";

export type DottedMorphUnderlineProps = { children: ReactNode; href: string; duration?: number; color?: string };

export default function DottedMorphUnderline({ children, href, duration = 300, color = "currentColor" }: DottedMorphUnderlineProps) {
  const vars = { "--duration": `${duration}ms`, "--color": color } as CSSProperties;
  return (
    <a className={styles.link} href={href} style={vars}>
      {children}
    </a>
  );
}
