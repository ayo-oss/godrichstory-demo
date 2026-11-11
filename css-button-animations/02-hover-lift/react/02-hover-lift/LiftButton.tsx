import type { CSSProperties, ReactNode } from "react";
import styles from "./LiftButton.module.scss";

export type LiftButtonProps = { children: ReactNode; lift?: number; duration?: number; shadow?: string; onClick?: () => void };

export default function LiftButton({ children, lift = 6, duration = 220, shadow = "rgba(23,20,26,.32)", onClick }: LiftButtonProps) {
  const vars = { "--lift": `${lift}px`, "--duration": `${duration}ms`, "--shadow": shadow } as CSSProperties;
  return (
    <button type="button" className={styles.btn} style={vars} onClick={onClick}>
      {children}
    </button>
  );
}
