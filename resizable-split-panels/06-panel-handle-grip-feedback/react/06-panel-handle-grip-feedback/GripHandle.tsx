import { useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./GripHandle.module.scss";

export type GripHandleProps = {
  start?: number;
  duration?: number;
  easing?: string;
  color?: string;
};

type PEvt = { clientX: number; pointerId: number; preventDefault(): void; currentTarget: { setPointerCapture(id: number): void } };
type KeyEvt = { key: string; preventDefault(): void };
type Vars = CSSProperties & { "--split"?: string; "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function GripHandle({
  start = 46,
  duration = 220,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: GripHandleProps) {
  const [split, setSplit] = useState(start);
  const [near, setNear] = useState(false);
  const [drag, setDrag] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  function set(pct: number): void { setSplit(Math.max(20, Math.min(pct, 80))); }
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
  function onUp(): void { setDrag(false); setNear(false); }
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
  const cls = [styles.hg, near ? styles.isNear : "", drag ? styles.isDrag : ""].join(" ").trim();

  return (
    <div className={cls} style={vars}>
      <div className={styles.box} ref={boxRef}>
        <section className={`${styles.pane} ${styles.paneL}`} aria-label="Left pane">
          <span className={styles.ln} />
          <span className={`${styles.ln} ${styles.lnShort}`} />
          <span className={styles.ln} />
        </section>
        <div
          className={styles.bar}
          role="separator"
          tabIndex={0}
          aria-orientation="vertical"
          aria-label="Split width"
          aria-valuemin={20}
          aria-valuemax={80}
          aria-valuenow={Math.round(split)}
          onPointerEnter={(): void => setNear(true)}
          onPointerLeave={(): void => { if (!drag) setNear(false); }}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          onKeyDown={onKey}
        >
          <i className={styles.hair} aria-hidden="true" />
          <i className={styles.dots} aria-hidden="true"><s /><s /><s /></i>
        </div>
        <section className={`${styles.pane} ${styles.paneR}`} aria-label="Right pane">
          <span className={`${styles.ln} ${styles.lnDark}`} />
          <span className={`${styles.ln} ${styles.lnDark} ${styles.lnShort}`} />
        </section>
      </div>
      <p className={styles.cap}>It widens on hover and stays lit while you drag</p>
    </div>
  );
}
