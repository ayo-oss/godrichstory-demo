import { useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./VerticalSplitter.module.scss";

export type VerticalSplitterProps = {
  /** 시작 비율 (%) */
  start?: number;
  /** 양쪽 최소 폭 (px) */
  minWidth?: number;
  duration?: number;
  easing?: string;
  color?: string;
};

type PEvt = { clientX: number; pointerId: number; preventDefault(): void; currentTarget: { setPointerCapture(id: number): void } };
type KeyEvt = { key: string; preventDefault(): void };
type Vars = CSSProperties & { "--split"?: string; "--duration"?: string; "--easing"?: string; "--color"?: string };

const BAR = 10;

export default function VerticalSplitter({
  start = 50,
  minWidth = 64,
  duration = 220,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: VerticalSplitterProps) {
  const [split, setSplit] = useState(start);
  const [drag, setDrag] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  function set(pct: number): void {
    const box = boxRef.current;
    if (!box) return;
    const w = box.clientWidth;
    const lo = (minWidth / w) * 100;
    const hi = ((w - minWidth - BAR) / w) * 100;
    setSplit(Math.max(lo, Math.min(pct, hi)));
  }

  function onDown(e: PEvt): void {
    setDrag(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    e.preventDefault();
  }
  function onMove(e: PEvt): void {
    const box = boxRef.current;
    if (!drag || !box) return;
    set(((e.clientX - box.getBoundingClientRect().left) / box.clientWidth) * 100);
  }
  function onUp(): void { setDrag(false); }
  function onKey(e: KeyEvt): void {
    const d = e.key === "ArrowLeft" ? -4 : e.key === "ArrowRight" ? 4 : 0;
    if (!d) return;
    set(split + d);
    e.preventDefault();
  }

  const vars: Vars = {
    "--split": `${split.toFixed(1)}%`,
    "--duration": `${duration}ms`,
    "--easing": easing,
    "--color": color,
  };

  return (
    <div className={drag ? `${styles.vs} ${styles.isDrag}` : styles.vs} style={vars}>
      <div className={styles.box} ref={boxRef}>
        <section className={`${styles.pane} ${styles.paneList}`} aria-label="Mail list">
          <span className={styles.row} />
          <span className={`${styles.row} ${styles.rowOn}`} />
          <span className={styles.row} />
          <span className={styles.row} />
        </section>
        <div
          className={styles.bar}
          role="separator"
          tabIndex={0}
          aria-orientation="vertical"
          aria-label="List width"
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
        <section className={`${styles.pane} ${styles.paneRead}`} aria-label="Mail body">
          <b className={styles.title} />
          <span className={styles.line} />
          <span className={`${styles.line} ${styles.lineShort}`} />
          <span className={styles.line} />
        </section>
      </div>
      <p className={styles.cap}>Drag the handle sideways to set the width</p>
    </div>
  );
}
