import type { CSSProperties, ReactNode } from "react";
import styles from "./StrikeThroughHover.module.scss";

export type StrikeThroughHoverProps = { children: ReactNode; href: string; duration?: number; color?: string };

export default function StrikeThroughHover({ children, href, duration = 140, color = "currentColor" }: StrikeThroughHoverProps) {
  const vars = { "--duration": `${duration}ms`, "--color": color } as CSSProperties;
  return (
    <a className={styles.link} href={href} style={vars}>
      {children}
    </a>
  );
}
