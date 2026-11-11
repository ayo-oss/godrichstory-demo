import { useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./ThreePaneLayout.module.scss";

export type ThreePaneLayoutProps = {
  startCol?: number;
  startRow?: number;
  duration?: number;
  easing?: string;
  color?: string;
};

type PEvt = { clientX: number; clientY: number; pointerId: number; preventDefault(): void; currentTarget: { setPointerCapture(id: number): void } };
type KeyEvt = { key: string; preventDefault(): void };
type Vars = CSSProperties & { "--col"?: string; "--row"?: string; "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function ThreePaneLayout({
  startCol = 30,
  startRow = 66,
  duration = 220,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: ThreePaneLayoutProps) {
  const [col, setCol] = useState(startCol);
  const [row, setRow] = useState(startRow);
  const live = useRef<"col" | "row" | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  function onDown(axis: "col" | "row", e: PEvt): void {
    live.current = axis;
    e.currentTarget.setPointerCapture(e.pointerId);
    e.preventDefault();
  }
  function onMove(axis: "col" | "row", e: PEvt): void {
    const box = boxRef.current;
    if (live.current !== axis || !box) return;
    const r = box.getBoundingClientRect();
    if (axis === "col") setCol(Math.max(14, Math.min(((e.clientX - r.left) / r.width) * 100, 60)));
    else setRow(Math.max(16, Math.min(((e.clientY - r.top) / r.height) * 100, 70)));
  }
  function onUp(): void { live.current = null; }
  function onKey(axis: "col" | "row", e: KeyEvt): void {
    const d = e.key === "ArrowLeft" || e.key === "ArrowUp" ? -5 : e.key === "ArrowRight" || e.key === "ArrowDown" ? 5 : 0;
    if (!d) return;
    if (axis === "col") setCol(Math.max(14, Math.min(col + d, 60)));
    else setRow(Math.max(16, Math.min(row + d, 70)));
    e.preventDefault();
  }

  const vars: Vars = {
    "--col": `${col.toFixed(1)}%`,
    "--row": `${row.toFixed(1)}%`,
    "--duration": `${duration}ms`,
    "--easing": easing,
    "--color": color,
  };

  return (
    <div className={styles.tp} style={vars}>
      <div className={styles.box} ref={boxRef}>
        <section className={styles.side} aria-label="File list">
          <span className={styles.ico}>
            <svg viewBox="0 0 256 256" aria-hidden="true"><g fill="currentColor"><path d="M128 80H32V56a8 8 0 0 1 8-8h52.69a8 8 0 0 1 5.65 2.34Z" opacity=".2" /><path d="M216 72h-84.69L104 44.69A15.86 15.86 0 0 0 92.69 40H40a16 16 0 0 0-16 16v144.62A15.4 15.4 0 0 0 39.38 216h177.51A15.13 15.13 0 0 0 232 200.89V88a16 16 0 0 0-16-16M92.69 56l16 16H40V56ZM216 200H40V88h176Z" /></g></svg>
          </span>
          <span className={styles.row} />
          <span className={`${styles.row} ${styles.rowOn}`} />
          <span className={styles.row} />
        </section>
        <div
          className={`${styles.bar} ${styles.barV}`}
          role="separator"
          tabIndex={0}
          aria-orientation="vertical"
          aria-label="Sidebar width"
          aria-valuemin={14}
          aria-valuemax={60}
          aria-valuenow={Math.round(col)}
          onPointerDown={(e: PEvt): void => onDown("col", e)}
          onPointerMove={(e: PEvt): void => onMove("col", e)}
          onPointerUp={onUp}
          onKeyDown={(e: KeyEvt): void => onKey("col", e)}
        />
        <div className={styles.main}>
          <section className={styles.edit} aria-label="Editor">
            <span className={styles.ico}>
              <svg viewBox="0 0 256 256" aria-hidden="true"><g fill="currentColor"><path d="m240 128l-48 40H64l-48-40l48-40h128Z" opacity=".2" /><path d="M69.12 94.15L28.5 128l40.62 33.85a8 8 0 1 1-10.24 12.29l-48-40a8 8 0 0 1 0-12.29l48-40a8 8 0 0 1 10.24 12.3m176 27.7l-48-40a8 8 0 1 0-10.24 12.3L227.5 128l-40.62 33.85a8 8 0 1 0 10.24 12.29l48-40a8 8 0 0 0 0-12.29m-82.39-89.37a8 8 0 0 0-10.25 4.79l-64 176a8 8 0 0 0 4.79 10.26A8.1 8.1 0 0 0 96 224a8 8 0 0 0 7.52-5.27l64-176a8 8 0 0 0-4.79-10.25" /></g></svg>
            </span>
            <span className={`${styles.tok} ${styles.tokA}`} />
            <span className={`${styles.tok} ${styles.tokB}`} />
            <span className={`${styles.tok} ${styles.tokC}`} />
          </section>
          <div
            className={`${styles.bar} ${styles.barH}`}
            role="separator"
            tabIndex={0}
            aria-orientation="horizontal"
            aria-label="Console height"
            aria-valuemin={16}
            aria-valuemax={70}
            aria-valuenow={Math.round(row)}
            onPointerDown={(e: PEvt): void => onDown("row", e)}
            onPointerMove={(e: PEvt): void => onMove("row", e)}
            onPointerUp={onUp}
            onKeyDown={(e: KeyEvt): void => onKey("row", e)}
          />
          <section className={styles.term} aria-label="Console">
            <span className={styles.ico}>
              <svg viewBox="0 0 256 256" aria-hidden="true"><g fill="currentColor"><path d="M224 56v144a8 8 0 0 1-8 8H40a8 8 0 0 1-8-8V56a8 8 0 0 1 8-8h176a8 8 0 0 1 8 8" opacity=".2" /><path d="M128 128a8 8 0 0 1-3 6.25l-40 32a8 8 0 1 1-10-12.5L107.19 128L75 102.25a8 8 0 1 1 10-12.5l40 32a8 8 0 0 1 3 6.25m48 24h-40a8 8 0 0 0 0 16h40a8 8 0 0 0 0-16m56-96v144a16 16 0 0 1-16 16H40a16 16 0 0 1-16-16V56a16 16 0 0 1 16-16h176a16 16 0 0 1 16 16m-16 144V56H40v144z" /></g></svg>
            </span>
            <span className={`${styles.tok} ${styles.tokD}`} />
          </section>
        </div>
      </div>
      <p className={styles.cap}>Each handle only shrinks the pane next to it</p>
    </div>
  );
}
