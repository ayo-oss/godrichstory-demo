import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./VideoPlayOverlay.module.scss";

export type VideoPlayOverlayProps = {
  duration?: number;
  easing?: string;
  color?: string;
  time?: string;
};

export default function VideoPlayOverlay({ duration = 2000, easing = "ease-out", color = "#2f6df6", time = "3:42" }: VideoPlayOverlayProps) {
  const vars: CSSProperties = { "--duration": `${duration}ms`, "--easing": easing, "--color": color } as CSSProperties;
  const [playing, setPlaying] = useState(false);
  const [pct, setPct] = useState(0);
  const raf = useRef<number | null>(null);
  const start = useRef<number>(0);

  useEffect(() => {
    if (!playing) return;
    start.current = 0;
    const tick = (ts: number) => {
      if (!start.current) start.current = ts;
      const p = Math.min(100, ((ts - start.current) / 6000) * 100);
      setPct(p);
      if (p < 100) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [playing]);

  return (
    <div className={styles.card} style={vars}>
      <div className={styles.thumb}>
        <span className={styles.ring} aria-hidden="true" />
        <button className={styles.play} type="button" aria-label={playing ? "일시정지" : "영상 재생"} onClick={() => setPlaying((v) => !v)}>
          {playing ? (
            <svg viewBox="0 0 256 256" width="26" height="26" aria-hidden="true"><g fill="currentColor">
              <path opacity=".2" d="M208 48v160a8 8 0 0 1-8 8h-40a8 8 0 0 1-8-8V48a8 8 0 0 1 8-8h40a8 8 0 0 1 8 8M96 40H56a8 8 0 0 0-8 8v160a8 8 0 0 0 8 8h40a8 8 0 0 0 8-8V48a8 8 0 0 0-8-8" />
              <path d="M200 32h-40a16 16 0 0 0-16 16v160a16 16 0 0 0 16 16h40a16 16 0 0 0 16-16V48a16 16 0 0 0-16-16m0 176h-40V48h40ZM96 32H56a16 16 0 0 0-16 16v160a16 16 0 0 0 16 16h40a16 16 0 0 0 16-16V48a16 16 0 0 0-16-16m0 176H56V48h40Z" />
            </g></svg>
          ) : (
            <svg viewBox="0 0 256 256" width="30" height="30" aria-hidden="true"><g fill="currentColor">
              <path opacity=".2" d="M228.23 134.69L84.15 222.81A8 8 0 0 1 72 216.12V39.88a8 8 0 0 1 12.15-6.69l144.08 88.12a7.82 7.82 0 0 1 0 13.38" />
              <path d="M232.4 114.49L88.32 26.35a16 16 0 0 0-16.2-.3A15.86 15.86 0 0 0 64 39.87v176.26A15.94 15.94 0 0 0 80 232a16.07 16.07 0 0 0 8.36-2.35l144.04-88.14a15.81 15.81 0 0 0 0-27ZM80 215.94V40l143.83 88Z" />
            </g></svg>
          )}
        </button>
        <span className={styles.time}>{time}</span>
      </div>
      <div className={styles.bar}><span className={styles.fill} style={{ width: `${pct}%` }} /></div>
    </div>
  );
}
