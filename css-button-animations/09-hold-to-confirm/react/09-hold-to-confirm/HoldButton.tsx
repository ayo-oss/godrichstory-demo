import { useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import styles from "./HoldButton.module.scss";

export type HoldButtonProps = { children: ReactNode; doneLabel?: ReactNode; hold?: number; color?: string; fill?: string; onConfirm: () => void };

/** 누르고 있는 동안 차오르고, 다 차면 onConfirm. 중간에 떼면 되돌아간다. */
export default function HoldButton({ children, doneLabel = "완료", hold = 1200, color = "#fff7e6", fill = "#17141a", onConfirm }: HoldButtonProps) {
  const [holding, setHolding] = useState<boolean>(false);
  const [done, setDone] = useState<boolean>(false);
  const vars = { "--hold": `${hold}ms`, "--color": color, "--fill": fill } as CSSProperties;
  const cls = `${styles.btn} ${holding ? styles.holding : ""} ${done ? styles.done : ""}`;
  return (
    <button type="button" className={cls} style={vars}
      onPointerDown={() => !done && setHolding(true)} onPointerUp={() => setHolding(false)} onPointerLeave={() => setHolding(false)} onPointerCancel={() => setHolding(false)}>
      <span className={styles.fill} aria-hidden="true" onAnimationEnd={() => { if (holding) { setDone(true); onConfirm(); } }} />
      <span className={styles.label}>{done ? doneLabel : children}</span>
    </button>
  );
}
