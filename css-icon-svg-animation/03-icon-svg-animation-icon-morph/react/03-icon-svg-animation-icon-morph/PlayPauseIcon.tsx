import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./PlayPauseIcon.module.scss";

export type PlayPauseIconProps = {
  /** 재생↔일시정지 전환 시간, ms */
  duration?: number;
  easing?: string;
  color?: string;
  defaultPlaying?: boolean;
  onChange?: (playing: boolean) => void;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const D_PLAY = "M8 5l11 7-11 7z";
const D_PAUSE = "M7 5h4v14H7zM13 5h4v14h-4z";

export default function PlayPauseIcon({
  duration = 220,
  easing = "cubic-bezier(.2,1.4,.4,1)",
  color = "#fff7e6",
  defaultPlaying = false,
  onChange,
}: PlayPauseIconProps) {
  const [playing, setPlaying] = useState(defaultPlaying);
  // 모프 순간마다 n +1 → 링·입자 재시작. dirs 는 방출마다 다시 뽑는다 (vanilla 와 동일)
  const [burst, setBurst] = useState<{ n: number; dirs: Array<[number, number]>; d: string }>({ n: 0, dirs: [], d: D_PLAY });
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  const reduceRef = useRef(false);

  // 모프 한 겹: prefers-reduced-motion 이면 발화하지 않는다 (CSS 층에서 display:none 처리)
  useEffect(() => {
    reduceRef.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  return (
    <button
      type="button"
      className={styles.iconbtn}
      style={vars}
      aria-pressed={playing}
      aria-label={playing ? "일시정지" : "재생"}
      onClick={() => {
        const next = !playing;
        setPlaying(next);
        if (!reduceRef.current) {
          setBurst((b) => ({
            n: b.n + 1,
            d: next ? D_PAUSE : D_PLAY,   // 나타나는 아이콘의 실루엣이 번진다
            dirs: [0, 1, 2, 3, 4, 5].map(() => {
              const ang = Math.random() * Math.PI * 2;
              const sp = 2.4 + Math.random() * 1.4;
              return [Math.cos(ang) * sp, Math.sin(ang) * sp] as [number, number];
            }),
          }));
        }
        onChange?.(next);
      }}
    >
      <span className={styles.iconbtn__stack}>
        <svg className={`${styles.ic} ${playing ? styles["ic--hidden"] : ""}`} viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
          <path d={D_PLAY} />
        </svg>
        <svg className={`${styles.ic} ${playing ? "" : styles["ic--hidden"]}`} viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
          <path d={D_PAUSE} />
        </svg>
        {/* 한 겹: 모프 순간 고스트 링 + 입자 — key 바뀌면 애니메이션이 재시작된다.
            고스트는 '나타나는' 아이콘의 실루엣이 링처럼 번지며 지워진다 (잔상) */}
        {burst.n > 0 && (
          <svg key={burst.n} className={styles.morph} viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
            <circle className={styles["morph__halo"]} cx={12} cy={12} r={7} />
            <path className={styles["morph__ghost"]} d={burst.d} />
            <circle className={styles["morph__spark"]} r={0.9} cx={12} cy={12} />
            {burst.dirs.map(([dx, dy], i) => (
              <circle
                key={i}
                className={styles["morph__bit"]}
                r={i === 0 ? 0.5 : 0.45}
                cx={12}
                cy={11}
                style={{ "--dx": `${dx}px`, "--dy": `${dy}px` } as CSSProperties}
              />
            ))}
          </svg>
        )}
      </span>
    </button>
  );
}
