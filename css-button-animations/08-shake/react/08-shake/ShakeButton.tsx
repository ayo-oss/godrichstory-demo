import { useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import styles from "./ShakeButton.module.scss";

export type ShakeButtonProps = { children: ReactNode; shakeKey: number; amount?: number; duration?: number; color?: string; onClick?: () => void };

/** shakeKey 를 바꾸면(예: 실패 횟수) 다시 흔든다. */
export default function ShakeButton({ children, shakeKey, amount = 6, duration = 420, color = "#c2361a", onClick }: ShakeButtonProps) {
  const [last, setLast] = useState<number>(0);
  const vars = { "--amount": `${amount}px`, "--duration": `${duration}ms`, "--color": color } as CSSProperties;
  const shaking = shakeKey > 0 && shakeKey !== last;
  return (
    <button key={shakeKey} type="button" className={`${styles.btn} ${shaking ? styles.shaking : ""}`} style={vars} onClick={onClick} onAnimationEnd={() => setLast(shakeKey)}>
      {children}
    </button>
  );
}
