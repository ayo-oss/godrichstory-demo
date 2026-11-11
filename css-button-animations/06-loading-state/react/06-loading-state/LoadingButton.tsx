import type { CSSProperties, ReactNode } from "react";
import styles from "./LoadingButton.module.scss";

export type LoadingButtonProps = { children: ReactNode; loading: boolean; duration?: number; spin?: number; color?: string; onClick?: () => void };

export default function LoadingButton({ children, loading, duration = 300, spin = 800, color = "#2f6df6", onClick }: LoadingButtonProps) {
  const vars = { "--duration": `${duration}ms`, "--spin": `${spin}ms`, "--color": color } as CSSProperties;
  return (
    <button type="button" className={`${styles.btn} ${loading ? styles.loading : ""}`} style={vars} disabled={loading} aria-busy={loading} onClick={onClick}>
      <span className={styles.label}>{children}</span>
      <span className={styles.spinner} aria-hidden="true" />
    </button>
  );
}
