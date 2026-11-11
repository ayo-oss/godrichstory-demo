import { useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import styles from "./RatingBars.module.scss";

/* ambient 에 React 이벤트 제네릭이 없어 파일 안에 필요한 만큼만 선언한다 */
type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type RowVars = CSSProperties & { "--p"?: string };

export type RatingRow = {
  /** 별점 라벨 — 5 부터 1 까지 */
  level: string;
  /** 막대가 차오를 목표 비율 (0~1) */
  ratio: number;
  /** 오른쪽에 보이는 퍼센트 */
  pct: string;
  /** 스크린 리더가 읽을 한 문장 */
  label: string;
};

export type RatingBarsProps = {
  sectionLabel?: string;
  /** 카운트업으로 갈아 끼울 평균 점수 — 마지막이 최종값 */
  scores?: string[];
  /** 별 묶음이 읽히는 이름 */
  scoreLabel?: string;
  /** 카운트업으로 갈아 끼울 후기 개수 — 마지막이 최종값 */
  counts?: string[];
  rows?: RatingRow[];
  /** 다섯 막대가 차례로 차오르는 한 바퀴(ms) */
  duration?: number;
  easing?: string;
  /** 막대 채움 색 */
  color?: string;
};

const Star = (): ReactNode => (
  <svg viewBox="0 0 256 256" width="14" height="14" fill="currentColor" aria-hidden="true" focusable="false">
    <path d="M229.06,108.79l-48.7,42,14.88,62.79a8.4,8.4,0,0,1-12.52,9.17L128,189.09,73.28,222.74a8.4,8.4,0,0,1-12.52-9.17l14.88-62.79-48.7-42A8.46,8.46,0,0,1,31.73,94L95.64,88.8l24.62-59.6a8.36,8.36,0,0,1,15.48,0l24.62,59.6L224.27,94A8.46,8.46,0,0,1,229.06,108.79Z" opacity="0.2" />
    <path d="M239.18,97.26A16.38,16.38,0,0,0,224.92,86l-59-4.76L143.14,26.15a16.36,16.36,0,0,0-30.27,0L90.11,81.23,31.08,86a16.46,16.46,0,0,0-9.37,28.86l45,38.83L53,211.75a16.38,16.38,0,0,0,24.5,17.82L128,198.49l50.53,31.08A16.4,16.4,0,0,0,203,211.75l-13.76-58.07,45-38.83A16.43,16.43,0,0,0,239.18,97.26Zm-15.34,5.47-48.7,42a8,8,0,0,0-2.56,7.91l14.88,62.8a.37.37,0,0,1-.17.48c-.18.14-.23.11-.38,0l-54.72-33.65a8,8,0,0,0-8.38,0L69.09,215.94c-.15.09-.19.12-.38,0a.37.37,0,0,1-.17-.48l14.88-62.8a8,8,0,0,0-2.56-7.91l-48.7-42c-.12-.1-.23-.19-.13-.5s.18-.27.33-.29l63.92-5.16A8,8,0,0,0,103,91.86l24.62-59.61c.08-.17.11-.25.35-.25s.27.08.35.25L153,91.86a8,8,0,0,0,6.75,4.92l63.92,5.16c.15,0,.24,0,.33.29S224,102.63,223.84,102.73Z" />
  </svg>
);

const StarHalf = (): ReactNode => (
  <svg viewBox="0 0 256 256" width="14" height="14" fill="currentColor" aria-hidden="true" focusable="false">
    <path d="M128,24V189.09L73.28,222.74a8.4,8.4,0,0,1-12.52-9.17l14.88-62.79-48.7-42A8.46,8.46,0,0,1,31.73,94L95.64,88.8l24.62-59.6A8.26,8.26,0,0,1,128,24Z" opacity="0.2" />
    <path d="M239.18,97.26A16.38,16.38,0,0,0,224.92,86l-59-4.76L143.14,26.15a16.36,16.36,0,0,0-30.27,0L90.11,81.23,31.08,86a16.46,16.46,0,0,0-9.37,28.86l45,38.83L53,211.75a16.4,16.4,0,0,0,24.5,17.82L128,198.49l50.53,31.08A16.4,16.4,0,0,0,203,211.75l-13.76-58.07,45-38.83A16.43,16.43,0,0,0,239.18,97.26ZM69.09,215.94c-.15.09-.2.12-.38,0a.37.37,0,0,1-.17-.48l14.88-62.8a8,8,0,0,0-2.56-7.91l-48.7-42a.39.39,0,0,1-.13-.51c.09-.27.18-.27.33-.29l63.92-5.16A8,8,0,0,0,103,91.86l17-41.08V184.63ZM223.84,102.73l-48.7,42a8,8,0,0,0-2.56,7.91l14.88,62.8a.37.37,0,0,1-.17.48c-.18.14-.23.11-.38,0L136,184.63V50.78l17,41.08a8,8,0,0,0,6.75,4.92l63.91,5.16c.16,0,.25,0,.34.29S224,102.63,223.84,102.73Z" />
  </svg>
);

const SmallStar = (): ReactNode => (
  <svg viewBox="0 0 256 256" width="10" height="10" fill="currentColor" aria-hidden="true" focusable="false">
    <path d="M229.06,108.79l-48.7,42,14.88,62.79a8.4,8.4,0,0,1-12.52,9.17L128,189.09,73.28,222.74a8.4,8.4,0,0,1-12.52-9.17l14.88-62.79-48.7-42A8.46,8.46,0,0,1,31.73,94L95.64,88.8l24.62-59.6a8.36,8.36,0,0,1,15.48,0l24.62,59.6L224.27,94A8.46,8.46,0,0,1,229.06,108.79Z" opacity="0.2" />
    <path d="M239.18,97.26A16.38,16.38,0,0,0,224.92,86l-59-4.76L143.14,26.15a16.36,16.36,0,0,0-30.27,0L90.11,81.23,31.08,86a16.46,16.46,0,0,0-9.37,28.86l45,38.83L53,211.75a16.38,16.38,0,0,0,24.5,17.82L128,198.49l50.53,31.08A16.4,16.4,0,0,0,203,211.75l-13.76-58.07,45-38.83A16.43,16.43,0,0,0,239.18,97.26Zm-15.34,5.47-48.7,42a8,8,0,0,0-2.56,7.91l14.88,62.8a.37.37,0,0,1-.17.48c-.18.14-.23.11-.38,0l-54.72-33.65a8,8,0,0,0-8.38,0L69.09,215.94c-.15.09-.19.12-.38,0a.37.37,0,0,1-.17-.48l14.88-62.8a8,8,0,0,0-2.56-7.91l-48.7-42c-.12-.1-.23-.19-.13-.5s.18-.27.33-.29l63.92-5.16A8,8,0,0,0,103,91.86l24.62-59.61c.08-.17.11-.25.35-.25s.27.08.35.25L153,91.86a8,8,0,0,0,6.75,4.92l63.92,5.16c.15,0,.24,0,.33.29S224,102.63,223.84,102.73Z" />
  </svg>
);

const DEFAULT_SCORES = ["4.1", "4.3", "4.5", "4.7"];
const DEFAULT_COUNTS = ["후기 812개", "후기 1,140개", "후기 1,382개", "후기 1,509개"];
const DEFAULT_ROWS: RatingRow[] = [
  { level: "5", ratio: 0.68, pct: "68%", label: "5점 후기가 68퍼센트" },
  { level: "4", ratio: 0.21, pct: "21%", label: "4점 후기가 21퍼센트" },
  { level: "3", ratio: 0.07, pct: "7%", label: "3점 후기가 7퍼센트" },
  { level: "2", ratio: 0.03, pct: "3%", label: "2점 후기가 3퍼센트" },
  { level: "1", ratio: 0.01, pct: "1%", label: "1점 후기가 1퍼센트" },
];

export default function RatingBars({
  sectionLabel = "별점 분포 요약",
  scores = DEFAULT_SCORES,
  scoreLabel = "5점 만점에 4.7점",
  counts = DEFAULT_COUNTS,
  rows = DEFAULT_ROWS,
  duration = 2000,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#1c1b22",
}: RatingBarsProps): ReactNode {
  const [loop, setLoop] = useState<boolean>(true);
  const [picked, setPicked] = useState<number>(-1);

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  const step = [styles.step1, styles.step2, styles.step3, styles.step4];
  const lag = [styles.lag1, styles.lag2, styles.lag3, styles.lag4, styles.lag5];

  /* 별점 줄을 누르면 그 점수만 골라 보는 필터 — 상점 평점 블록이 실제로 하는 동작 */
  const pick = (i: number): void => {
    setLoop(false);
    setPicked(picked === i ? -1 : i);
  };

  const cls = [styles.rd, loop ? styles.isDemo : "", picked >= 0 ? styles.isPicked : ""]
    .filter(Boolean)
    .join(" ");

  return (
    <section
      className={cls}
      style={vars}
      aria-label={sectionLabel}
      onPointerEnter={() => setLoop(false)}
      onFocus={() => setLoop(false)}
    >
      <div className={styles.card}>
        <div className={styles.summary}>
          <p className={styles.avg} role="img" aria-label={scoreLabel}>
            <span className={styles.num}>
              {scores.map((s: string, i: number) => (
                <span className={`${styles.n} ${step[i % step.length]}`} key={s}>{s}</span>
              ))}
            </span>
            <span className={styles.stars}>
              <Star /><Star /><Star /><Star /><StarHalf />
            </span>
          </p>
          <p className={styles.count} role="img" aria-label={counts[counts.length - 1]}>
            {counts.map((c: string, i: number) => (
              <span className={`${styles.c} ${step[i % step.length]}`} key={c}>{c}</span>
            ))}
          </p>
        </div>

        <ul className={styles.rows}>
          {rows.map((r: RatingRow, i: number) => {
            const rowVars: RowVars = { "--p": String(r.ratio) };
            return (
              <li key={r.level}>
                {/* 「별점 라벨 · 트랙 · 퍼센트」 세 칸. 트랙과 채움은 같은 칸에 겹치므로
                    flex: 1 1 0 + scaleX 조합(BD19 오탐)을 쓰지 않는다 */}
                <button
                  className={`${styles.row} ${lag[i] || ""}`}
                  type="button"
                  style={rowVars}
                  aria-pressed={picked === i}
                  aria-label={r.label}
                  onClick={() => pick(i)}
                >
                  <span className={styles.lv} aria-hidden="true">{r.level}<SmallStar /></span>
                  <span className={styles.track} aria-hidden="true">
                    <span className={styles.bg} />
                    <span className={styles.fill} />
                  </span>
                  <span className={styles.pct} aria-hidden="true">{r.pct}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
