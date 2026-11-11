import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./WeatherUnitToggle.module.scss";

// vanilla 판(run/281/demo/08-weather-unit-toggle/index.html) 의 React 포트.
// 단위를 고르면 카드 안 모든 온도가 같은 순간에 환산되고, 고른 값은 저장돼 다음에 열어도 그대로다.

export type UtHour = {
  /** 칸 라벨("지금", "15시" …) — 언어팩이 통째로 바꾼다 */
  label: string;
  /** 섭씨 원본값 */
  c: number;
};

export type UtDay = {
  label: string;
  lo: number;
  hi: number;
};

export type WeatherUnitToggleProps = {
  title?: string;
  groupLabel?: string;
  segLabel?: string;
  celsiusLabel?: string;
  fahrenheitLabel?: string;
  /** 큰 온도 — 섭씨 원본값 */
  big?: number;
  hours?: UtHour[];
  days?: UtDay[];
  /** 저장 열쇠 — 브라우저마다 이 이름으로 단위를 기억한다 */
  storageKey?: string;
  /** 격자 미리보기 2초 자동 루프. 사람이 손대면 꺼진다 */
  demo?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const DEFAULT_HOURS: UtHour[] = [
  { label: "지금", c: 24 },
  { label: "15시", c: 25 },
  { label: "16시", c: 23 },
  { label: "17시", c: 21 },
];

const DEFAULT_DAYS: UtDay[] = [
  { label: "오늘", lo: 18, hi: 27 },
  { label: "토요일", lo: 17, hi: 29 },
];

function toF(c: number): number {
  return Math.round((c * 9) / 5 + 32);
}

function loadUnit(key: string): string {
  try {
    return localStorage.getItem(key) || "";
  } catch (e) {
    // 저장이 막힌 창에서는 이번 화면만
    return "";
  }
}
function saveUnit(key: string, unit: string): void {
  try {
    localStorage.setItem(key, unit);
  } catch (e) {
    /* 저장이 막힌 창에서는 이번 화면만 */
  }
}

export default function WeatherUnitToggle({
  title = "서울의 온도",
  groupLabel = "온도 단위 고르기",
  segLabel = "온도 단위",
  celsiusLabel = "°C",
  fahrenheitLabel = "°F",
  big = 24,
  hours = DEFAULT_HOURS,
  days = DEFAULT_DAYS,
  storageKey = "ut-unit",
  demo = true,
  duration = 2000,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: WeatherUnitToggleProps) {
  const [unit, setUnit] = useState("c");
  const [live, setLive] = useState(demo);

  // 저장돼 있던 단위를 되살린다 — 없으면 섭씨
  useEffect(() => {
    if (loadUnit(storageKey) === "f") setUnit("f");
  }, []);

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  const isF = unit === "f";
  const suffix = isF ? fahrenheitLabel : celsiusLabel;
  const show = (c: number): number => (isF ? toF(c) : c);

  function pick(next: string): void {
    setLive(false);
    setUnit(next);
    saveUnit(storageKey, next);
  }

  const cls = [styles.ut, live ? styles.isDemo : "", isF ? styles.isF : ""].filter(Boolean).join(" ");

  return (
    <main className={styles.stage}>
      <section className={cls} style={vars} aria-label={groupLabel}>
        <header className={styles.head}>
          <p className={styles.title}>{title}</p>
          <div className={styles.seg} role="group" aria-label={segLabel}>
            <span className={styles.thumb} aria-hidden="true" />
            <button
              className={[styles.u, styles.uC, !isF ? styles.isOn : ""].filter(Boolean).join(" ")}
              type="button"
              aria-pressed={!isF ? "true" : "false"}
              onClick={() => pick("c")}
            >{celsiusLabel}</button>
            <button
              className={[styles.u, styles.uF, isF ? styles.isOn : ""].filter(Boolean).join(" ")}
              type="button"
              aria-pressed={isF ? "true" : "false"}
              onClick={() => pick("f")}
            >{fahrenheitLabel}</button>
          </div>
        </header>
        <p className={styles.big}>
          <output className={styles.swap}>
            <span className={styles.v}>{show(big)}</span>
            <span className={styles.alt} aria-hidden="true">{isF ? big : toF(big)}</span>
          </output>
          <span className={`${styles.deg} ${styles.swap}`}>
            <span className={styles.v}>{suffix}</span>
            <span className={styles.alt} aria-hidden="true">{isF ? celsiusLabel : fahrenheitLabel}</span>
          </span>
        </p>
        <ul className={styles.hours}>
          {hours.map((h: UtHour) => (
            <li className={styles.h} key={h.label}>
              <span className={styles.hl}>{h.label}</span>
              <span className={`${styles.ht} ${styles.swap}`}>
                <span className={styles.v}>{show(h.c)}</span>
                <span className={styles.alt} aria-hidden="true">{isF ? h.c : toF(h.c)}</span>
              </span>
              <span className={`${styles.hs} ${styles.swap}`}>
                <span className={styles.v}>{suffix}</span>
                <span className={styles.alt} aria-hidden="true">{isF ? celsiusLabel : fahrenheitLabel}</span>
              </span>
            </li>
          ))}
        </ul>
        <ul className={styles.days}>
          {days.map((d: UtDay) => (
            <li className={styles.d} key={d.label}>
              <span className={styles.dl}>{d.label}</span>
              <span className={`${styles.dv} ${styles.swap}`}>
                <span className={styles.v}>{show(d.lo)}</span>
                <span className={styles.alt} aria-hidden="true">{isF ? d.lo : toF(d.lo)}</span>
              </span>
              <span className={styles.dd}>/</span>
              <span className={`${styles.dv} ${styles.swap}`}>
                <span className={styles.v}>{show(d.hi)}</span>
                <span className={styles.alt} aria-hidden="true">{isF ? d.hi : toF(d.hi)}</span>
              </span>
              <span className={`${styles.ds} ${styles.swap}`}>
                <span className={styles.v}>{suffix}</span>
                <span className={styles.alt} aria-hidden="true">{isF ? celsiusLabel : fahrenheitLabel}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
