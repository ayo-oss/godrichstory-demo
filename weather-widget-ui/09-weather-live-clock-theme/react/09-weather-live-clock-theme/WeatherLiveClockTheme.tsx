import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./WeatherLiveClockTheme.module.scss";

// vanilla 판(run/281/demo/09-weather-live-clock-theme/index.html) 의 React 포트.
// 실제 시계 — 매초 돌되 분이 바뀔 때만 글자를 고친다.
// 낭독기가 매초 소리치지 않게 role="timer" + aria-live="off" 로 묵음한다.

export type WeatherLiveClockThemeProps = {
  groupLabel?: string;
  clockLabel?: string;
  /** 요일 낱말 — 일요일부터. 언어팩이 배열째로 바꾼다 */
  weekWords?: string[];
  /** 인사말 — 아침·오후·저녁·밤 순 */
  greetings?: string[];
  /** 날짜 표기 사이 구분 글자 */
  dateSep?: string;
  /** 격자 미리보기 2초 자동 루프 */
  demo?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const DEFAULT_WEEK: string[] = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"];
const DEFAULT_GREETINGS: string[] = ["좋은 아침이에요", "좋은 오후예요", "좋은 저녁이에요", "좋은 밤이에요"];

const THEME_CLASS: { [k: string]: string } = {
  morning: styles.isMorning,
  noon: styles.isNoon,
  evening: styles.isEvening,
  night: styles.isNight,
};

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}
function themeOf(h: number): string {
  if (h >= 5 && h < 12) return "morning";
  if (h < 18) return "noon";
  if (h < 22) return "evening";
  return "night";
}
function greetingIndex(h: number): number {
  if (h >= 5 && h < 12) return 0;
  if (h < 18) return 1;
  if (h < 22) return 2;
  return 3;
}

type ClockState = {
  now: string;
  /** 겹쳐 둔 다음 분 글자 — 격자 루프에서만 보인다 */
  next: string;
  date: string;
  greeting: string;
  theme: string;
};

function readClock(weekWords: string[], greetings: string[], sep: string): ClockState {
  const d = new Date();
  const nx = new Date(d.getTime() + 60000);
  return {
    now: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
    next: `${pad(nx.getHours())}:${pad(nx.getMinutes())}`,
    date: `${weekWords[d.getDay()]} ${sep} ${d.getMonth() + 1}/${d.getDate()}`,
    greeting: greetings[greetingIndex(d.getHours())],
    theme: themeOf(d.getHours()),
  };
}

function SunOrb() {
  return (
    <svg viewBox="0 0 256 256" width="22" height="22" fill="currentColor"><path d="M184,128a56,56,0,1,1-56-56A56,56,0,0,1,184,128Z" opacity="0.2"/><path d="M120,40V16a8,8,0,0,1,16,0V40a8,8,0,0,1-16,0Zm72,88a64,64,0,1,1-64-64A64.07,64.07,0,0,1,192,128Zm-16,0a48,48,0,1,0-48,48A48.05,48.05,0,0,0,176,128ZM58.34,69.66A8,8,0,0,0,69.66,58.34l-16-16A8,8,0,0,0,42.34,53.66Zm0,116.68-16,16a8,8,0,0,0,11.32,11.32l16-16a8,8,0,0,0-11.32-11.32ZM192,72a8,8,0,0,0,5.66-2.34l16-16a8,8,0,0,0-11.32-11.32l-16,16A8,8,0,0,0,192,72Zm5.66,114.34a8,8,0,0,0-11.32,11.32l16,16a8,8,0,0,0,11.32-11.32ZM48,128a8,8,0,0,0-8-8H16a8,8,0,0,0,0,16H40A8,8,0,0,0,48,128Zm80,80a8,8,0,0,0-8,8v24a8,8,0,0,0,16,0V216A8,8,0,0,0,128,208Zm112-88H216a8,8,0,0,0,0,16h24a8,8,0,0,0,0-16Z"/></svg>
  );
}
function MoonOrb() {
  return (
    <svg viewBox="0 0 256 256" width="20" height="20" fill="currentColor"><path d="M210.69,158.18A88,88,0,1,1,97.82,45.31,96.08,96.08,0,0,0,192,160,96.78,96.78,0,0,0,210.69,158.18Z" opacity="0.2"/><path d="M240,96a8,8,0,0,1-8,8H216v16a8,8,0,0,1-16,0V104H184a8,8,0,0,1,0-16h16V72a8,8,0,0,1,16,0V88h16A8,8,0,0,1,240,96ZM144,56h8v8a8,8,0,0,0,16,0V56h8a8,8,0,0,0,0-16h-8V32a8,8,0,0,0-16,0v8h-8a8,8,0,0,0,0,16Zm72.77,97a8,8,0,0,1,1.43,8A96,96,0,1,1,95.07,37.8a8,8,0,0,1,10.6,9.06A88.07,88.07,0,0,0,209.14,150.33,8,8,0,0,1,216.77,153Zm-19.39,14.88c-1.79.09-3.59.14-5.38.14A104.11,104.11,0,0,1,88,64c0-1.79,0-3.59.14-5.38A80,80,0,1,0,197.38,167.86Z"/></svg>
  );
}

export default function WeatherLiveClockTheme({
  groupLabel = "실시간 시계와 하루 테마",
  clockLabel = "현재 시각",
  weekWords = DEFAULT_WEEK,
  greetings = DEFAULT_GREETINGS,
  dateSep = "·",
  demo = true,
  duration = 2000,
  easing = "ease-out",
  color = "#2f6df6",
}: WeatherLiveClockThemeProps) {
  const [clock, setClock] = useState<ClockState>(() => readClock(weekWords, greetings, dateSep));

  // 매초 돌되 분이 바뀔 때만 글자를 고친다
  useEffect(() => {
    const id = setInterval(() => {
      setClock((prev: ClockState) => {
        const next = readClock(weekWords, greetings, dateSep);
        return next.now === prev.now ? prev : next;
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  const cls = [styles.lc, demo ? styles.isDemo : "", THEME_CLASS[clock.theme] || ""].filter(Boolean).join(" ");

  return (
    <main className={styles.stage}>
      <section className={cls} style={vars} aria-label={groupLabel}>
        <div className={styles.skywrap} aria-hidden="true">
          <span className={`${styles.band} ${styles["band--morning"]}`} />
          <span className={`${styles.band} ${styles["band--noon"]}`} />
          <span className={`${styles.band} ${styles["band--evening"]}`} />
          <span className={`${styles.band} ${styles["band--night"]}`} />
          <span className={`${styles.orb} ${styles["orb--sun"]}`}><SunOrb /></span>
          <span className={`${styles.orb} ${styles["orb--moon"]}`}><MoonOrb /></span>
        </div>
        <div className={styles.body}>
          <p className={styles.clock} role="timer" aria-live="off" aria-label={clockLabel}>
            <span className={styles.swap}>
              <span className={styles.v}>{clock.now}</span>
              <span className={styles.alt} aria-hidden="true">{clock.next}</span>
            </span>
          </p>
          <p className={styles.date}>{clock.date}</p>
          <p className={styles.hi}>
            <span className={styles.swap}>
              <span className={styles.v}>{clock.greeting}</span>
              <span className={styles.alt} aria-hidden="true">{greetings[2]}</span>
            </span>
          </p>
        </div>
      </section>
    </main>
  );
}
