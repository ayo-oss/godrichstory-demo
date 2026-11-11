import { useState } from "react";
import type { CSSProperties, PointerEvent } from "react";
import styles from "./HideNativeCursor.module.scss";

export type HideNativeCursorProps = {
  defaultLabel?: string;
  customLabel?: string;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function HideNativeCursor({
  defaultLabel = "기본",
  customLabel = "커스텀",
  duration = 2000,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: HideNativeCursorProps) {
  const [demo, setDemo] = useState(true);
  const [pos, setPos] = useState({ x: 0, y: 0, on: false });

  const move = (e: PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setDemo(false);
    setPos({ x: e.clientX - r.left, y: e.clientY - r.top, on: true });
  };

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <div className={styles.stage} style={vars}>
      <div className={styles.zoneDefault}><span>{defaultLabel}</span></div>
      <div className={styles.zoneCustom} onPointerMove={move} onPointerLeave={() => setPos((p) => ({ ...p, on: false }))}>
        <span>{customLabel}</span>
        <div
          className={demo ? `${styles.cursor} ${styles.isDemo}` : styles.cursor}
          style={demo ? undefined : { transform: `translate(${pos.x}px,${pos.y}px)`, opacity: pos.on ? 1 : 0 }}
          aria-hidden="true"
        />
      </div>
    </div>
  );
}
