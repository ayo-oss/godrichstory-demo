import { useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./ThreeCityConvert.module.scss";

type KeyEvt = { key: string; preventDefault(): void };
type PtrEvt = { clientX: number; currentTarget: { getBoundingClientRect(): { left: number; width: number } } };
type Box<T> = { current: T };
type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type RailVars = CSSProperties & { "--p"?: string };

/** 기준 도시에서 몇 분 떨어졌는지 — Intl 실시간 값이 아니라 고정 오프셋이다 */
export type City = { name: string; offset: number };

export type ThreeCityConvertProps = {
  cities?: [City, City, City];
  base?: number;
  nextDayLabel?: string;
  sliderLabel?: string;
  minusLabel?: string;
  plusLabel?: string;
  duration?: number;
  easing?: string;
  color?: string;
};

const MAX = 1410;
const STEP = 30;
const DEMO = [420, 540, 720]; // 격자 미리보기(.isDemo) 루프가 훑는 기준 시각 석 장

const GLOBE = (
  <g fill="currentColor">
    <path d="M224 128a96 96 0 1 1-96-96a96 96 0 0 1 96 96" opacity=".2" />
    <path d="M128 24a104 104 0 1 0 104 104A104.12 104.12 0 0 0 128 24m88 104a87.6 87.6 0 0 1-3.33 24h-38.51a157.4 157.4 0 0 0 0-48h38.51a87.6 87.6 0 0 1 3.33 24m-114 40h52a115.1 115.1 0 0 1-26 45a115.3 115.3 0 0 1-26-45m-3.9-16a140.8 140.8 0 0 1 0-48h59.88a140.8 140.8 0 0 1 0 48ZM40 128a87.6 87.6 0 0 1 3.33-24h38.51a157.4 157.4 0 0 0 0 48H43.33A87.6 87.6 0 0 1 40 128m114-40h-52a115.1 115.1 0 0 1 26-45a115.3 115.3 0 0 1 26 45m52.33 0h-35.62a135.3 135.3 0 0 0-22.3-45.6A88.29 88.29 0 0 1 206.37 88Zm-98.74-45.6A135.3 135.3 0 0 0 85.29 88H49.63a88.29 88.29 0 0 1 57.96-45.6M49.63 168h35.66a135.3 135.3 0 0 0 22.3 45.6A88.29 88.29 0 0 1 49.63 168m98.78 45.6a135.3 135.3 0 0 0 22.3-45.6h35.66a88.29 88.29 0 0 1-57.96 45.6" />
  </g>
);
const CARET_LEFT = (
  <g fill="currentColor">
    <path d="M160 48v160l-80-80Z" opacity=".2" />
    <path d="M163.06 40.61a8 8 0 0 0-8.72 1.73l-80 80a8 8 0 0 0 0 11.32l80 80A8 8 0 0 0 168 208V48a8 8 0 0 0-4.94-7.39M152 188.69L91.31 128L152 67.31Z" />
  </g>
);
const CARET_RIGHT = (
  <g fill="currentColor">
    <path d="m176 128l-80 80V48Z" opacity=".2" />
    <path d="m181.66 122.34l-80-80A8 8 0 0 0 88 48v160a8 8 0 0 0 13.66 5.66l80-80a8 8 0 0 0 0-11.32M104 188.69V67.31L164.69 128Z" />
  </g>
);

function pad(n: number) {
  return (n < 10 ? "0" : "") + n;
}
function hhmm(m: number) {
  const t = m % 1440;
  return pad(Math.floor(t / 60)) + ":" + pad(t % 60);
}

export default function ThreeCityConvert({
  cities = [
    { name: "New York", offset: 0 },
    { name: "London", offset: 300 },
    { name: "Seoul", offset: 780 },
  ],
  base = 7 * 60,
  nextDayLabel = "next day",
  sliderLabel = "Reference city time",
  minusLabel = "back 30 minutes",
  plusLabel = "forward 30 minutes",
  duration = 220,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#4cd4a6",
}: ThreeCityConvertProps) {
  const [demo, setDemo] = useState(true);
  const [at, setAt] = useState(base);
  const rail = useRef<HTMLSpanElement | null>(null) as Box<HTMLSpanElement | null>;
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  const railVars: RailVars = { "--p": (at / MAX).toFixed(4) };

  // 세 줄이 한 값에서 나오므로 어긋날 수가 없다 — 같은 렌더에 함께 갈린다
  const lines = cities.map((c) => ({ name: c.name, t: hhmm(at + c.offset), next: at + c.offset >= 1440 }));
  const say = lines.map((l) => `${l.name} ${l.t}${l.next ? " " + nextDayLabel : ""}`);

  function move(d: number) {
    setDemo(false);
    setAt((p) => Math.max(0, Math.min(MAX, p + d * STEP)));
  }

  function onKey(e: KeyEvt) {
    const d = e.key === "ArrowRight" || e.key === "ArrowUp" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowDown" ? -1 : 0;
    if (d) {
      e.preventDefault();
      move(d);
      return;
    }
    if (e.key === "Home" || e.key === "End") {
      e.preventDefault();
      setDemo(false);
      setAt(e.key === "Home" ? 0 : MAX);
    }
  }

  function onDown(e: PtrEvt) {
    const r = e.currentTarget.getBoundingClientRect();
    const p = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
    setDemo(false);
    setAt(Math.round((p * MAX) / STEP) * STEP);
  }

  function nudge(d: number, label: string) {
    return (
      <button
        className={styles.nudge}
        type="button"
        aria-label={label}
        onClick={() => {
          move(d);
          if (rail.current) rail.current.focus({ preventScroll: true });
        }}
      >
        <svg viewBox="0 0 256 256" width="14" height="14" aria-hidden="true">{d < 0 ? CARET_LEFT : CARET_RIGHT}</svg>
      </button>
    );
  }

  return (
    <div className={`${styles.tz} ${demo ? styles.isDemo : ""}`} style={vars}>
      <ul className={styles.rows}>
        {lines.map((l, i) => (
          <li
            key={l.name}
            className={`${styles.row} ${i === 0 ? styles.rowBase : ""}`}
            data-r={i}
            data-next={l.next ? "1" : "0"}
          >
            <span className={styles.city}>
              {i === 0 ? (
                <span className={styles.ic} aria-hidden="true">
                  <svg viewBox="0 0 256 256" width="14" height="14">{GLOBE}</svg>
                </span>
              ) : null}
              <span className={styles.name}>{l.name}</span>
            </span>

            <span className={styles.slot}>
              <span className={styles.t}>{l.t}</span>
              {DEMO.map((d, k) => (
                <span className={styles.f} data-k={["a", "b", "c"][k]} key={d}>
                  {hhmm(d + cities[i].offset)}
                </span>
              ))}
            </span>

            {i === 0 ? (
              <span className={styles.ctl}>
                {nudge(-1, minusLabel)}
                {nudge(1, plusLabel)}
              </span>
            ) : (
              <span className={styles.badge}>{nextDayLabel}</span>
            )}

            {i === 0 ? (
              <span
                className={styles.rail}
                style={railVars}
                role="slider"
                tabIndex={0}
                aria-label={sliderLabel}
                aria-valuemin={0}
                aria-valuemax={MAX}
                aria-valuenow={at}
                aria-valuetext={say[0]}
                ref={(el: HTMLSpanElement | null) => {
                  rail.current = el;
                }}
                onKeyDown={onKey}
                onPointerDown={onDown}
              >
                <span className={styles.fill} />
              </span>
            ) : null}
          </li>
        ))}
      </ul>

      <p className={styles.live} aria-live="polite">{say.join(" · ")}</p>
    </div>
  );
}
