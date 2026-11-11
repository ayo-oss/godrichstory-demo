import { useState } from "react";
import type { CSSProperties, PointerEvent } from "react";
import styles from "./BlendModeCursor.module.scss";

export type BlendModeCursorProps = {
  text?: string;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function BlendModeCursor({
  text = "반전",
  duration = 2000,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#ffffff",
}: BlendModeCursorProps) {
  const [demo, setDemo] = useState(true);
  const [pos, setPos] = useState({ x: 80, y: 60 });

  const move = (e: PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setDemo(false);
    setPos({ x: e.clientX - r.left, y: e.clientY - r.top });
  };

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <div className={styles.stage} style={vars} onPointerMove={move}>
      <div className={`${styles.half} ${styles.halfLeft}`} />
      <div className={`${styles.half} ${styles.halfRight}`} />
      <p className={styles.banner}>{text}</p>
      <div
        className={demo ? `${styles.cursor} ${styles.isDemo}` : styles.cursor}
        style={demo ? undefined : { transform: `translate(${pos.x}px,${pos.y}px)` }}
        aria-hidden="true"
      />
    </div>
  );
}
