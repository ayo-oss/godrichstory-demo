import type { CSSProperties, ReactNode } from "react";
import styles from "./ColorSlideUnderline.module.scss";

export type ColorSlideUnderlineProps = { children: ReactNode; href: string; duration?: number; color?: string; accent?: string };

export default function ColorSlideUnderline({ children, href, duration = 220, color = "#2f6df6", accent = "#ffd23f" }: ColorSlideUnderlineProps) {
  const vars = { "--duration": `${duration}ms`, "--color": color, "--accent": accent } as CSSProperties;
  return (
    <a className={styles.link} href={href} style={vars}>
      {children}
    </a>
  );
}
