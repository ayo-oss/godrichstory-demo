import { useState } from "react";
import type { CSSProperties, PointerEvent } from "react";
import styles from "./TouchFallbackCursor.module.scss";

export type TouchFallbackCursorProps = {
  mouseLabel?: string;
  touchLabel?: string;
  tapLabel?: string;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function TouchFallbackCursor({
  mouseLabel = "마우스 감지",
  touchLabel = "터치 감지",
  tapLabel = "탭하세요",
  duration = 2000,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: TouchFallbackCursorProps) {
  const [pos, setPos] = useState({ x: 50, y: 50 });

  const move = (e: PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setPos({ x: e.clientX - r.left, y: e.clientY - r.top });
  };

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <div className={styles.stage} style={vars} onPointerMove={move}>
      <div className={`${styles.panel} ${styles.panelMouse} ${styles.isDemo}`}>
        <div className={styles.cursor} style={{ transform: `translate(${pos.x}px,${pos.y}px)` }} aria-hidden="true" />
        <span className={styles.label}>{mouseLabel}</span>
      </div>
      <div className={`${styles.panel} ${styles.panelTouch} ${styles.isDemo}`}>
        <button className={styles.tap} type="button">{tapLabel}</button>
        <span className={styles.label}>{touchLabel}</span>
      </div>
    </div>
  );
}
