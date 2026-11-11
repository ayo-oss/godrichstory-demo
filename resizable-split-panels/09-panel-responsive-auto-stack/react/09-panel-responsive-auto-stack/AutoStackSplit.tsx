import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./AutoStackSplit.module.scss";

export type AutoStackSplitProps = {
  /** 이 폭 아래로 내려가면 위아래 배치로 뒤집는다 (px) */
  flipAt?: number;
  start?: number;
  duration?: number;
  easing?: string;
  color?: string;
};

type PEvt = { clientX: number; clientY: number; pointerId: number; preventDefault(): void; currentTarget: { setPointerCapture(id: number): void } };
type KeyEvt = { key: string; preventDefault(): void };
type Vars = CSSProperties & { "--split"?: string; "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function AutoStackSplit({
  flipAt = 200,
  start = 50,
  duration = 220,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: AutoStackSplitProps) {
  const [split, setSplit] = useState(start);
  const [stacked, setStacked] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  // 미디어쿼리가 아니라 **상자 폭**을 잰다 — 같은 컴포넌트가 어디에 놓여도 맞는다
  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const ro = new ResizeObserver((entries) => {
      setStacked(entries[0].contentRect.width < flipAt);
    });
    ro.observe(box);
    return () => ro.disconnect();
  }, [flipAt]);

  function set(pct: number): void { setSplit(Math.max(20, Math.min(pct, 80))); }
  function onDown(e: PEvt): void {
    dragging.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    e.preventDefault();
  }
  function onMove(e: PEvt): void {
    const box = boxRef.current;
    if (!dragging.current || !box) return;
    const r = box.getBoundingClientRect();
    set(stacked ? ((e.clientY - r.top) / r.height) * 100 : ((e.clientX - r.left) / r.width) * 100);
  }
  function onUp(): void { dragging.current = false; }
  function onKey(e: KeyEvt): void {
    const d = e.key === "ArrowLeft" || e.key === "ArrowUp" ? -5 : e.key === "ArrowRight" || e.key === "ArrowDown" ? 5 : 0;
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
    <div className={stacked ? `${styles.as} ${styles.isStack}` : styles.as} style={vars}>
      <div className={styles.frame}>
        <div className={styles.box} ref={boxRef}>
          <section className={`${styles.pane} ${styles.paneA}`} aria-label="Top pane">
            <span className={styles.ln} />
            <span className={`${styles.ln} ${styles.lnShort}`} />
          </section>
          <div
            className={styles.bar}
            role="separator"
            tabIndex={0}
            aria-orientation={stacked ? "horizontal" : "vertical"}
            aria-label="Split position"
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
          <section className={`${styles.pane} ${styles.paneB}`} aria-label="Bottom pane">
            <span className={`${styles.ln} ${styles.lnDark}`} />
            <span className={`${styles.ln} ${styles.lnDark} ${styles.lnShort}`} />
          </section>
        </div>
      </div>
      <p className={styles.cap}>Narrow enough and the sides become stacked</p>
    </div>
  );
}
