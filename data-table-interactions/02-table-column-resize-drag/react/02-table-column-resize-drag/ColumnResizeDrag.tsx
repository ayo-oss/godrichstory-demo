import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./ColumnResizeDrag.module.scss";

export type ResizeRow = { name: string; qty: string };

export type ColumnResizeDragProps = {
  rows?: ResizeRow[];
  tableLabel?: string;
  nameLabel?: string;
  qtyLabel?: string;
  gripLabel?: string;
  /** 자동 재생 루프 (갤러리용). 사람이 손대면 꺼진다 */
  demo?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type WidthVars = CSSProperties & { "--w1"?: string };
type PtrEvt = { clientX: number };
type KeyEvt = { key: string; preventDefault: () => void };

const MIN = 88;
const MAX = 200;

const DEFAULT_ROWS: ResizeRow[] = [
  { name: "Cherry jam, one jar", qty: "12" },
  { name: "Mint soap bundle", qty: "7" },
  { name: "Lilac letter paper", qty: "24" },
];

function Grip() {
  return (
    <svg viewBox="0 0 256 256" width="1em" height="1em" fill="currentColor" aria-hidden="true">
      <g>
        <path d="m232 128l-32 32H56l-32-32l32-32h144Z" opacity=".2" />
        <path d="m237.66 133.66l-32 32a8 8 0 0 1-11.32-11.32L212.69 136H43.31l18.35 18.34a8 8 0 0 1-11.32 11.32l-32-32a8 8 0 0 1 0-11.32l32-32a8 8 0 0 1 11.32 11.32L43.31 120h169.38l-18.35-18.34a8 8 0 0 1 11.32-11.32l32 32a8 8 0 0 1 0 11.32" />
      </g>
    </svg>
  );
}

function clampW(w: number): number {
  return Math.max(MIN, Math.min(MAX, w));
}

export default function ColumnResizeDrag({
  rows = DEFAULT_ROWS,
  tableLabel = "Product list",
  nameLabel = "Product",
  qtyLabel = "Qty",
  gripLabel = "Resize column",
  demo = true,
  duration = 220,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: ColumnResizeDragProps) {
  const [w, setW] = useState(132);
  const [guideX, setGuideX] = useState(132);
  const [dragging, setDragging] = useState(false);
  const [live, setLive] = useState(demo);

  // ambient useRef 는 항상 T | null 을 돌려준다 — 지역 별칭으로 한 번만 좁혀 쓴다
  const dragRef = useRef<{ from: number; at: number }>({ from: 132, at: 0 });
  const drag = dragRef.current || { from: 132, at: 0 };
  const cellsRef = useRef<(HTMLElement | null)[]>([]);
  const cells: (HTMLElement | null)[] = cellsRef.current || [];

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  const gridVars: WidthVars = { "--w1": `${w}px` };

  // 끄는 동안에만 창 전체를 듣는다 — 손잡이 밖으로 나가도 폭이 따라온다
  useEffect(() => {
    if (!dragging) return;
    function move(e: PtrEvt) {
      const next = clampW(drag.from + (e.clientX - drag.at));
      setW(next);
      setGuideX(next);
    }
    function up() { setDragging(false); }
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [dragging]);

  function onDown(e: PtrEvt) {
    setLive(false);
    drag.from = w;
    drag.at = e.clientX;
    setGuideX(w);
    setDragging(true);
  }

  // 손잡이를 두 번 누르면 가장 긴 글자에 맞춰 넓힌다
  function onFit() {
    setLive(false);
    let wide = 0;
    cells.forEach((el) => { if (el) wide = Math.max(wide, el.scrollWidth + 20); });
    setW(clampW(wide));
  }

  function onKey(e: KeyEvt) {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    setLive(false);
    setW(clampW(w + (e.key === "ArrowRight" ? 8 : -8)));
  }

  const cls = [styles.root, live ? styles.isDemo : "", dragging ? styles.isDrag : ""].join(" ");

  return (
    <div className={cls} style={vars}>
      <div className={styles.grid} style={gridVars} role="grid" aria-label={tableLabel}>
        <div className={`${styles.row} ${styles.rowHead}`} role="row">
          <span className={`${styles.c} ${styles.cH}`} role="columnheader">{nameLabel}</span>
          <span
            className={styles.grip}
            role="separator"
            aria-label={gripLabel}
            aria-orientation="vertical"
            tabIndex={0}
            onPointerDown={onDown}
            onDoubleClick={onFit}
            onKeyDown={onKey}
          >
            <Grip />
          </span>
          <span className={`${styles.c} ${styles.cH}`} role="columnheader">{qtyLabel}</span>
        </div>
        {rows.map((r, i) => (
          <div className={styles.row} role="row" key={r.name}>
            <span
              className={styles.c}
              role="gridcell"
              ref={(el: HTMLElement | null) => { cells[i] = el; }}
            >
              {r.name}
            </span>
            <i />
            <span className={styles.c} role="gridcell">{r.qty}</span>
          </div>
        ))}
      </div>
      <div className={styles.guide} aria-hidden="true" style={{ transform: `translateX(${guideX}px)` }} />
    </div>
  );
}
