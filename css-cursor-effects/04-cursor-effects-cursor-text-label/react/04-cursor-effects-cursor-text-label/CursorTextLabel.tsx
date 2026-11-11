import { useRef, useState } from "react";
import type { CSSProperties, PointerEvent } from "react";
import styles from "./CursorTextLabel.module.scss";

export type CursorTextLabelProps = {
  label?: string;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function CursorTextLabel({
  label = "보기",
  duration = 2000,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: CursorTextLabelProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [demo, setDemo] = useState(true);
  const [pos, setPos] = useState({ x: 0, y: 0, on: false });

  const move = (e: PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setDemo(false);
    const on = cardRef.current!.contains(e.target as Node);
    setPos({ x: e.clientX - r.left, y: e.clientY - r.top, on });
  };

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <div className={styles.stage} style={vars} onPointerMove={move}>
      <div ref={cardRef} className={styles.card} />
      <span
        className={demo ? `${styles.label} ${styles.isDemo}` : styles.label}
        style={demo ? undefined : { transform: `translate(${pos.x}px,${pos.y}px)`, opacity: pos.on ? 1 : 0 }}
        aria-hidden="true"
      >
        {label}
      </span>
    </div>
  );
}
