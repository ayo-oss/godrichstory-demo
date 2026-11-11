import { useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./RubberBand.module.scss";

export type RubberBandProps = {
  rows?: string[];
  topLabel?: string;
  bottomLabel?: string;
  duration?: number;
  easing?: string;
  color?: string;
};

type PEvt = { clientX: number; clientY: number; pointerId: number; preventDefault(): void; currentTarget: { setPointerCapture(id: number): void } };
type KeyEvt = { key: string; preventDefault(): void };
type Box<T> = { current: T };
type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function RubberBand({
  rows = ["October maintenance", "Event winners announced", "New feature released", "Holiday notice", "Terms updated"],
  topLabel = "No earlier notices",
  bottomLabel = "This is the last notice",
  duration = 600,
  easing = "cubic-bezier(.2,1.4,.4,1)",
  color = "#17141a",
}: RubberBandProps) {
  const [y, setY] = useState(0);
  const [bounce, setBounce] = useState(false);
  const viewRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const drag = useRef({ on: false, y0: 0 }) as Box<{ on: boolean; y0: number }>;
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  function bounds() {
    const v = viewRef.current, i = innerRef.current;
    const bottom = v && i ? Math.max(0, i.offsetHeight - v.clientHeight + 2) : 0;
    return { top: 0, bottom };
  }

  function display(yv: number) {
    const b = bounds();
    let yd = yv;
    if (yd < b.top) yd = b.top + (yd - b.top) / 3;
    if (yd > b.bottom) yd = b.bottom + (yd - b.bottom) / 3;
    return yd;
  }

  function onDown(e: PEvt) {
    drag.current = { on: true, y0: e.clientY + y };
    e.currentTarget.setPointerCapture(e.pointerId);
    setBounce(false);
    e.preventDefault();
  }
  function onMove(e: PEvt) {
    if (!drag.current.on) return;
    setY(drag.current.y0 - e.clientY);
  }
  function onUp() {
    if (!drag.current.on) return;
    drag.current.on = false;
    const b = bounds();
    setBounce(true);
    setY(Math.max(b.top, Math.min(b.bottom, y)));
  }

  function onKey(e: KeyEvt) {
    const b = bounds();
    if (e.key === "ArrowUp") { setBounce(false); setY(b.top - 26); window.setTimeout((): void => { setBounce(true); setY(0); }, 240); e.preventDefault(); }
    else if (e.key === "ArrowDown") { setBounce(false); setY(b.bottom + 26); window.setTimeout((): void => { setBounce(true); setY(b.bottom); }, 240); e.preventDefault(); }
  }

  return (
    <div className={styles.rb} style={vars}>
      <div
        ref={viewRef}
        className={styles.view}
        tabIndex={0}
        role="group"
        aria-label="Notice list — arrow keys check the ends"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onKeyDown={onKey}
      >
        <span className={y < -6 ? styles.endOn : styles.endTop} aria-hidden="true">{topLabel}</span>
        <div ref={innerRef} className={bounce ? styles.innerBounce : styles.inner} style={{ transform: `translateY(${-display(y)}px)` }}>
          {rows.map((r, i) => (
            <div key={r} className={styles.row}>
              <span className={i % 4 === 0 ? styles.dot : i % 4 === 1 ? styles.dotPink : i % 4 === 2 ? styles.dotBlue : styles.dotLilac} />
              <strong>{r}</strong>
              <time>{`10-0${(5 - i)}`}</time>
            </div>
          ))}
        </div>
        <span className={y > bounds().bottom + 6 ? styles.endOn : styles.endBottom} aria-hidden="true">{bottomLabel}</span>
      </div>
      <p className={styles.hint}>Past the end each pixel drags harder, and releasing springs it back</p>
    </div>
  );
}
