import { useRef, useState, type CSSProperties, type PointerEvent } from "react";
import styles from "./CursorDragScrollGallery.module.scss";

export type CursorDragScrollGalleryProps = {
  colors?: string[];
  duration?: number;
  easing?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string };

/** pointerdown 시작점 대비 이동 거리로 실제 scrollLeft 를 옮긴다 (transform 이 아니라 진짜 스크롤) */
export default function CursorDragScrollGallery({
  colors = ["#ff9ebb", "#ffd23f", "#6ec8ff", "#4cd4a6", "#b9a0ff"],
  duration = 300,
  easing = "cubic-bezier(.2,.8,.2,1)",
}: CursorDragScrollGalleryProps) {
  const vpRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const start = useRef<{ x: number; scroll: number }>({ x: 0, scroll: 0 });
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing };

  const down = (e: PointerEvent<HTMLDivElement>) => {
    const vp = vpRef.current;
    if (!vp) return;
    start.current = { x: e.clientX, scroll: vp.scrollLeft };
    setDragging(true);
    vp.setPointerCapture(e.pointerId);
  };
  const move = (e: PointerEvent<HTMLDivElement>) => {
    if (!dragging || !vpRef.current) return;
    const s = start.current ?? { x: 0, scroll: 0 };
    vpRef.current.scrollLeft = s.scroll - (e.clientX - s.x);
  };

  return (
    <div className={styles.wrap} style={vars}>
      <div
        ref={vpRef}
        className={`${styles.viewport} ${dragging ? styles.grabbing : ""}`}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={() => setDragging(false)}
        onPointerCancel={() => setDragging(false)}
      >
        <div className={styles.track}>
          {colors.map((c, i) => (
            <span key={i} className={styles.tile} style={{ background: c }} />
          ))}
        </div>
      </div>
      <span className={styles.hint}>
        <svg viewBox="0 0 256 256" aria-hidden="true"><g fill="currentColor"><path d="M208 80v96H48V80Z" opacity=".2" /><path d="m213.66 181.66l-32 32a8 8 0 0 1-11.32-11.32L188.69 184H48a8 8 0 0 1 0-16h140.69l-18.35-18.34a8 8 0 0 1 11.32-11.32l32 32a8 8 0 0 1 0 11.32m-139.32-64a8 8 0 0 0 11.32-11.32L67.31 88H208a8 8 0 0 0 0-16H67.31l18.35-18.34a8 8 0 0 0-11.32-11.32l-32 32a8 8 0 0 0 0 11.32Z" /></g></svg>
        드래그
      </span>
    </div>
  );
}
