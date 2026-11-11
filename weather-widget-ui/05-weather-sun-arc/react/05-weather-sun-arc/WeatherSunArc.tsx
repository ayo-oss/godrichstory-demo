import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./WeatherSunArc.module.scss";

// vanilla 판(run/281/demo/05-weather-sun-arc/index.html) 의 React 포트.
// 해는 아치를 따라 굴러가고(offset-path), 시각을 고르면 그 높이에 멈춘다.
// 하늘색은 아침/낮/저녁 세 밴드 — 실제 조작에서는 클래스로, 루프에서는 컷으로 맞바뀐다.

export type WeatherSunArcProps = {
  title?: string;
  groupLabel?: string;
  hourLabel?: string;
  rangeAria?: string;
  /** 시각 낱말("6시" … "20시") — 언어팩이 배열째로 바꾼다 */
  hourWords?: string[];
  /** 처음에 골라 둔 시각 */
  hour?: number;
  min?: number;
  max?: number;
  /** 격자 미리보기 2초 자동 루프. 사람이 손대면 꺼진다 */
  demo?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
// 해 심의 아치 위치 — inline style 로 넣는다
type SunVars = CSSProperties & { offsetDistance?: string };

const DEFAULT_HOUR_WORDS: string[] = [
  "6시", "7시", "8시", "9시", "10시", "11시", "12시", "13시", "14시",
  "15시", "16시", "17시", "18시", "19시", "20시",
];

const BAND_CLASS: { [k: string]: string } = {
  morning: styles.isMorning,
  noon: styles.isNoon,
  evening: styles.isEvening,
};

function SunOrb() {
  return (
    <svg viewBox="0 0 256 256" width="18" height="18" fill="currentColor"><path d="M184,128a56,56,0,1,1-56-56A56,56,0,0,1,184,128Z" opacity="0.2"/><path d="M120,40V16a8,8,0,0,1,16,0V40a8,8,0,0,1-16,0Zm72,88a64,64,0,1,1-64-64A64.07,64.07,0,0,1,192,128Zm-16,0a48,48,0,1,0-48,48A48.05,48.05,0,0,0,176,128ZM58.34,69.66A8,8,0,0,0,69.66,58.34l-16-16A8,8,0,0,0,42.34,53.66Zm0,116.68-16,16a8,8,0,0,0,11.32,11.32l16-16a8,8,0,0,0-11.32-11.32ZM192,72a8,8,0,0,0,5.66-2.34l16-16a8,8,0,0,0-11.32-11.32l-16,16A8,8,0,0,0,192,72Zm5.66,114.34a8,8,0,0,0-11.32,11.32l16,16a8,8,0,0,0,11.32-11.32ZM48,128a8,8,0,0,0-8-8H16a8,8,0,0,0,0,16H40A8,8,0,0,0,48,128Zm80,80a8,8,0,0,0-8,8v24a8,8,0,0,0,16,0V216A8,8,0,0,0,128,208Zm112-88H216a8,8,0,0,0,0,16h24a8,8,0,0,0,0-16Z"/></svg>
  );
}
function SunRiseIcon() {
  return (
    <svg viewBox="0 0 256 256" width="14" height="14" fill="currentColor"><path d="M192,144a64.33,64.33,0,0,1-2,16H66a64,64,0,1,1,126-16Z" opacity="0.2"/><path d="M240,152H199.55a73.54,73.54,0,0,0,0-48H240a8,8,0,0,1,0,16ZM117.66,53.66,128,43.31l10.34,10.35a8,8,0,0,0,11.32-11.32l-18-18a8,8,0,0,0-11.32,0l-18,18a8,8,0,0,0,11.32,11.32ZM72,24a8,8,0,0,0-8,8V48H48a8,8,0,0,0,0,16h16v16a8,8,0,0,0,16,0V64h16a8,8,0,0,0,0-16H80V32A8,8,0,0,0,72,24ZM168,184H32a8,8,0,0,1,0-16H168a48,48,0,0,1,0,96h-4.6a8,8,0,1,1-3.2-15.68c1.28-.26,2.53-.32,3.8-.32a32,32,0,0,0,0-64ZM120,96a40,40,0,0,0-38.66,29.76A8,8,0,0,0,88.9,136a8.14,8.14,0,0,0,2.22-.31A40,40,0,1,0,120,96Zm0,64a24,24,0,0,1-8.69-1.63,56,56,0,0,1,15.06-25.74A23.94,23.94,0,0,1,120,160Z"/></svg>
  );
}

export default function WeatherSunArc({
  title = "해의 길",
  groupLabel = "해의 길",
  hourLabel = "시각",
  rangeAria = "하루 시각 고르기",
  hourWords = DEFAULT_HOUR_WORDS,
  hour = 14,
  min = 6,
  max = 20,
  demo = true,
  duration = 2000,
  easing = "ease-out",
  color = "#e8960c",
}: WeatherSunArcProps) {
  const [now, setNow] = useState(hour);
  const [live, setLive] = useState(demo);

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  const span = max - min;
  const t = (now - min) / span;
  const sunVars: SunVars = { offsetDistance: `${t * 100}%` };
  // 하늘 밴드 — 시각 비율로 고른다
  const band = t < 0.25 ? "morning" : t < 0.72 ? "noon" : "evening";
  const word = hourWords[now - min] || "";

  function slide(e: { target: { value: string } }): void {
    setLive(false);
    setNow(Number(e.target.value));
  }

  const cls = [styles.sa, live ? styles.isDemo : "", BAND_CLASS[band] || ""].filter(Boolean).join(" ");

  return (
    <main className={styles.stage}>
      <section className={cls} style={vars} aria-label={groupLabel}>
        <p className={styles.title}>{title}</p>
        <div className={styles.skywrap}>
          <span className={`${styles.band} ${styles["band--morning"]}`} aria-hidden="true" />
          <span className={`${styles.band} ${styles["band--noon"]}`} aria-hidden="true" />
          <span className={`${styles.band} ${styles["band--evening"]}`} aria-hidden="true" />
          <svg className={styles.arc} viewBox="0 0 240 90" aria-hidden="true">
            <path className={styles.path} d="M 20 80 A 120 60 0 0 1 220 80" fill="none" stroke="rgba(23,20,26,.35)" strokeWidth="2" strokeDasharray="4 6" />
            <line x1="8" y1="80" x2="232" y2="80" stroke="rgba(23,20,26,.3)" strokeWidth="2" />
          </svg>
          <span className={styles.sun} style={sunVars} aria-hidden="true"><SunOrb /></span>
          <span className={styles.rise} aria-hidden="true"><SunRiseIcon /></span>
          <span className={styles.set} aria-hidden="true"><SunRiseIcon /></span>
        </div>
        <div className={styles.ctrl}>
          <label className={styles.lab} htmlFor="sa-hour">{hourLabel}</label>
          <input
            className={styles.range}
            id="sa-hour"
            type="range"
            min={min}
            max={max}
            step={1}
            value={now}
            aria-label={rangeAria}
            aria-valuenow={now}
            onChange={slide}
          />
          <output className={styles.time} htmlFor="sa-hour">{word}</output>
        </div>
      </section>
    </main>
  );
}
