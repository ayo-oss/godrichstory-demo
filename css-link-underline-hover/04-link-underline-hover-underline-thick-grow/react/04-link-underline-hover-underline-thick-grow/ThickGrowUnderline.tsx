import type { CSSProperties, ReactNode } from "react";
import styles from "./ThickGrowUnderline.module.scss";

export type ThickGrowUnderlineProps = { children: ReactNode; href: string; duration?: number; color?: string; maxThickness?: number };

export default function ThickGrowUnderline({ children, href, duration = 300, color = "#2f6df6", maxThickness = 4 }: ThickGrowUnderlineProps) {
  const vars = { "--duration": `${duration}ms`, "--color": color, "--max-thickness": `${maxThickness}px` } as CSSProperties;
  return (
    <a className={styles.link} href={href} style={vars}>
      {children}
    </a>
  );
}
