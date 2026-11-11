import type { CSSProperties, ReactNode } from "react";
import styles from "./MultilineUnderline.module.scss";

export type MultilineUnderlineProps = { children: ReactNode; href: string; duration?: number; color?: string; maxWidth?: number };

export default function MultilineUnderline({ children, href, duration = 300, color = "currentColor", maxWidth = 160 }: MultilineUnderlineProps) {
  const vars = { "--duration": `${duration}ms`, "--color": color, "--max-width": `${maxWidth}px` } as CSSProperties;
  return (
    <p className={styles.wrap} style={vars}>
      <a className={styles.link} href={href}>
        {children}
      </a>
    </p>
  );
}
