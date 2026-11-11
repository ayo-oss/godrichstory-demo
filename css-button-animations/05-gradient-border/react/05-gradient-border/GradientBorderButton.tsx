import type { CSSProperties, ReactNode } from "react";
import styles from "./GradientBorderButton.module.scss";

export type GradientBorderButtonProps = { children: ReactNode; duration?: number; border?: number; colors?: string[]; onClick?: () => void };

export default function GradientBorderButton({ children, duration = 3000, border = 3, colors = ["#ff4d1f", "#ffd23f", "#2f6df6", "#ff4d1f"], onClick }: GradientBorderButtonProps) {
  const vars = { "--duration": `${duration}ms`, "--border": `${border}px`, "--colors": colors.join(", ") } as CSSProperties;
  return (
    <button type="button" className={styles.btn} style={vars} onClick={onClick}>
      <span className={styles.inner}>{children}</span>
    </button>
  );
}
