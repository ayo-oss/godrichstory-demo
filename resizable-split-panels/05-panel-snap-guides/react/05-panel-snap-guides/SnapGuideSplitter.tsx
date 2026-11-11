import { useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./SnapGuideSplitter.module.scss";

export type SnapGuideSplitterProps = {
  /** 자석이 되는 비율들 */
  stops?: number[];
  /** 몇 % 안에 들어오면 붙는가 */
  near?: number;
  duration?: number;
  easing?: string;
  color?: string;
};

type PEvt = { clientX: number; pointerId: number; preventDefault(): void; currentTarget: { setPointerCapture(id: number): void } };
type KeyEvt = { key: string; preventDefault(): void };
type Vars = CSSProperties & { "--split"?: string; "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function SnapGuideSplitter({
  stops = [25, 50, 75],
  near = 6,
  duration = 140,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#4cd4a6",
}: SnapGuideSplitterProps) {
  const [split, setSplit] = useState(50);
  const [drag, setDrag] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  function snap(pct: number): number {
    let best = pct;
    for (let i = 0; i < stops.length; i += 1) {
      if (Math.abs(pct - stops[i]) < near) best = stops[i];
    }
    return Math.max(10, Math.min(best, 90));
  }
  function set(pct: number): void { setSplit(snap(pct)); }

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
    const d = e.key === "ArrowLeft" ? -5 : e.key === "ArrowRight" ? 5 : 0;
    if (!d) return;
    set(split + d);
    e.preventDefault();
  }

  const snapped = stops.indexOf(split) >= 0;
  const vars: Vars = {
    "--split": `${split}%`,
    "--duration": `${duration}ms`,
    "--easing": easing,
    "--color": color,
  };
  const cls = [styles.sg, drag ? styles.isDrag : "", snapped ? styles.isSnapped : ""].join(" ").trim();

  return (
    <div className={cls} style={vars}>
      <div className={styles.box} ref={boxRef}>
        <div className={styles.guides} aria-hidden="true">
          {stops.map((s) => (
            <i key={s} className={styles.g} style={{ left: `${s}%` }} />
          ))}
        </div>
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
          aria-label="Split ratio"
          aria-valuemin={10}
          aria-valuemax={90}
          aria-valuenow={Math.round(split)}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          onKeyDown={onKey}
        >
          <i className={styles.grip} aria-hidden="true" />
        </div>
        <section className={`${styles.pane} ${styles.paneR}`} aria-label="Right pane">
          <span className={styles.ln} />
          <span className={`${styles.ln} ${styles.lnShort}`} />
        </section>
      </div>
      <p className={styles.cap}>It snaps at 25, 50 and 75 percent</p>
    </div>
  );
}
