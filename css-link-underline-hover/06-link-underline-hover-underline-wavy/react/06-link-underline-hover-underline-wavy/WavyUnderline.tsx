import type { CSSProperties, ReactNode } from "react";
import styles from "./WavyUnderline.module.scss";

export type WavyUnderlineProps = { children: ReactNode; href: string; duration?: number; color?: string };

export default function WavyUnderline({ children, href, duration = 220, color = "currentColor" }: WavyUnderlineProps) {
  const vars = { "--duration": `${duration}ms`, "--color": color } as CSSProperties;
  return (
    <a className={styles.link} href={href} style={vars}>
      {children}
    </a>
  );
}
