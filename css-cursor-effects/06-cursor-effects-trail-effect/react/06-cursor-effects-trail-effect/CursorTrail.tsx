import { useState } from "react";
import type { CSSProperties, PointerEvent } from "react";
import styles from "./CursorTrail.module.scss";

export type CursorTrailProps = {
  dots?: number;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function CursorTrail({
  dots = 6,
  duration = 2000,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#17141a",
}: CursorTrailProps) {
  const [demo, setDemo] = useState(true);
  const [pos, setPos] = useState({ x: 40, y: 200 });

  const move = (e: PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setDemo(false);
    setPos({ x: e.clientX - r.left, y: e.clientY - r.top });
  };

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <div className={styles.stage} style={vars} onPointerMove={move}>
      {demo &&
        Array.from({ length: dots }).map((_, i) => (
          <span
            key={i}
            className={styles.trailDot}
            style={{ opacity: 1 - (i + 1) * 0.13, animationDelay: `${-(i + 1) * 90}ms` }}
          />
        ))}
      <div
        className={demo ? `${styles.cursor} ${styles.isDemo}` : styles.cursor}
        style={demo ? undefined : { transform: `translate(${pos.x}px,${pos.y}px)` }}
        aria-hidden="true"
      />
    </div>
  );
}
