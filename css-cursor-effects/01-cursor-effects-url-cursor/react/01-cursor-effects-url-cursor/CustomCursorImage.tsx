import { useState } from "react";
import type { CSSProperties, PointerEvent } from "react";
import styles from "./CustomCursorImage.module.scss";

export type CustomCursorImageProps = {
  chips?: string[];
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function CustomCursorImage({
  chips = ["CSS", "SVG", "cursor"],
  duration = 2000,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#fff7e6",
}: CustomCursorImageProps) {
  const [demo, setDemo] = useState(true);
  const [pos, setPos] = useState({ x: 60, y: 40 });

  const move = (e: PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setDemo(false);
    setPos({ x: e.clientX - r.left, y: e.clientY - r.top });
  };

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <div className={styles.stage} style={vars} onPointerMove={move}>
      <div className={styles.board}>
        {chips.map((c) => (
          <span key={c} className={styles.chip}>{c}</span>
        ))}
      </div>
      <div
        className={demo ? `${styles.cursor} ${styles.isDemo}` : styles.cursor}
        style={demo ? undefined : { transform: `translate(${pos.x}px,${pos.y}px) rotate(-45deg)` }}
        aria-hidden="true"
      />
    </div>
  );
}
