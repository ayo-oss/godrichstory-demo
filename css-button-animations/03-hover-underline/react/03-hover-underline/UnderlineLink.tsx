import type { CSSProperties, ReactNode } from "react";
import styles from "./UnderlineLink.module.scss";

export type UnderlineLinkProps = { children: ReactNode; href: string; thickness?: number; duration?: number; color?: string };

export default function UnderlineLink({ children, href, thickness = 3, duration = 260, color = "currentColor" }: UnderlineLinkProps) {
  const vars = { "--thickness": `${thickness}px`, "--duration": `${duration}ms`, "--color": color } as CSSProperties;
  return (
    <a className={styles.link} href={href} style={vars}>
      {children}
    </a>
  );
}
