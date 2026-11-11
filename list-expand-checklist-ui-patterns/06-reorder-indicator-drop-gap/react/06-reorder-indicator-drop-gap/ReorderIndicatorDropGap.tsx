import { useRef, useState, type CSSProperties } from "react";
import styles from "./ReorderIndicatorDropGap.module.scss";

export type ReorderIndicatorDropGapProps = {
  items: string[];
  /** 들어올림·이동 시간 (기본 300ms) */
  duration?: number;
  easing?: string;
  /** 드롭 인디케이터 색 */
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

/**
 * 손잡이를 드래그하면 항목이 통째로 밀리는 대신 놓일 자리에 빈 줄 인디케이터가 먼저 나타난다.
 * 마우스를 못 쓰는 사람은 손잡이 포커스 후 Alt+화살표로 같은 순서 변경을 할 수 있다.
 */
export default function ReorderIndicatorDropGap({
  items,
  duration = 300,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: ReorderIndicatorDropGapProps) {
  const [order, setOrder] = useState(items);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragY, setDragY] = useState(0);
  const [dropIdx, setDropIdx] = useState<number | null>(null);
  const rowRefs = useRef<Array<HTMLLIElement | null>>([]);
  const startY = useRef(0);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= order.length) return;
    const next = order.slice();
    [next[i], next[j]] = [next[j], next[i]];
    setOrder(next);
  };

  const down = (i: number, e: any) => {
    setDragIdx(i);
    setDropIdx(i);
    startY.current = e.clientY;
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const dragMove = (e: any) => {
    if (dragIdx === null) return;
    setDragY(e.clientY - (startY.current ?? e.clientY));
    let target = order.length;
    const refs = rowRefs.current ?? [];
    for (let k = 0; k < order.length; k++) {
      const el = refs[k];
      if (!el || k === dragIdx) continue;
      const rect = el.getBoundingClientRect();
      if (e.clientY < rect.top + rect.height / 2) { target = k; break; }
    }
    setDropIdx(target);
  };
  const drop = () => {
    if (dragIdx === null || dropIdx === null) { setDragIdx(null); return; }
    const next = order.slice();
    const [moved] = next.splice(dragIdx, 1);
    next.splice(dropIdx > dragIdx ? dropIdx - 1 : dropIdx, 0, moved);
    setOrder(next);
    setDragIdx(null); setDropIdx(null); setDragY(0);
  };

  const rows = order.flatMap((label, i) => {
    const nodes = [];
    if (dropIdx === i && dragIdx !== null) {
      nodes.push(<li key={`gap-${label}`} className={styles.indicator} aria-hidden="true" />);
    }
    nodes.push(
      <li
        key={label}
        ref={(el: HTMLLIElement | null) => { if (rowRefs.current) rowRefs.current[i] = el; }}
        className={`${styles.item} ${dragIdx === i ? styles.dragging : ""}`}
        style={dragIdx === i ? { transform: `translateY(${dragY}px)` } : undefined}
      >
        <button
          className={styles.handle}
          type="button"
          aria-label="순서 변경, 위/아래 화살표"
          onPointerDown={(e: any) => down(i, e)}
          onPointerMove={dragMove}
          onPointerUp={drop}
          onPointerCancel={drop}
          onKeyDown={(e: any) => {
            if ((e.key === "ArrowUp" || e.key === "ArrowDown") && e.altKey) {
              e.preventDefault();
              move(i, e.key === "ArrowUp" ? -1 : 1);
            }
          }}
        >
          <svg viewBox="0 0 256 256" aria-hidden="true"><g fill="currentColor"><path d="M208 32v192a16 16 0 0 1-16 16H64a16 16 0 0 1-16-16V32a16 16 0 0 1 16-16h128a16 16 0 0 1 16 16" opacity=".2" /><path d="M104 60a12 12 0 1 1-12-12a12 12 0 0 1 12 12m60 12a12 12 0 1 0-12-12a12 12 0 0 0 12 12m-72 44a12 12 0 1 0 12 12a12 12 0 0 0-12-12m72 0a12 12 0 1 0 12 12a12 12 0 0 0-12-12m-72 68a12 12 0 1 0 12 12a12 12 0 0 0-12-12m72 0a12 12 0 1 0 12 12a12 12 0 0 0-12-12" /></g></svg>
        </button>
        <span>{label}</span>
      </li>
    );
    return nodes;
  });

  return (
    <ul className={styles.list} style={vars} aria-label="우선순위 목록. 손잡이에서 화살표 키(Alt+위/아래)로 순서 변경">
      {rows}
      {dropIdx === order.length && dragIdx !== null && <li className={styles.indicator} aria-hidden="true" />}
    </ul>
  );
}
