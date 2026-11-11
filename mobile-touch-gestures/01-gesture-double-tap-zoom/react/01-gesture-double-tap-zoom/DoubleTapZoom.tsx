import { useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./DoubleTapZoom.module.scss";

export type DoubleTapZoomProps = {
  steps?: number[];
  duration?: number;
  easing?: string;
  color?: string;
};

type PEvt = { clientX: number; clientY: number; pointerId: number; preventDefault(): void; currentTarget: { setPointerCapture(id: number): void } };
type Box<T> = { current: T };
type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const IconPlus = () => (
  <svg viewBox="0 0 256 256" width="16" height="16"><g fill="currentColor"><path d="M216 56v144a16 16 0 0 1-16 16H56a16 16 0 0 1-16-16V56a16 16 0 0 1 16-16h144a16 16 0 0 1 16 16" opacity=".2"/><path d="M224 128a8 8 0 0 1-8 8h-80v80a8 8 0 0 1-16 0v-80H40a8 8 0 0 1 0-16h80V40a8 8 0 0 1 16 0v80h80a8 8 0 0 1 8 8"/></g></svg>
);
const IconMinus = () => (
  <svg viewBox="0 0 256 256" width="16" height="16"><g fill="currentColor"><path d="M216 56v144a16 16 0 0 1-16 16H56a16 16 0 0 1-16-16V56a16 16 0 0 1 16-16h144a16 16 0 0 1 16 16" opacity=".2"/><path d="M224 128a8 8 0 0 1-8 8H40a8 8 0 0 1 0-16h176a8 8 0 0 1 8 8"/></g></svg>
);

export default function DoubleTapZoom({
  steps = [1, 1.55, 2.1],
  duration = 600,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: DoubleTapZoomProps) {
  const [at, setAt] = useState(0);
  const [origin, setOrigin] = useState("50% 50%");
  const [ring, setRing] = useState<{ x: number; y: number; k: number } | null>(null);
  const lastTap = useRef(0) as Box<number>;
  const photoRef = useRef<HTMLDivElement>(null);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  function go(i: number, ox?: number, oy?: number) {
    const next = Math.max(0, Math.min(i, steps.length - 1));
    if (ox !== undefined && oy !== undefined) setOrigin(`${ox}px ${oy}px`);
    setAt(next);
  }

  function onDown(e: PEvt) {
    const now = Date.now();
    if (now - lastTap.current < 320) {
      const r = (photoRef.current as HTMLDivElement).getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      setRing({ x, y, k: now });
      go(at === steps.length - 1 ? 0 : at + 1, x, y);
      lastTap.current = 0;
    } else {
      lastTap.current = now;
    }
  }

  return (
    <div className={styles.dz} style={vars}>
      <div
        ref={photoRef}
        className={styles.photo}
        style={{ transform: `scale(${steps[at]})`, transformOrigin: origin }}
        onPointerDown={onDown}
      >
        <svg viewBox="0 0 200 130" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <rect className={styles.sky} width="200" height="130" />
          <circle className={styles.sun} cx="150" cy="38" r="17" />
          <polygon className={styles.m1} points="0,130 62,52 124,130" />
          <polygon className={styles.m2} points="84,130 148,66 200,116 200,130" />
          <rect className={styles.lake} y="104" width="200" height="26" />
        </svg>
        {ring && (
          <span key={ring.k} className={styles.ring} style={{ left: ring.x, top: ring.y }} aria-hidden="true" />
        )}
      </div>
      <div className={styles.side}>
        <button type="button" className={styles.btn} aria-label="Zoom in one step" onClick={(): void => go(at + 1, 150, 44)}>
          <IconPlus />
        </button>
        <span className={styles.level} aria-live="polite">{steps[at].toFixed(1)}x</span>
        <button type="button" className={styles.btn} aria-label="Zoom out one step" onClick={(): void => go(at - 1, 150, 44)}>
          <IconMinus />
        </button>
      </div>
    </div>
  );
}
