import { useRef, useState, type CSSProperties, type PointerEvent } from "react";
import styles from "./PullToRefreshSpinner.module.scss";

export type PullToRefreshSpinnerProps = {
  title: string;
  onRefresh?: () => void;
  /** 당긴 만큼 늘어나는 시간 (기본 300ms) */
  duration?: number;
  easing?: string;
  /** 스피너 색 */
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function PullToRefreshSpinner({
  title,
  onRefresh,
  duration = 300,
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#2f6df6",
}: PullToRefreshSpinnerProps) {
  const [dy, setDy] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const dragging = useRef(false);
  const startY = useRef(0);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  const refresh = () => {
    if (refreshing) return;
    setRefreshing(true);
    setDy(56);
    onRefresh?.();
    setTimeout(() => { setRefreshing(false); setDy(0); }, 900);
  };
  const down = (e: PointerEvent<HTMLDivElement>) => {
    dragging.current = true;
    startY.current = e.clientY;
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const move = (e: PointerEvent<HTMLDivElement>) => {
    if (!dragging.current || refreshing) return;
    setDy(Math.max(0, Math.min(72, (e.clientY - (startY.current ?? 0)) * 0.5)));
  };
  const up = () => {
    if (!dragging.current || refreshing) { dragging.current = false; return; }
    dragging.current = false;
    if (dy > 44) refresh(); else setDy(0);
  };

  return (
    <div className={styles.ptr} style={vars}>
      <div className={styles.indicator} aria-hidden="true">
        <span className={styles.spinner} data-spin={refreshing || undefined} />
      </div>
      <div
        className={styles.body}
        style={{ transform: `translateY(${dy}px)` }}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
      >
        <div className={styles.head}>
          <span className={styles.title}>{title}</span>
          <button className={styles.refreshBtn} type="button" onClick={refresh}>새로고침</button>
        </div>
        <p className={styles.status} style={{ visibility: refreshing ? "hidden" : undefined }} aria-live="polite">
          방금 새로고침함
        </p>
      </div>
    </div>
  );
}
