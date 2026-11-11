import { useRef, useState, type CSSProperties, type PointerEvent } from "react";
import styles from "./CursorScrollProgressRing.module.scss";

export type CursorScrollProgressRingProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
const CIRC = 2 * Math.PI * 15;

/** pointermove 로 커서를 따라가고, 내부 스크롤 비율만큼 stroke-dashoffset 을 채운다 */
export default function CursorScrollProgressRing({
  duration = 220,
  easing = "ease-out",
  color = "#2f6df6",
}: CursorScrollProgressRingProps) {
  const ringRef = useRef<HTMLDivElement>(null);
  const [done, setDone] = useState(false);
  const [dash, setDash] = useState(CIRC);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  const move = (e: PointerEvent<HTMLDivElement>) => {
    const ring = ringRef.current;
    if (!ring) return;
    const r = e.currentTarget.getBoundingClientRect();
    ring.style.transform = `translate(${e.clientX - r.left}px,${e.clientY - r.top}px)`;
  };
  const scroll = (e: { currentTarget: HTMLDivElement }) => {
    const box = e.currentTarget;
    const max = box.scrollHeight - box.clientHeight;
    const pct = max > 0 ? box.scrollTop / max : 0;
    setDash(CIRC * (1 - pct));
    setDone(pct > 0.98);
  };

  return (
    <div className={`${styles.box} ${done ? styles.isDone : ""}`} style={vars} onPointerMove={move} onScroll={scroll}>
      <div className={styles.content}>
        <p>이 안에서 스크롤하면</p>
        <p>커서 옆 링이</p>
        <p>진행률만큼 채워진다</p>
        <p>끝까지 가면 체크로 바뀐다</p>
      </div>
      <div ref={ringRef} className={styles.ring} aria-hidden="true">
        <svg viewBox="0 0 36 36">
          <circle className={styles.track} cx="18" cy="18" r="15" />
          <circle className={styles.fill} cx="18" cy="18" r="15" style={{ strokeDashoffset: dash }} />
        </svg>
        <svg className={styles.check} viewBox="0 0 256 256"><g fill="currentColor"><path d="M232 56v144a16 16 0 0 1-16 16H40a16 16 0 0 1-16-16V56a16 16 0 0 1 16-16h176a16 16 0 0 1 16 16" opacity=".2" /><path d="m205.66 85.66l-96 96a8 8 0 0 1-11.32 0l-40-40a8 8 0 0 1 11.32-11.32L104 164.69l90.34-90.35a8 8 0 0 1 11.32 11.32" /></g></svg>
      </div>
    </div>
  );
}
