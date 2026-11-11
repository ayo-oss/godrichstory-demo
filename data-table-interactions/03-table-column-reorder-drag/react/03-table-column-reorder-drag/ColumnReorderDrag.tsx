import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./ColumnReorderDrag.module.scss";

export type ReorderCol = { key: string; head: string; cells: string[] };

export type ColumnReorderDragProps = {
  columns?: ReorderCol[];
  tableLabel?: string;
  /** 자동 재생 루프 (갤러리용). 사람이 손대면 꺼진다 */
  demo?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type PtrEvt = { clientX: number };

const DEFAULT_COLS: ReorderCol[] = [
  { key: "name", head: "Name", cells: ["Sky", "Gaon", "Sunset"] },
  { key: "tier", head: "Tier", cells: ["Gold", "Silver", "Bronze"] },
  { key: "points", head: "Points", cells: ["820", "410", "175"] },
];

function Grab() {
  return (
    <svg viewBox="0 0 256 256" width="1em" height="1em" fill="currentColor">
      <g>
        <path d="M208 32v192a16 16 0 0 1-16 16H64a16 16 0 0 1-16-16V32a16 16 0 0 1 16-16h128a16 16 0 0 1 16 16" opacity=".2" />
        <path d="M104 60a12 12 0 1 1-12-12a12 12 0 0 1 12 12m60 12a12 12 0 1 0-12-12a12 12 0 0 0 12 12m-72 44a12 12 0 1 0 12 12a12 12 0 0 0-12-12m72 0a12 12 0 1 0 12 12a12 12 0 0 0-12-12m-72 68a12 12 0 1 0 12 12a12 12 0 0 0-12-12m72 0a12 12 0 1 0 12 12a12 12 0 0 0-12-12" />
      </g>
    </svg>
  );
}

function moveItem(list: ReorderCol[], from: number, to: number): ReorderCol[] {
  const next = list.slice();
  const it = next.splice(from, 1)[0];
  next.splice(to, 0, it);
  return next;
}

export default function ColumnReorderDrag({
  columns = DEFAULT_COLS,
  tableLabel = "Member table",
  demo = true,
  duration = 300,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#fff7e6",
}: ColumnReorderDragProps) {
  const [cols, setCols] = useState<ReorderCol[]>(columns);
  const [lift, setLift] = useState(-1);
  const [target, setTarget] = useState(-1);
  const [dx, setDx] = useState(0);
  // 놓는 순간 한 프레임만 전환을 끈다 — 바닐라의 transition:none → rAF 복구와 같은 뜻
  const [settle, setSettle] = useState(false);
  const [live, setLive] = useState(demo);

  // ambient useRef 는 항상 T | null 을 돌려준다 — 지역 별칭으로 한 번만 좁혀 쓴다
  const dragRef = useRef<{ from: number; to: number; at: number; w: number }>({ from: 0, to: 0, at: 0, w: 96 });
  const drag = dragRef.current || { from: 0, to: 0, at: 0, w: 96 };
  const elsRef = useRef<(HTMLElement | null)[]>([]);
  const els: (HTMLElement | null)[] = elsRef.current || [];

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  useEffect(() => {
    if (lift < 0) return;
    function move(e: PtrEvt) {
      const d = e.clientX - drag.at;
      setDx(d);
      const t = Math.max(0, Math.min(cols.length - 1, drag.from + Math.round(d / drag.w)));
      drag.to = t;
      setTarget(t);
    }
    function up() {
      setSettle(true);
      setCols(moveItem(cols, drag.from, drag.to));
      setLift(-1);
      setTarget(-1);
      setDx(0);
    }
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [lift, cols]);

  useEffect(() => {
    if (!settle) return;
    const id = requestAnimationFrame(() => setSettle(false));
    return () => cancelAnimationFrame(id);
  }, [settle]);

  function onGrab(i: number, e: PtrEvt) {
    setLive(false);
    const el = els[i];
    drag.w = el ? el.getBoundingClientRect().width : 96;
    drag.from = i;
    drag.to = i;
    drag.at = e.clientX;
    setLift(i);
    setTarget(i);
    setDx(0);
  }

  function styleOf(i: number): CSSProperties | undefined {
    if (settle) return { transition: "none" };
    if (lift < 0) return undefined;
    if (i === lift) return { transform: `translateX(${dx}px)` };
    let shift = 0;
    if (target > lift && i > lift && i <= target) shift = -drag.w;
    if (target < lift && i >= target && i < lift) shift = drag.w;
    return { transform: `translateX(${shift}px)` };
  }

  return (
    <div className={`${styles.root} ${live ? styles.isDemo : ""}`} style={vars}>
      <div className={styles.slot} aria-hidden="true" />
      <div className={styles.cols} role="grid" aria-label={tableLabel}>
        {cols.map((col, i) => (
          <div
            key={col.key}
            className={`${styles.col} ${lift === i ? styles.isLift : ""}`}
            style={styleOf(i)}
            role="columnheader"
            ref={(el: HTMLElement | null) => { els[i] = el; }}
          >
            <span className={styles.h} onPointerDown={(e: PtrEvt) => onGrab(i, e)}>
              <span className={styles.grab} aria-hidden="true"><Grab /></span>
              {col.head}
            </span>
            {col.cells.map((v) => (
              <span className={styles.c} key={v}>{v}</span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
