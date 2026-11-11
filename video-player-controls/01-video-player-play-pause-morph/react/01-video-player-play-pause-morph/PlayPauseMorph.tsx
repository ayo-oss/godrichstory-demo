import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./PlayPauseMorph.module.scss";

export type PlayPauseMorphProps = {
  /** 더미 영상 길이(초) */
  total?: number;
  /** 시작 위치(초) */
  start?: number;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

function fmt(s: number) {
  const n = Math.floor(s);
  return Math.floor(n / 60) + ":" + ("0" + (n % 60)).slice(-2);
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 256 256" width="20" height="20" aria-hidden="true">
      <g fill="currentColor">
        <path d="M228.23 134.69L84.15 222.81A8 8 0 0 1 72 216.12V39.88a8 8 0 0 1 12.15-6.69l144.08 88.12a7.82 7.82 0 0 1 0 13.38" opacity=".2" />
        <path d="M232.4 114.49L88.32 26.35a16 16 0 0 0-16.2-.3A15.86 15.86 0 0 0 64 39.87v176.26A15.94 15.94 0 0 0 80 232a16.07 16.07 0 0 0 8.36-2.35l144.04-88.14a15.81 15.81 0 0 0 0-27ZM80 215.94V40l143.83 88Z" />
      </g>
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg viewBox="0 0 256 256" width="20" height="20" aria-hidden="true">
      <g fill="currentColor">
        <path d="M208 48v160a8 8 0 0 1-8 8h-40a8 8 0 0 1-8-8V48a8 8 0 0 1 8-8h40a8 8 0 0 1 8 8M96 40H56a8 8 0 0 0-8 8v160a8 8 0 0 0 8 8h40a8 8 0 0 0 8-8V48a8 8 0 0 0-8-8" opacity=".2" />
        <path d="M200 32h-40a16 16 0 0 0-16 16v160a16 16 0 0 0 16 16h40a16 16 0 0 0 16-16V48a16 16 0 0 0-16-16m0 176h-40V48h40ZM96 32H56a16 16 0 0 0-16 16v160a16 16 0 0 0 16 16h40a16 16 0 0 0 16-16V48a16 16 0 0 0-16-16m0 176H56V48h40Z" />
      </g>
    </svg>
  );
}

export default function PlayPauseMorph({
  total = 180,
  start = 12,
  duration = 220,
  easing = "cubic-bezier(.2,1.4,.4,1)",
  color = "#2f6df6",
}: PlayPauseMorphProps) {
  const [playing, setPlaying] = useState(true);
  const [t, setT] = useState(start);
  const [pulse, setPulse] = useState(0);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  // 더미 재생 시계 — 바닐라의 setInterval(250ms) 를 그대로
  useEffect(() => {
    if (!playing) return;
    let last = Date.now();
    const id = setInterval(() => {
      const n = Date.now();
      const step = (n - last) / 1000;
      last = n;
      setT((p) => (p + step) % total);
    }, 250);
    return () => clearInterval(id);
  }, [playing, total]);

  function toggle() {
    setPlaying((p) => !p);
    setPulse((p) => p + 1);
  }

  return (
    <figure className={`${styles.player} ${playing ? styles.isPlaying : ""}`} style={vars}>
      <div className={styles.screen}>
        <div className={styles.stripes} aria-hidden="true" />
        <div className={styles.world} aria-hidden="true">
          <span className={styles.sun} />
          <span className={`${styles.hill} ${styles.hillA}`} />
          <span className={`${styles.hill} ${styles.hillB}`} />
        </div>
        <span className={styles.clock}>{fmt(t)}</span>
        <span className={styles.badge}>{fmt(total)}</span>
        <div className={styles.bar}>
          <button
            className={styles.pp}
            type="button"
            aria-label={playing ? "일시정지" : "재생"}
            onClick={toggle}
          >
            {pulse > 0 ? <span key={pulse} className={styles.ring} aria-hidden="true" /> : null}
            <span className={`${styles.ic} ${styles.icPlay}`}>
              <PlayIcon />
            </span>
            <span className={`${styles.ic} ${styles.icPause}`}>
              <PauseIcon />
            </span>
          </button>
          <span className={styles.time}>
            <b>{fmt(t)}</b> / {fmt(total)}
          </span>
        </div>
        <span className={styles.fillwrap} aria-hidden="true">
          <span className={styles.fill} style={{ transform: `scaleX(${(t / total).toFixed(4)})` }} />
        </span>
      </div>
    </figure>
  );
}
