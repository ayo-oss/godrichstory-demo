import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./BottomSheet.module.scss";

export type BottomSheetProps = {
  title?: string;
  rows?: { name: string; meta: string; hue: string }[];
  duration?: number;
  easing?: string;
  color?: string;
};

type PEvt = { clientX: number; clientY: number; pointerId: number; preventDefault(): void; currentTarget: { setPointerCapture(id: number): void } };
type KeyEvt = { key: string; preventDefault(): void };
type Box<T> = { current: T };
type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const H = 150;
const SNAPS = [H - 44, H - 96, 0]; // peek · half · full

const IconUp = () => (
  <svg viewBox="0 0 256 256" width="13" height="13"><g fill="currentColor"><path d="M208 160H48l80-80Z" opacity=".2"/><path d="m213.66 154.34l-80-80a8 8 0 0 0-11.32 0l-80 80A8 8 0 0 0 48 168h160a8 8 0 0 0 5.66-13.66M67.31 152L128 91.31L188.69 152Z"/></g></svg>
);
const IconDown = () => (
  <svg viewBox="0 0 256 256" width="13" height="13"><g fill="currentColor"><path d="m208 96l-80 80l-80-80Z" opacity=".2"/><path d="M215.39 92.94A8 8 0 0 0 208 88H48a8 8 0 0 0-5.66 13.66l80 80a8 8 0 0 0 11.32 0l80-80a8 8 0 0 0 1.73-8.72M128 164.69L67.31 104h121.38Z"/></g></svg>
);
const IconCoffee = () => (
  <svg viewBox="0 0 256 256" width="12" height="12"><g fill="currentColor"><path d="M208 88v48a88 88 0 0 1-51.3 80H83.3A88 88 0 0 1 32 136V88Z" opacity=".2"/><path d="M224 120v8a40 40 0 0 1-37.51 39.91a96.6 96.6 0 0 1-27 40.09H208a8 8 0 0 1 0 16H32a8 8 0 0 1 0-16h24.54A96.3 96.3 0 0 1 24 136V88a8 8 0 0 1 8-8h176a40 40 0 0 1 40 40m-48-24H40v40a80.27 80.27 0 0 0 45.12 72h69.76A80.27 80.27 0 0 0 200 136Z"/></g></svg>
);

export default function BottomSheet({
  title = "Nearby cafes",
  rows = [
    { name: "Mochi Cafe", meta: "3-min walk · 4.8", hue: "#2f6df6" },
    { name: "Juice Stand", meta: "5-min walk · 4.6", hue: "#ff4d1f" },
    { name: "Tea House", meta: "7-min walk · 4.9", hue: "#4cd4a6" },
  ],
  duration = 300,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: BottomSheetProps) {
  const [at, setAt] = useState(0);
  const [ty, setTy] = useState(SNAPS[0]);
  const [dragging, setDragging] = useState(false);
  const drag = useRef({ startY: 0, lastY: 0, t0: 0, v: 0, startPos: 0 }) as Box<{ startY: number; lastY: number; t0: number; v: number; startPos: number }>;
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  function go(i: number) {
    const n = Math.max(0, Math.min(SNAPS.length - 1, i));
    setAt(n);
    setTy(SNAPS[n]);
  }

  function onDown(e: PEvt) {
    drag.current = { startY: e.clientY, lastY: e.clientY, t0: Date.now(), v: 0, startPos: SNAPS[at] };
    setDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function onMove(e: PEvt) {
    if (!dragging) return;
    const now = Date.now();
    if (now - drag.current.t0 > 0) {
      drag.current.v = (e.clientY - drag.current.lastY) / Math.max(1, now - drag.current.t0);
      drag.current.lastY = e.clientY;
      drag.current.t0 = now;
    }
    setTy(Math.max(0, drag.current.startPos + (e.clientY - drag.current.startY)));
  }
  function onUp() {
    if (!dragging) return;
    setDragging(false);
    const cur = drag.current.startPos + (drag.current.lastY - drag.current.startY);
    if (drag.current.v > 0.5) { go(0); return; }
    if (drag.current.v < -0.5) { go(SNAPS.length - 1); return; }
    let best = 0, dist = 1e9;
    SNAPS.forEach((s, i) => {
      const d = Math.abs(cur - s);
      if (d < dist) { dist = d; best = i; }
    });
    go(best);
  }

  function onKey(e: KeyEvt) {
    if (e.key === "ArrowUp") { go(at + 1); e.preventDefault(); }
    else if (e.key === "ArrowDown" || e.key === "Escape") { go(at - 1); e.preventDefault(); }
  }

  useEffect(() => {
    const el = document.documentElement;
    function wheel(e: WheelEvent) { if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) e.preventDefault(); }
    el.addEventListener("wheel", wheel, { passive: false });
    return () => el.removeEventListener("wheel", wheel);
  }, []);

  return (
    <div className={styles.bs} style={vars}>
      <div className={styles.frame}>
        <div className={styles.map} aria-hidden="true">
          <i className={styles.roadH} /><i className={styles.roadV} /><i className={styles.roadH2} />
          <span className={styles.pin} /><span className={`${styles.pin} ${styles.pinB}`} />
        </div>
        <section
          className={dragging ? styles.sheetRaw : styles.sheet}
          style={{ transform: `translateY(${ty}px)` }}
          tabIndex={0}
          aria-label={`${title} sheet`}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          onKeyDown={onKey}
        >
          <span className={styles.grab} aria-hidden="true" />
          <header className={styles.head}>
            <strong>{title}</strong>
            <span className={styles.steps}>
              <button type="button" className={styles.step} aria-label="Down one step" onClick={(): void => go(at - 1)}>
                <IconDown />
              </button>
              <button type="button" className={styles.step} aria-label="Up one step" onClick={(): void => go(at + 1)}>
                <IconUp />
              </button>
            </span>
          </header>
          <ul className={styles.list}>
            {rows.map((r, i) => (
              <li key={r.name} className={i === 1 ? styles.rowOn : undefined}>
                <span className={styles.cafe} style={{ background: r.hue }} aria-hidden="true"><IconCoffee /></span>
                <div><strong>{r.name}</strong><span>{r.meta}</span></div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
