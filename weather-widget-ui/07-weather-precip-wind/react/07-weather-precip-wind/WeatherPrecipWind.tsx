import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./WeatherPrecipWind.module.scss";

// vanilla 판(run/281/demo/07-weather-precip-wind/index.html) 의 React 포트.
// 강수 막대는 scaleY 로 아래에서 자라고(높이값은 --h 로 정적으로 들어 있다),
// 나침반 바늘은 풍향 각도로 돈다 — 누르면 여덟 방향을 돌아가며 바꾼다.

export type PwBar = {
  /** 퍼센트 숫자 */
  pct: number;
  /** 막대 높이 — CSS 변수 --h 값 그대로("20%") */
  h: string;
  /** 밑 라벨("12시") — 언어팩이 통째로 바꾼다 */
  hour: string;
};

export type PwDir = {
  deg: number;
  name: string;
  speed: number;
};

export type WeatherPrecipWindProps = {
  groupLabel?: string;
  rainTitle?: string;
  barsAria?: string;
  buttonLabel?: string;
  bars?: PwBar[];
  dirs?: PwDir[];
  /** 겹쳐 둔 두 번째 풍문 글자 — 미리보기 루프에서만 보인다 */
  altLabel?: string;
  /** 처음에 골라 둔 풍향 인덱스 */
  startIdx?: number;
  /** 격자 미리보기 2초 자동 루프. 사람이 손대면 꺼진다 */
  demo?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
// 막대 높이 — CSS 변수로만 전달한다
type BarVars = CSSProperties & { "--h"?: string };
// 바늘 각도 — inline style 로 넣는다
type NeedleVars = CSSProperties & { transform?: string };

const DEFAULT_BARS: PwBar[] = [
  { pct: 10, h: "20%", hour: "12시" },
  { pct: 35, h: "44%", hour: "13시" },
  { pct: 60, h: "68%", hour: "14시" },
  { pct: 80, h: "88%", hour: "15시" },
  { pct: 45, h: "52%", hour: "16시" },
  { pct: 20, h: "28%", hour: "17시" },
];

const DEFAULT_DIRS: PwDir[] = [
  { deg: 0, name: "북풍", speed: 2 },
  { deg: 45, name: "북동풍", speed: 3 },
  { deg: 90, name: "동풍", speed: 4 },
  { deg: 135, name: "남동풍", speed: 3 },
  { deg: 180, name: "남풍", speed: 2 },
  { deg: 225, name: "남서풍", speed: 4 },
  { deg: 270, name: "서풍", speed: 5 },
  { deg: 315, name: "북서풍", speed: 3 },
];

function WindMarkIcon() {
  return (
    <svg viewBox="0 0 256 256" width="12" height="12" fill="currentColor" aria-hidden="true"><path d="M184,184a32,32,0,0,1-32,32c-13.7,0-26.95-8.93-31.5-21.22a8,8,0,0,1,15-5.56C137.74,195.27,145,200,152,200a16,16,0,0,0,0-32H40a8,8,0,0,1,0-16H152A32,32,0,0,1,184,184Zm-64-80a32,32,0,0,0,0-64c-13.7,0-26.95,8.93-31.5,21.22a8,8,0,0,0,15,5.56C105.74,60.73,113,56,120,56a16,16,0,0,1,0,32H24a8,8,0,0,0,0,16Zm88-32c-13.7,0-26.95,8.93-31.5,21.22a8,8,0,0,0,15,5.56C193.74,92.73,201,88,208,88a16,16,0,0,1,0,32H32a8,8,0,0,0,0,16H208a32,32,0,0,0,0-64Z" opacity="0.2"/><path d="M120,96a24,24,0,1,1,24-24A24,24,0,0,1,120,96Zm88-16a24,24,0,1,0,24,24A24,24,0,0,0,208,80Zm-56,80a24,24,0,1,0,24,24A24,24,0,0,0,152,160Z"/></svg>
  );
}

export default function WeatherPrecipWind({
  groupLabel = "강수 확률과 바람",
  rainTitle = "강수 확률",
  barsAria = "시간별 강수 확률 막대",
  buttonLabel = "방향 바꾸기",
  bars = DEFAULT_BARS,
  dirs = DEFAULT_DIRS,
  altLabel = "북서풍 5m/s",
  startIdx = 7,
  demo = true,
  duration = 2000,
  easing = "ease-out",
  color = "#2f6df6",
}: WeatherPrecipWindProps) {
  const [idx, setIdx] = useState(startIdx);
  const [live, setLive] = useState(demo);

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  const dir = dirs[idx % dirs.length];
  const needleVars: NeedleVars = { transform: `rotate(${dir.deg}deg)` };
  const windWord = `${dir.name} ${dir.speed}m/s`;

  function turn(): void {
    setLive(false);
    setIdx((prev: number) => (prev + 1) % dirs.length);
  }

  const cls = [styles.pw, live ? styles.isDemo : ""].filter(Boolean).join(" ");

  return (
    <main className={styles.stage}>
      <section className={cls} style={vars} aria-label={groupLabel}>
        <div className={styles.rain}>
          <p className={styles.rt}>{rainTitle}</p>
          <div className={styles.cols} role="img" aria-label={barsAria}>
            {bars.map((b: PwBar) => (
              <div className={styles.col} key={b.hour}>
                <span className={styles.pct}>{b.pct}</span>
                <span className={styles.barwrap}><span className={styles.bar} style={({ "--h": b.h } as BarVars)} /></span>
                <span className={styles.hr}>{b.hour}</span>
              </div>
            ))}
          </div>
        </div>
        <div className={styles.wind}>
          <div className={styles.compass} aria-hidden="true">
            <span className={`${styles.tick} ${styles["tick--n"]}`}>북</span>
            <span className={`${styles.tick} ${styles["tick--e"]}`}>동</span>
            <span className={`${styles.tick} ${styles["tick--s"]}`}>남</span>
            <span className={`${styles.tick} ${styles["tick--w"]}`}>서</span>
            <span className={styles.needle} style={needleVars} />
            <span className={styles.hub} />
          </div>
          <p className={styles.wlab} aria-live="polite">
            <span className={styles.swap}>
              <span className={styles.v}>{windWord}</span>
              <span className={styles.alt} aria-hidden="true">{altLabel}</span>
            </span>
          </p>
          <button className={styles.btn} type="button" onClick={turn}><WindMarkIcon />{buttonLabel}</button>
        </div>
      </section>
    </main>
  );
}
