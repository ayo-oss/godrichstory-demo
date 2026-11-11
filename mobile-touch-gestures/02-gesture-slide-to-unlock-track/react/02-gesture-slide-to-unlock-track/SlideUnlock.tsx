import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./SlideUnlock.module.scss";

export type SlideUnlockProps = {
  label?: string;
  doneLabel?: string;
  duration?: number;
  easing?: string;
  color?: string;
};

type PEvt = { clientX: number; clientY: number; pointerId: number; preventDefault(): void; currentTarget: { setPointerCapture(id: number): void } };
type KeyEvt = { key: string; preventDefault(): void };
type Box<T> = { current: T };
type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const IconArrow = () => (
  <svg viewBox="0 0 256 256" width="14" height="14"><g fill="currentColor"><path d="m216 128l-72 72V56Z" opacity=".2"/><path d="m221.66 122.34l-72-72A8 8 0 0 0 136 56v64H40a8 8 0 0 0 0 16h96v64a8 8 0 0 0 13.66 5.66l72-72a8 8 0 0 0 0-11.32M152 180.69V75.31L204.69 128Z"/></g></svg>
);
const IconDone = () => (
  <svg viewBox="0 0 256 256" width="13" height="13"><g fill="currentColor"><path d="M232 56v144a16 16 0 0 1-16 16H40a16 16 0 0 1-16-16V56a16 16 0 0 1 16-16h176a16 16 0 0 1 16 16" opacity=".2"/><path d="m205.66 85.66l-96 96a8 8 0 0 1-11.32 0l-40-40a8 8 0 0 1 11.32-11.32L104 164.69l90.34-90.35a8 8 0 0 1 11.32 11.32"/></g></svg>
);
const IconLock = () => (
  <svg viewBox="0 0 256 256" width="15" height="15"><g fill="currentColor"><path d="M216 96v112a8 8 0 0 1-8 8H48a8 8 0 0 1-8-8V96a8 8 0 0 1 8-8h160a8 8 0 0 1 8 8" opacity=".2"/><path d="M208 80h-32V56a48 48 0 0 0-96 0v24H48a16 16 0 0 0-16 16v112a16 16 0 0 0 16 16h160a16 16 0 0 0 16-16V96a16 16 0 0 0-16-16M96 56a32 32 0 0 1 64 0v24H96Zm112 152H48V96h160z"/></g></svg>
);

export default function SlideUnlock({
  label = "Slide to unlock",
  doneLabel = "Unlocked — relocks in 1.6s",
  duration = 300,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#17141a",
}: SlideUnlockProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLButtonElement>(null);
  const [x, setX] = useState(0);
  const [done, setDone] = useState(false);
  const drag = useRef({ on: false, sx: 0, x0: 0 }) as Box<{ on: boolean; sx: number; x0: number }>;
  const maxRef = useRef(204) as Box<number>;
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  useEffect(() => {
    function measure() {
      const t = trackRef.current, h = handleRef.current;
      if (t && h) maxRef.current = t.clientWidth - h.clientWidth - 8;
    }
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  useEffect(() => {
    if (!done) return;
    const t = window.setTimeout(() => { setDone(false); setX(0); }, 1600);
    return () => window.clearTimeout(t);
  }, [done]);

  function paint(px: number) {
    const max = maxRef.current;
    const nx = Math.max(0, Math.min(px, max));
    setX(nx);
    if (nx >= max - 1 && !done) setDone(true);
  }

  function onDown(e: PEvt) {
    if (done) return;
    drag.current = { on: true, sx: e.clientX, x0: x };
    e.currentTarget.setPointerCapture(e.pointerId);
    e.preventDefault();
  }
  function onMove(e: PEvt) {
    if (!drag.current.on) return;
    paint(drag.current.x0 + (e.clientX - drag.current.sx));
  }
  function onUp() { drag.current.on = false; if (!done) paint(0); }

  function onKey(e: KeyEvt) {
    if (done) return;
    if (e.key === "ArrowRight") { paint(x + 12); e.preventDefault(); }
    else if (e.key === "Enter" && x >= maxRef.current - 14) { paint(maxRef.current); e.preventDefault(); }
  }

  return (
    <div className={styles.su} style={vars}>
      <div ref={trackRef} className={styles.track}>
        <span className={styles.t1} aria-hidden="true">{label}</span>
        <span className={styles.t2} aria-hidden="true" style={{ width: x + 36 }}>{label}</span>
        <span className={done ? styles.lockDone : styles.lock} aria-hidden="true">
          {done ? <IconDone /> : <IconLock />}
        </span>
        <button
          ref={handleRef}
          type="button"
          className={styles.handle}
          aria-label="Slide all the way right to unlock"
          style={{ transform: `translate(-50%, -50%) translateX(${8 + x}px)` }}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          onKeyDown={onKey}
        >
          <IconArrow />
        </button>
      </div>
      <p className={styles.state} aria-live="polite">{done ? doneLabel : `${label} — hold and push right`}</p>
    </div>
  );
}
