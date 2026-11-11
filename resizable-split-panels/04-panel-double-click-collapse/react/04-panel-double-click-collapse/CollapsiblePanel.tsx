import { useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./CollapsiblePanel.module.scss";

export type CollapsiblePanelProps = {
  start?: number;
  /** 접혔을 때 남는 띠 폭 (%) */
  rail?: number;
  duration?: number;
  easing?: string;
  color?: string;
};

type PEvt = { clientX: number; pointerId: number; preventDefault(): void; currentTarget: { setPointerCapture(id: number): void } };
type KeyEvt = { key: string; preventDefault(): void };
type Box<T> = { current: T };
type Vars = CSSProperties & { "--split"?: string; "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function CollapsiblePanel({
  start = 34,
  rail = 4,
  duration = 300,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: CollapsiblePanelProps) {
  const [split, setSplit] = useState(start);
  const [folded, setFolded] = useState(false);
  const [live, setLive] = useState(false);
  const last = useRef(start) as Box<number>;
  const boxRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false) as Box<boolean>;

  function toggle(): void {
    const next = !folded;
    setFolded(next);
    setSplit(next ? rail : last.current);
  }
  function onDown(e: PEvt): void {
    dragging.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    e.preventDefault();
  }
  function onMove(e: PEvt): void {
    const box = boxRef.current;
    if (!dragging.current || !box) return;
    setLive(true);
    const pct = ((e.clientX - box.getBoundingClientRect().left) / box.clientWidth) * 100;
    last.current = Math.max(14, Math.min(pct, 60));
    setFolded(false);
    setSplit(last.current);
  }
  function onUp(): void { dragging.current = false; setLive(false); }
  function onKey(e: KeyEvt): void {
    if (e.key !== "Enter" && e.key !== " ") return;
    toggle();
    e.preventDefault();
  }

  const vars: Vars = {
    "--split": `${split.toFixed(1)}%`,
    "--duration": `${duration}ms`,
    "--easing": easing,
    "--color": color,
  };
  const cls = [styles.dc, folded ? styles.isFolded : "", live ? styles.isLive : ""].join(" ").trim();

  return (
    <div className={cls} style={vars}>
      <div className={styles.box} ref={boxRef}>
        <section className={styles.side} aria-label="Sidebar">
          <span className={styles.ico}>
            <svg viewBox="0 0 256 256" aria-hidden="true"><g fill="currentColor"><path d="M88 48v160H40a8 8 0 0 1-8-8V56a8 8 0 0 1 8-8Z" opacity=".2" /><path d="M216 40H40a16 16 0 0 0-16 16v144a16 16 0 0 0 16 16h176a16 16 0 0 0 16-16V56a16 16 0 0 0-16-16M40 56h40v144H40Zm176 144H96V56h120z" /></g></svg>
          </span>
          <span className={styles.row} />
          <span className={styles.row} />
          <span className={styles.row} />
        </section>
        <div
          className={styles.bar}
          role="separator"
          tabIndex={0}
          aria-orientation="vertical"
          aria-label="Sidebar width"
          aria-expanded={!folded}
          aria-valuemin={4}
          aria-valuemax={60}
          aria-valuenow={Math.round(split)}
          onDoubleClick={toggle}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          onKeyDown={onKey}
        >
          <i className={styles.grip} aria-hidden="true" />
        </div>
        <section className={styles.main} aria-label="Main">
          <b className={styles.head} />
          <span className={styles.line} />
          <span className={`${styles.line} ${styles.lineShort}`} />
        </section>
      </div>
      <p className={styles.cap}>Double-click the handle to fold</p>
    </div>
  );
}
