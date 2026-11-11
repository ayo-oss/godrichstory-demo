import { useState } from "react";
import type { CSSProperties, PointerEvent } from "react";
import styles from "./CursorRingFollow.module.scss";

export type CursorRingFollowProps = {
  hint?: string;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function CursorRingFollow({
  hint = "포트폴리오",
  duration = 2000,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#17141a",
}: CursorRingFollowProps) {
  const [demo, setDemo] = useState(true);
  const [pos, setPos] = useState({ x: 50, y: 40 });

  const move = (e: PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setDemo(false);
    setPos({ x: e.clientX - r.left, y: e.clientY - r.top });
  };

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  const t = `translate(${pos.x}px,${pos.y}px)`;

  return (
    <div className={styles.stage} style={vars} onPointerMove={move}>
      <p className={styles.hint}>{hint}</p>
      <div className={demo ? `${styles.dot} ${styles.isDemo}` : styles.dot} style={demo ? undefined : { transform: t }} />
      <div className={demo ? `${styles.ring} ${styles.isDemo}` : styles.ring} style={demo ? undefined : { transform: t }} />
    </div>
  );
}
