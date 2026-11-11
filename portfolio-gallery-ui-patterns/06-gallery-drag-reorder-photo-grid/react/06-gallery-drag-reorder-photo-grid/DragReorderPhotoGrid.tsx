import { useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import styles from "./DragReorderPhotoGrid.module.scss";

type ReactKeyboardEvent<T> = { key: string; preventDefault: () => void; currentTarget: T };

export type DragReorderPhotoGridProps = {
  /** 스왑 스냅 시간 (기본 220ms) */
  duration?: number;
  easing?: string;
  /** 핸들 색 */
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const TONES = ["a", "b", "c"] as const;

/** 사진 칸을 밀어 옆 칸과 자리를 바꾼다 — 손가락·마우스 드래그, 좌우 화살표 키 둘 다 된다 */
export default function DragReorderPhotoGrid({
  duration = 220,
  easing = "ease-out",
  color = "#2f6df6",
}: DragReorderPhotoGridProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  const [order, setOrder] = useState<number[]>([0, 1, 2]);
  const dragState = useRef<{ pos: number; startX: number; dx: number } | null>(null);
  const [dragging, setDragging] = useState<number | null>(null);
  const [offset, setOffset] = useState(0);

  function swap(pos: number, dir: 1 | -1) {
    setOrder((prev) => {
      const next = [...prev];
      const target = pos + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[pos], next[target]] = [next[target], next[pos]];
      return next;
    });
  }

  function onPointerDown(e: ReactPointerEvent<HTMLLIElement>, pos: number) {
    (e.target as Element).setPointerCapture(e.pointerId);
    dragState.current = { pos, startX: e.clientX, dx: 0 };
    setDragging(pos);
  }
  function onPointerMove(e: ReactPointerEvent<HTMLLIElement>) {
    if (!dragState.current) return;
    dragState.current.dx = e.clientX - dragState.current.startX;
    setOffset(dragState.current.dx);
  }
  function onPointerUp() {
    if (!dragState.current) return;
    const { pos, dx } = dragState.current;
    if (dx > 30) swap(pos, 1);
    else if (dx < -30) swap(pos, -1);
    dragState.current = null;
    setDragging(null);
    setOffset(0);
  }
  function onKeyDown(e: ReactKeyboardEvent<HTMLLIElement>, pos: number) {
    if (e.key === "ArrowRight") { e.preventDefault(); swap(pos, 1); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); swap(pos, -1); }
  }

  return (
    <ul className={styles.list} style={vars} aria-label="Drag or use arrow keys to reorder photos">
      {order.map((tileId, pos) => (
        <li
          key={tileId}
          tabIndex={0}
          className={`${styles.tile} ${dragging === pos ? styles.isDragging : ""}`}
          style={dragging === pos ? { transform: `translateX(${offset}px)` } : undefined}
          onPointerDown={(e: ReactPointerEvent<HTMLLIElement>) => onPointerDown(e, pos)}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onKeyDown={(e: ReactKeyboardEvent<HTMLLIElement>) => onKeyDown(e, pos)}
        >
          <span className={`${styles.img} ${styles["img-" + TONES[tileId]]}`} />
          <span className={styles.handle} aria-hidden="true">⠿</span>
        </li>
      ))}
    </ul>
  );
}
