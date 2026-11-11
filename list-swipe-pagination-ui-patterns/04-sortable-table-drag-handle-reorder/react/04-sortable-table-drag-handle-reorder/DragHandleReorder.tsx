import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import styles from "./DragHandleReorder.module.scss";

export type DragHandleReorderProps = {
  items: string[];
  /** 드래그 스냅 시간 (기본 220ms) */
  duration?: number;
  easing?: string;
  /** 핸들 색 */
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function DragHandleReorder({
  items,
  duration = 220,
  easing = "ease-out",
  color = "#2f6df6",
}: DragHandleReorderProps) {
  const [rows, setRows] = useState(items);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dy, setDy] = useState(0);
  const startY = useRef(0);
  const handles = useRef<{ [label: string]: HTMLButtonElement | null }>({});
  const refocusLabel = useRef<string | null>(null);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  // 키보드로 순서를 바꾼 뒤에도 같은 핸들에 포커스가 남아 있어야 연속으로 화살표 키를 누를 수 있다
  // (vanilla 판의 handle.focus({ preventScroll: true }) 와 같은 목적 — react 는 key 재조정으로도
  // 대개 포커스가 유지되지만, 여기서는 명시적으로 한 번 더 확인해 다른 리렌더에 흔들리지 않게 한다)
  useEffect(() => {
    const label = refocusLabel.current;
    if (label) { handles.current![label]?.focus({ preventScroll: true }); refocusLabel.current = null; }
  }, [rows]);

  const swap = (i: number, j: number, keyboardLabel?: string) => {
    if (j < 0 || j >= rows.length) return;
    const next = rows.slice();
    const t = next[i]; next[i] = next[j]; next[j] = t;
    if (keyboardLabel) refocusLabel.current = keyboardLabel;
    setRows(next);
  };
  const down = (i: number) => (e: PointerEvent<HTMLButtonElement>) => {
    setDragIndex(i); startY.current = e.clientY;
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const move = (e: PointerEvent<HTMLButtonElement>) => {
    if (dragIndex === null) return;
    setDy(e.clientY - (startY.current ?? 0));
  };
  const up = () => {
    if (dragIndex === null) return;
    if (dy > 30) swap(dragIndex, dragIndex + 1);
    else if (dy < -30) swap(dragIndex, dragIndex - 1);
    setDragIndex(null); setDy(0);
  };
  const key = (i: number, label: string) => (e: any) => {
    if (e.key === "ArrowDown") { e.preventDefault(); swap(i, i + 1, label); }
    else if (e.key === "ArrowUp") { e.preventDefault(); swap(i, i - 1, label); }
  };

  return (
    <ul className={styles.list} style={vars}>
      {rows.map((label, i) => (
        <li
          key={label}
          className={styles.row}
          style={dragIndex === i ? { transform: `translateY(${dy}px)`, transition: "none" } : undefined}
        >
          <button
            ref={(el: HTMLButtonElement | null) => { handles.current![label] = el; }}
            className={styles.handle}
            type="button"
            aria-label="드래그하거나 화살표 키로 순서 변경"
            onPointerDown={down(i)}
            onPointerMove={move}
            onPointerUp={up}
            onPointerCancel={up}
            onKeyDown={key(i, label)}
          >⠿</button>
          <span className={styles.label}>{label}</span>
        </li>
      ))}
    </ul>
  );
}
