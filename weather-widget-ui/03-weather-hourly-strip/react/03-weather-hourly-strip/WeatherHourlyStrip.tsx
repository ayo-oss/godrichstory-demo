import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./WeatherHourlyStrip.module.scss";

// vanilla 판(run/281/demo/03-weather-hourly-strip/index.html) 의 React 포트.
// 실제 시각과 가장 가까운 칸을 찾아 점을 켜고 aria-current 를 붙인다.
// 칸에 손을 대면 미리보기 루프를 그만두고 진짜 스크롤로 쓰게 둔다.

export type HsHour = {
  hour: number;
  /** 칸 위 라벨("지금", "15시" …) — 언어팩이 통째로 바꾼다 */
  label: string;
  icon: "sun" | "cloudsun" | "cloud" | "rain";
  /** 온도 글자 그대로("24°") */
  temp: string;
};

export type WeatherHourlyStripProps = {
  title?: string;
  hint?: string;
  groupLabel?: string;
  viewportLabel?: string;
  hours?: HsHour[];
  /** 격자 미리보기 2초 자동 루프. 사람이 손대면 꺼진다 */
  demo?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const DEFAULT_HOURS: HsHour[] = [
  { hour: 14, label: "지금", icon: "sun", temp: "24°" },
  { hour: 15, label: "15시", icon: "sun", temp: "25°" },
  { hour: 16, label: "16시", icon: "cloudsun", temp: "24°" },
  { hour: 17, label: "17시", icon: "cloudsun", temp: "23°" },
  { hour: 18, label: "18시", icon: "cloud", temp: "21°" },
  { hour: 19, label: "19시", icon: "cloud", temp: "19°" },
  { hour: 20, label: "20시", icon: "rain", temp: "18°" },
  { hour: 21, label: "21시", icon: "rain", temp: "17°" },
  { hour: 22, label: "22시", icon: "rain", temp: "17°" },
];

function SunIcon() {
  return (
    <svg viewBox="0 0 256 256" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M184,128a56,56,0,1,1-56-56A56,56,0,0,1,184,128Z" opacity="0.2"/><path d="M120,40V16a8,8,0,0,1,16,0V40a8,8,0,0,1-16,0Zm72,88a64,64,0,1,1-64-64A64.07,64.07,0,0,1,192,128Zm-16,0a48,48,0,1,0-48,48A48.05,48.05,0,0,0,176,128ZM58.34,69.66A8,8,0,0,0,69.66,58.34l-16-16A8,8,0,0,0,42.34,53.66Zm0,116.68-16,16a8,8,0,0,0,11.32,11.32l16-16a8,8,0,0,0-11.32-11.32ZM192,72a8,8,0,0,0,5.66-2.34l16-16a8,8,0,0,0-11.32-11.32l-16,16A8,8,0,0,0,192,72Zm5.66,114.34a8,8,0,0,0-11.32,11.32l16,16a8,8,0,0,0,11.32-11.32ZM48,128a8,8,0,0,0-8-8H16a8,8,0,0,0,0,16H40A8,8,0,0,0,48,128Zm80,80a8,8,0,0,0-8,8v24a8,8,0,0,0,16,0V216A8,8,0,0,0,128,208Zm112-88H216a8,8,0,0,0,0,16h24a8,8,0,0,0,0-16Z"/></svg>
  );
}
function CloudSunIcon() {
  return (
    <svg viewBox="0 0 256 256" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M139.84,84.41v0a68.22,68.22,0,0,0-41.65,46v-.11a44.08,44.08,0,0,0-38.54,5h0a48,48,0,1,1,80.19-50.94Z" opacity="0.2"/><path d="M164,72a76.2,76.2,0,0,0-20.26,2.73,55.63,55.63,0,0,0-9.41-11.54l9.51-13.57a8,8,0,1,0-13.11-9.18L121.22,54A55.9,55.9,0,0,0,96,48c-.58,0-1.16,0-1.74,0L91.37,31.71a8,8,0,1,0-15.75,2.77L78.5,50.82A56.1,56.1,0,0,0,55.23,65.67L41.61,56.14a8,8,0,1,0-9.17,13.11L46,78.77A55.55,55.55,0,0,0,40,104c0,.57,0,1.15,0,1.72L23.71,108.6a8,8,0,0,0,1.38,15.88,8.24,8.24,0,0,0,1.39-.12l16.32-2.88a55.74,55.74,0,0,0,5.86,12.42A52,52,0,0,0,84,224h80a76,76,0,0,0,0-152ZM56,104a40,40,0,0,1,72.54-23.24,76.26,76.26,0,0,0-35.62,40,52.14,52.14,0,0,0-31,4.17A40,40,0,0,1,56,104ZM164,208H84a36,36,0,1,1,4.78-71.69c-.37,2.37-.63,4.79-.77,7.23a8,8,0,0,0,16,.92,58.91,58.91,0,0,1,1.88-11.81c0-.16.09-.32.12-.48A60.06,60.06,0,1,1,164,208Z"/></svg>
  );
}
function CloudIcon() {
  return (
    <svg viewBox="0 0 256 256" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M240,128a80,80,0,0,1-80,80H72A56,56,0,1,1,85.92,97.74l0,.1A80,80,0,0,1,240,128Z" opacity="0.2"/><path d="M160,40A88.09,88.09,0,0,0,81.29,88.67,64,64,0,1,0,72,216h88a88,88,0,0,0,0-176Zm0,160H72a48,48,0,0,1,0-96c1.1,0,2.2,0,3.29.11A88,88,0,0,0,72,128a8,8,0,0,0,16,0,72,72,0,1,1,72,72Z"/></svg>
  );
}
function RainIcon() {
  return (
    <svg viewBox="0 0 256 256" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M224,92a68,68,0,0,1-68,68H76A44,44,0,1,1,90.2,74.34v.11A68.06,68.06,0,0,1,224,92Z" opacity="0.2"/><path d="M158.66,196.44l-32,48a8,8,0,1,1-13.32-8.88l32-48a8,8,0,0,1,13.32,8.88ZM232,92a76.08,76.08,0,0,1-76,76H132.28l-29.62,44.44a8,8,0,1,1-13.32-8.88L113.05,168H76A52,52,0,1,1,76,64a53.26,53.26,0,0,1,8.92.76A76.08,76.08,0,0,1,232,92Zm-16,0A60.06,60.06,0,0,0,96,88.46a8,8,0,0,1-16-.92q.21-3.66.77-7.23A38.11,38.11,0,0,0,76,80a36,36,0,0,0,0,72h80A60.07,60.07,0,0,0,216,92Z"/></svg>
  );
}

function HourIcon({ kind }: { kind: HsHour["icon"] }) {
  if (kind === "cloudsun") return <CloudSunIcon />;
  if (kind === "cloud") return <CloudIcon />;
  if (kind === "rain") return <RainIcon />;
  return <SunIcon />;
}

export default function WeatherHourlyStrip({
  title = "시간별 예보",
  hint = "옆으로 밀어 보세요",
  groupLabel = "시간별 예보 띠",
  viewportLabel = "시간별 온도 목록",
  hours = DEFAULT_HOURS,
  demo = true,
  duration = 2000,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: WeatherHourlyStripProps) {
  const [live, setLive] = useState(demo);
  // 실제 시각과 가장 가까운 칸 — 마운트 때 한 번 정한다
  const [nowIdx] = useState(() => {
    const nowHour = new Date().getHours();
    let best = 0;
    let gap = 99;
    hours.forEach((h: HsHour, i: number) => {
      const g = Math.abs(h.hour - nowHour);
      if (g < gap) { gap = g; best = i; }
    });
    return best;
  });

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  const cls = [styles.hs, live ? styles.isDemo : ""].filter(Boolean).join(" ");
  const iconCls = (kind: HsHour["icon"]): string => {
    if (kind === "cloud") return `${styles.i} ${styles["i--cloud"]}`;
    if (kind === "rain") return `${styles.i} ${styles["i--rain"]}`;
    return styles.i;
  };

  return (
    <main className={styles.stage}>
      <section className={cls} style={vars} aria-label={groupLabel}>
        <header className={styles.head}>
          <p className={styles.title}>{title}</p>
          <p className={styles.hint}>{hint}</p>
        </header>
        <div
          className={styles.viewport}
          tabIndex={0}
          aria-label={viewportLabel}
          onPointerDown={() => setLive(false)}
        >
          <ul className={styles.track}>
            {hours.map((h: HsHour, i: number) => (
              <li
                key={h.hour}
                className={[styles.cell, i === nowIdx ? styles.isNow : ""].filter(Boolean).join(" ")}
                aria-current={i === nowIdx ? "true" : undefined}
              >
                <span className={styles.dot} aria-hidden="true" />
                <span className={styles.h}>{h.label}</span>
                <span className={iconCls(h.icon)} aria-hidden="true"><HourIcon kind={h.icon} /></span>
                <span className={styles.t}>{h.temp}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}
