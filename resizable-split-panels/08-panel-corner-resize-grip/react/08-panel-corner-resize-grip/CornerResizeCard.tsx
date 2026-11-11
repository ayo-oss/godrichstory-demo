import { useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./CornerResizeCard.module.scss";

export type CornerResizeCardProps = {
  startWidth?: number;
  startHeight?: number;
  duration?: number;
  easing?: string;
  color?: string;
};

type PEvt = { clientX: number; clientY: number; pointerId: number; preventDefault(): void; currentTarget: { setPointerCapture(id: number): void } };
type KeyEvt = { key: string; preventDefault(): void };
type Box<T> = { current: T };
type Grab = { w: number; h: number; x: number; y: number; on: boolean };
type Vars = CSSProperties & {
  "--w"?: string; "--h"?: string; "--wn"?: string; "--hn"?: string;
  "--duration"?: string; "--easing"?: string; "--color"?: string;
};

export default function CornerResizeCard({
  startWidth = 176,
  startHeight = 96,
  duration = 220,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: CornerResizeCardProps) {
  const ratio = startHeight / startWidth;
  const [size, setSize] = useState({ w: startWidth, h: startHeight });
  const [locked, setLocked] = useState(true);
  const cardRef = useRef<HTMLDivElement>(null);
  const from = useRef({ w: 0, h: 0, x: 0, y: 0, on: false }) as Box<Grab>;

  function set(w: number, h: number): void {
    const W = Math.max(120, Math.min(Math.round(w), 220));
    const H = locked ? Math.round(W * ratio) : Math.max(64, Math.min(Math.round(h), 132));
    setSize({ w: W, h: H });
  }
  function onDown(e: PEvt): void {
    const card = cardRef.current;
    if (!card) return;
    const r = card.getBoundingClientRect();
    from.current = { w: r.width, h: r.height, x: e.clientX, y: e.clientY, on: true };
    e.currentTarget.setPointerCapture(e.pointerId);
    e.preventDefault();
  }
  function onMove(e: PEvt): void {
    if (!from.current.on) return;
    set(from.current.w + (e.clientX - from.current.x), from.current.h + (e.clientY - from.current.y));
  }
  function onUp(): void { from.current.on = false; }
  function onKey(e: KeyEvt): void {
    const d = e.key === "ArrowLeft" ? -8 : e.key === "ArrowRight" ? 8 : 0;
    if (!d) return;
    set(size.w + d, (size.w + d) * ratio);
    e.preventDefault();
  }

  const vars: Vars = {
    "--w": `${size.w}px`,
    "--h": `${size.h}px`,
    "--wn": String(size.w),
    "--hn": String(size.h),
    "--duration": `${duration}ms`,
    "--easing": easing,
    "--color": color,
  };

  return (
    <div className={locked ? `${styles.cg} ${styles.isAspect}` : styles.cg} style={vars}>
      <div className={styles.field}>
        <div className={styles.card} ref={cardRef}>
          <span className={styles.row} />
          <span className={`${styles.row} ${styles.rowShort}`} />
          <span className={styles.size} />
          <i
            className={styles.grip}
            role="slider"
            tabIndex={0}
            aria-label="Card size"
            aria-valuemin={120}
            aria-valuemax={220}
            aria-valuenow={size.w}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
            onKeyDown={onKey}
          />
        </div>
      </div>
      <button
        type="button"
        className={locked ? `${styles.lock} ${styles.isOn}` : styles.lock}
        aria-pressed={locked}
        onClick={(): void => setLocked(!locked)}
      >
        <span className={styles.ico} aria-hidden="true">
          <svg viewBox="0 0 256 256"><g fill="currentColor"><path d="M216 96v112a8 8 0 0 1-8 8H48a8 8 0 0 1-8-8V96a8 8 0 0 1 8-8h160a8 8 0 0 1 8 8" opacity=".2" /><path d="M208 80h-32V56a48 48 0 0 0-96 0v24H48a16 16 0 0 0-16 16v112a16 16 0 0 0 16 16h160a16 16 0 0 0 16-16V96a16 16 0 0 0-16-16M96 56a32 32 0 0 1 64 0v24H96Zm112 152H48V96h160z" /></g></svg>
        </span>
        Lock ratio
      </button>
    </div>
  );
}
