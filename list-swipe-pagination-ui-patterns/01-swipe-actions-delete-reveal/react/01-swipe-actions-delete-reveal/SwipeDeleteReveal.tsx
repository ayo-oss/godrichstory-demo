import { useRef, useState, type CSSProperties, type PointerEvent } from "react";
import styles from "./SwipeDeleteReveal.module.scss";

export type SwipeDeleteRevealProps = {
  title: string;
  desc: string;
  /** 콘텐츠가 밀리는 시간 (기본 220ms) */
  duration?: number;
  easing?: string;
  /** 삭제 버튼 색 */
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const OPEN = 88;
const DEL = 140;

/** pointer 드래그로 --dx 를 직접 놓고, 임계값을 넘기면 행을 지운다 */
export default function SwipeDeleteReveal({
  title,
  desc,
  duration = 220,
  easing = "ease-out",
  color = "#c2361a",
}: SwipeDeleteRevealProps) {
  const [removed, setRemoved] = useState(false);
  const [dx, setDx] = useState(0);
  const dragging = useRef(false);
  const startX = useRef(0);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  if (removed) return null;

  const down = (e: PointerEvent<HTMLDivElement>) => {
    dragging.current = true;
    startX.current = e.clientX;
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const move = (e: PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    setDx(Math.min(0, Math.max(-DEL - 30, e.clientX - (startX.current ?? 0))));
  };
  const up = () => {
    if (!dragging.current) return;
    dragging.current = false;
    if (dx < -DEL) { setRemoved(true); return; }
    setDx(dx < -OPEN / 2 ? -OPEN : 0);
  };
  const key = (e: any) => {
    if (e.key === "Delete" || e.key === "Backspace") setRemoved(true);
  };

  return (
    <li className={styles.row} style={vars}>
      <button className={styles.del} type="button" onClick={() => setRemoved(true)}>삭제</button>
      <div
        className={styles.content}
        tabIndex={0}
        style={{ transform: `translateX(${dx}px)` }}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        onKeyDown={key}
      >
        <span className={styles.title}>{title}</span>
        <span className={styles.desc}>{desc}</span>
      </div>
    </li>
  );
}
