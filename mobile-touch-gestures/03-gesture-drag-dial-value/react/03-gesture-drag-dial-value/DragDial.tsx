import { useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./DragDial.module.scss";

export type DragDialProps = {
  initial?: number;
  duration?: number;
  easing?: string;
  color?: string;
};

type PEvt = { clientX: number; clientY: number; pointerId: number; preventDefault(): void; currentTarget: { setPointerCapture(id: number): void } };
type KeyEvt = { key: string; preventDefault(): void };
type Box<T> = { current: T };
type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const SPAN = 270, BASE = 225;
const LEN = 2 * Math.PI * 42 * (SPAN / 360);

const IconSpeaker = () => (
  <svg viewBox="0 0 256 256" width="18" height="18"><g fill="currentColor"><path d="M80 88v80H32a8 8 0 0 1-8-8V96a8 8 0 0 1 8-8Z" opacity=".2"/><path d="M155.51 24.81a8 8 0 0 0-8.42.88L77.25 80H32a16 16 0 0 0-16 16v64a16 16 0 0 0 16 16h45.25l69.84 54.31A8 8 0 0 0 160 224V32a8 8 0 0 0-4.49-7.19M32 96h40v64H32Zm112 111.64l-56-43.55V91.91l56-43.55Z"/></g></svg>
);
const IconPlus = () => (
  <svg viewBox="0 0 256 256" width="14" height="14"><g fill="currentColor"><path d="M216 56v144a16 16 0 0 1-16 16H56a16 16 0 0 1-16-16V56a16 16 0 0 1 16-16h144a16 16 0 0 1 16 16" opacity=".2"/><path d="M224 128a8 8 0 0 1-8 8h-80v80a8 8 0 0 1-16 0v-80H40a8 8 0 0 1 0-16h80V40a8 8 0 0 1 16 0v80h80a8 8 0 0 1 8 8"/></g></svg>
);
const IconMinus = () => (
  <svg viewBox="0 0 256 256" width="14" height="14"><g fill="currentColor"><path d="M216 56v144a16 16 0 0 1-16 16H56a16 16 0 0 1-16-16V56a16 16 0 0 1 16-16h144a16 16 0 0 1 16 16" opacity=".2"/><path d="M224 128a8 8 0 0 1-8 8H40a8 8 0 0 1 0-16h176a8 8 0 0 1 8 8"/></g></svg>
);

export default function DragDial({
  initial = 20,
  duration = 220,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#fff7e6",
}: DragDialProps) {
  const [value, setValue] = useState(initial);
  const dialRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false) as Box<boolean>;
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  function clamp(v: number) { return Math.max(0, Math.min(100, Math.round(v))); }

  function fromPointer(e: PEvt) {
    const el = dialRef.current as HTMLDivElement;
    const r = el.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2);
    const dy = e.clientY - (r.top + r.height / 2);
    let rel = Math.atan2(dy, dx) * 180 / Math.PI - BASE;
    while (rel > 180) rel -= 360;
    while (rel < -180) rel += 360;
    rel = Math.max(-SPAN / 2, Math.min(SPAN / 2, rel));
    setValue(((rel + SPAN / 2) / SPAN) * 100);
  }

  function onDown(e: PEvt) {
    dragging.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    fromPointer(e);
    e.preventDefault();
  }
  function onMove(e: PEvt) { if (dragging.current) fromPointer(e); }
  function onUp() { dragging.current = false; }

  function onKey(e: KeyEvt) {
    if (e.key === "ArrowUp" || e.key === "ArrowRight") { setValue(clamp(value + 4)); e.preventDefault(); }
    else if (e.key === "ArrowDown" || e.key === "ArrowLeft") { setValue(clamp(value - 4)); e.preventDefault(); }
    else if (e.key === "Home") { setValue(0); e.preventDefault(); }
    else if (e.key === "End") { setValue(100); e.preventDefault(); }
  }

  const deg = BASE + (value / 100) * SPAN;

  return (
    <div className={styles.dl} style={vars}>
      <div
        ref={dialRef}
        className={styles.dial}
        role="slider"
        tabIndex={0}
        aria-label="Volume"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(value)}
        aria-orientation="vertical"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onKeyDown={onKey}
      >
        <svg className={styles.gauge} viewBox="0 0 100 100" aria-hidden="true">
          <circle className={styles.track} cx="50" cy="50" r="42" />
          <circle
            className={styles.fill}
            cx="50" cy="50" r="42"
            style={{ strokeDasharray: LEN, strokeDashoffset: LEN * (1 - value / 100) }}
          />
        </svg>
        <span className={styles.knob} style={{ transform: `rotate(${deg}deg)` }} aria-hidden="true">
          <span className={styles.dot} />
          <IconSpeaker />
        </span>
      </div>
      <div className={styles.side}>
        <span className={styles.value} aria-live="polite">{Math.round(value)}%</span>
        <div className={styles.btns}>
          <button type="button" className={styles.btn} aria-label="Volume down by 4" onClick={(): void => setValue(clamp(value - 4))}>
            <IconMinus />
          </button>
          <button type="button" className={styles.btn} aria-label="Volume up by 4" onClick={(): void => setValue(clamp(value + 4))}>
            <IconPlus />
          </button>
        </div>
      </div>
    </div>
  );
}
