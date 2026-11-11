import { useRef, useState, type CSSProperties, type PointerEvent } from "react";
import styles from "./SwipeMultiActionStack.module.scss";

export type SwipeMultiActionStackProps = {
  title: string;
  desc: string;
  /** 콘텐츠가 밀리는 시간 (기본 220ms) */
  duration?: number;
  easing?: string;
  /** 보관 버튼 색 */
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const OPEN = 198;

export default function SwipeMultiActionStack({
  title,
  desc,
  duration = 220,
  easing = "cubic-bezier(.2, 1.4, .4, 1)",
  color = "#2f6df6",
}: SwipeMultiActionStackProps) {
  const [dx, setDx] = useState(0);
  const [fav, setFav] = useState(false);
  const [gone, setGone] = useState(false);
  const dragging = useRef(false);
  const startX = useRef(0);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  if (gone) return null;

  const down = (e: PointerEvent<HTMLDivElement>) => {
    dragging.current = true;
    startX.current = e.clientX;
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const move = (e: PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    setDx(Math.min(0, Math.max(-OPEN, e.clientX - (startX.current ?? 0))));
  };
  const up = () => {
    if (!dragging.current) return;
    dragging.current = false;
    setDx(dx < -OPEN / 2 ? -OPEN : 0);
  };

  return (
    <li className={styles.row} style={vars}>
      <div className={styles.actions} style={{ opacity: dx < 0 ? 1 : undefined }}>
        <button className={styles.fav} type="button" aria-pressed={fav} onClick={() => setFav((v) => !v)}>★</button>
        <button className={styles.archive} type="button" onClick={() => setGone(true)}>보관</button>
        <button className={styles.delBtn} type="button" onClick={() => setGone(true)}>삭제</button>
      </div>
      <div
        className={styles.content}
        tabIndex={0}
        style={{ transform: `translateX(${dx}px)` }}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
      >
        <span className={styles.title}>{title}</span>
        <span className={styles.desc}>{desc}</span>
      </div>
    </li>
  );
}
