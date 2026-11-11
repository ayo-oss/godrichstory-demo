import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./PodcastPlayer.module.scss";

export type PodcastPlayerProps = {
  duration?: number;
  easing?: string;
  color?: string;
  title?: string;
};

export default function PodcastPlayer({ duration = 300, easing = "ease-out", color = "#4cd4a6", title = "EP.09 CSS 만으로 배지 만들기" }: PodcastPlayerProps) {
  const vars: CSSProperties = { "--duration": `${duration}ms`, "--easing": easing, "--color": color } as CSSProperties;
  const [playing, setPlaying] = useState(false);

  return (
    <div className={styles.player} style={vars}>
      <button className={styles.play} type="button" aria-label={playing ? "일시정지" : "재생"} onClick={() => setPlaying((v) => !v)}>
        {playing ? (
          <svg viewBox="0 0 256 256" width="18" height="18" aria-hidden="true"><g fill="currentColor">
            <path opacity=".2" d="M208 48v160a8 8 0 0 1-8 8h-40a8 8 0 0 1-8-8V48a8 8 0 0 1 8-8h40a8 8 0 0 1 8 8M96 40H56a8 8 0 0 0-8 8v160a8 8 0 0 0 8 8h40a8 8 0 0 0 8-8V48a8 8 0 0 0-8-8" />
            <path d="M200 32h-40a16 16 0 0 0-16 16v160a16 16 0 0 0 16 16h40a16 16 0 0 0 16-16V48a16 16 0 0 0-16-16m0 176h-40V48h40ZM96 32H56a16 16 0 0 0-16 16v160a16 16 0 0 0 16 16h40a16 16 0 0 0 16-16V48a16 16 0 0 0-16-16m0 176H56V48h40Z" />
          </g></svg>
        ) : (
          <svg viewBox="0 0 256 256" width="20" height="20" aria-hidden="true"><g fill="currentColor">
            <path opacity=".2" d="M228.23 134.69L84.15 222.81A8 8 0 0 1 72 216.12V39.88a8 8 0 0 1 12.15-6.69l144.08 88.12a7.82 7.82 0 0 1 0 13.38" />
            <path d="M232.4 114.49L88.32 26.35a16 16 0 0 0-16.2-.3A15.86 15.86 0 0 0 64 39.87v176.26A15.94 15.94 0 0 0 80 232a16.07 16.07 0 0 0 8.36-2.35l144.04-88.14a15.81 15.81 0 0 0 0-27ZM80 215.94V40l143.83 88Z" />
          </g></svg>
        )}
      </button>
      <div className={styles.body}>
        <p className={styles.title}>{title}</p>
        <p className={styles.meta}>Godrich Story FM · 24:10</p>
        <div className={`${styles.wave} ${!playing ? styles.paused : ""}`} aria-hidden="true">
          {Array.from({ length: 8 }).map((_, i) => (
            <span key={i} style={{ animationDelay: `${i * 80}ms` }} />
          ))}
        </div>
      </div>
    </div>
  );
}
