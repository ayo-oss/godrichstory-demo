import type { CSSProperties, ReactNode } from "react";
import styles from "./CenterOutUnderline.module.scss";

export type CenterOutUnderlineProps = { children: ReactNode; href: string; duration?: number; color?: string; thickness?: number };

export default function CenterOutUnderline({ children, href, duration = 300, color = "currentColor", thickness = 3 }: CenterOutUnderlineProps) {
  const vars = { "--duration": `${duration}ms`, "--color": color, "--thickness": `${thickness}px` } as CSSProperties;
  return (
    <a className={styles.link} href={href} style={vars}>
      {children}
    </a>
  );
}
