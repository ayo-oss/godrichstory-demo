import { useRef, useState } from "react";
import type { CSSProperties, PointerEvent } from "react";
import styles from "./MagneticCursorButton.module.scss";

export type MagneticCursorButtonProps = {
  label?: string;
  radius?: number;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function MagneticCursorButton({
  label = "시작하기",
  radius = 90,
  duration = 2000,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#fff7e6",
}: MagneticCursorButtonProps) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const [demo, setDemo] = useState(true);
  const [cur, setCur] = useState({ x: 30, y: 150 });
  const [pull, setPull] = useState({ x: 0, y: 0 });

  const move = (e: PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setDemo(false);
    const x = e.clientX - r.left, y = e.clientY - r.top;
    setCur({ x, y });
    const br = btnRef.current!.getBoundingClientRect();
    const cx = br.left - r.left + br.width / 2, cy = br.top - r.top + br.height / 2;
    const dx = x - cx, dy = y - cy, dist = Math.hypot(dx, dy), p = dist < radius ? (radius - dist) / radius : 0;
    setPull({ x: dx * p * 0.35, y: dy * p * 0.35 });
  };

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <div className={styles.stage} style={vars} onPointerMove={move}>
      <button
        ref={btnRef}
        type="button"
        className={demo ? `${styles.btn} ${styles.isDemo}` : styles.btn}
        style={demo ? undefined : { transform: `translate(${pull.x}px,${pull.y}px)` }}
      >
        {label}
      </button>
      <div
        className={demo ? `${styles.cursor} ${styles.isDemo}` : styles.cursor}
        style={demo ? undefined : { transform: `translate(${cur.x}px,${cur.y}px)` }}
        aria-hidden="true"
      />
    </div>
  );
}
