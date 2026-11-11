import { useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./HorizontalSplitter.module.scss";

export type HorizontalSplitterProps = {
  start?: number;
  minHeight?: number;
  duration?: number;
  easing?: string;
  color?: string;
};

type PEvt = { clientY: number; pointerId: number; preventDefault(): void; currentTarget: { setPointerCapture(id: number): void } };
type KeyEvt = { key: string; preventDefault(): void };
type Vars = CSSProperties & { "--splitY"?: string; "--duration"?: string; "--easing"?: string; "--color"?: string };

const BAR = 10;
function clamp(v: number, lo: number, hi: number): number { return Math.max(lo, Math.min(v, hi)); }

export default function HorizontalSplitter({
  start = 50,
  minHeight = 40,
  duration = 220,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: HorizontalSplitterProps) {
  const [split, setSplit] = useState(start);
  const [drag, setDrag] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  function set(pct: number): void {
    const box = boxRef.current;
    if (!box) return;
    const h = box.clientHeight;
    setSplit(clamp(pct, (minHeight / h) * 100, ((h - minHeight - BAR) / h) * 100));
  }
  function onDown(e: PEvt): void {
    setDrag(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    e.preventDefault();
  }
  function onMove(e: PEvt): void {
    const box = boxRef.current;
    if (!drag || !box) return;
    set(((e.clientY - box.getBoundingClientRect().top) / box.clientHeight) * 100);
  }
  function onUp(): void { setDrag(false); }
  function onKey(e: KeyEvt): void {
    const d = e.key === "ArrowUp" ? -5 : e.key === "ArrowDown" ? 5 : 0;
    if (!d) return;
    set(split + d);
    e.preventDefault();
  }

  const vars: Vars = {
    "--splitY": `${split.toFixed(1)}%`,
    "--duration": `${duration}ms`,
    "--easing": easing,
    "--color": color,
  };

  return (
    <div className={drag ? `${styles.hs} ${styles.isDrag}` : styles.hs} style={vars}>
      <div className={styles.box} ref={boxRef}>
        <section className={`${styles.pane} ${styles.paneCode}`} aria-label="Editor area">
          <span className={`${styles.tok} ${styles.tokA}`} />
          <span className={`${styles.tok} ${styles.tokB}`} />
          <span className={`${styles.tok} ${styles.tokC}`} />
          <span className={`${styles.tok} ${styles.tokB}`} />
        </section>
        <div
          className={styles.bar}
          role="separator"
          tabIndex={0}
          aria-orientation="horizontal"
          aria-label="Editor area height"
          aria-valuemin={20}
          aria-valuemax={80}
          aria-valuenow={Math.round(split)}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          onKeyDown={onKey}
        >
          <i className={styles.grip} aria-hidden="true" />
        </div>
        <section className={`${styles.pane} ${styles.paneOut}`} aria-label="Result area">
          <span className={styles.chip}>Result</span>
          <span className={styles.bars}>
            <i /><i /><i /><i /><i />
          </span>
        </section>
      </div>
      <p className={styles.cap}>Drag up and down, or use the arrow keys</p>
    </div>
  );
}
