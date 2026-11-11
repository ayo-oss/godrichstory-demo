import { useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./CountdownRingSetter.module.scss";

type KeyEvt = { key: string; preventDefault(): void };
type Box<T> = { current: T };
type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type RingVars = CSSProperties & { "--ring-angle"?: string };
type Unit = "min" | "sec";

export type CountdownRingSetterProps = {
  minutes?: number;
  seconds?: number;
  labels?: {
    cap: string;
    start: string;
    min: string;
    sec: string;
    minUp: string;
    minDown: string;
    secUp: string;
    secDown: string;
    minUnit: string;
    secUnit: string;
  };
  /** {n} 자리에 값이 들어가는 aria-valuetext 틀 */
  valueText?: { min: string; sec: string };
  /** 격자 미리보기(.isDemo) 루프에서만 보이는 숫자 석 장 */
  demoFrames?: [string, string, string];
  duration?: number;
  easing?: string;
  color?: string;
};

const STEP: { min: number; sec: number } = { min: 1, sec: 5 };
const MAX: { min: number; sec: number } = { min: 59, sec: 55 };

const CARET_DOWN = (
  <g fill="currentColor">
    <path d="m208 96l-80 80l-80-80Z" opacity=".2" />
    <path d="M215.39 92.94A8 8 0 0 0 208 88H48a8 8 0 0 0-5.66 13.66l80 80a8 8 0 0 0 11.32 0l80-80a8 8 0 0 0 1.73-8.72M128 164.69L67.31 104h121.38Z" />
  </g>
);
const CARET_UP = (
  <g fill="currentColor">
    <path d="M208 160H48l80-80Z" opacity=".2" />
    <path d="m213.66 154.34l-80-80a8 8 0 0 0-11.32 0l-80 80A8 8 0 0 0 48 168h160a8 8 0 0 0 5.66-13.66M67.31 152L128 91.31L188.69 152Z" />
  </g>
);

function pad(n: number) {
  return (n < 10 ? "0" : "") + n;
}

export default function CountdownRingSetter({
  minutes = 5,
  seconds = 0,
  labels = {
    cap: "Timer length",
    start: "Start",
    min: "minutes",
    sec: "seconds",
    minUp: "minutes up",
    minDown: "minutes down",
    secUp: "seconds up",
    secDown: "seconds down",
    minUnit: "m",
    secUnit: "s",
  },
  valueText = { min: "{n} minutes", sec: "{n} seconds" },
  demoFrames = ["05:00", "03:45", "02:30"],
  duration = 300,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: CountdownRingSetterProps) {
  const [demo, setDemo] = useState(true);
  const [v, setV] = useState({ min: minutes, sec: seconds });
  const [left, setLeft] = useState<number | null>(null);
  const timer = useRef<number | null>(null) as Box<number | null>;

  const total = v.min * 60 + v.sec;
  const shown = left === null ? total : left;
  // 남은 비율이 그대로 각도가 된다 — @property 로 등록된 값이라야 이 각도가 보간된다
  const angle = left === null || total === 0 ? 360 : (left / total) * 360;
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  const ringVars: RingVars = { "--ring-angle": `${angle.toFixed(1)}deg` };

  function stop() {
    if (timer.current !== null) {
      window.clearInterval(timer.current);
      timer.current = null;
    }
  }

  function set(k: Unit, n: number) {
    setDemo(false);
    stop();
    setLeft(null);
    const c = Math.max(0, Math.min(MAX[k], n));
    setV((p) => (k === "min" ? { min: c, sec: p.sec } : { min: p.min, sec: c }));
  }

  function bump(k: Unit, d: number) {
    set(k, v[k] + d * STEP[k]);
  }

  function start() {
    setDemo(false);
    stop();
    if (!total) return;
    setLeft(total);
    timer.current = window.setInterval(() => {
      setLeft((p) => {
        const n = (p === null ? total : p) - 1;
        if (n <= 0) stop();
        return n < 0 ? 0 : n;
      });
    }, 1000);
  }

  function onKey(e: KeyEvt, k: Unit) {
    const d = e.key === "ArrowUp" ? 1 : e.key === "ArrowDown" ? -1 : 0;
    if (d) {
      e.preventDefault();
      bump(k, d);
      return;
    }
    if (e.key === "Home" || e.key === "End") {
      e.preventDefault();
      set(k, e.key === "Home" ? 0 : MAX[k]);
    }
  }

  function field(k: Unit, lab: string, unit: string, up: string, down: string) {
    return (
      <div className={styles.field}>
        <button className={styles.step} type="button" aria-label={down} onClick={() => bump(k, -1)}>
          <svg viewBox="0 0 256 256" width="16" height="16" aria-hidden="true">{CARET_DOWN}</svg>
        </button>
        <span
          className={styles.val}
          role="spinbutton"
          tabIndex={0}
          aria-label={lab}
          aria-valuemin={0}
          aria-valuemax={MAX[k]}
          aria-valuenow={v[k]}
          aria-valuetext={valueText[k].replace("{n}", String(v[k]))}
          onKeyDown={(e: KeyEvt) => onKey(e, k)}
        >
          <b className={styles.n}>{pad(v[k])}</b>
          <i className={styles.u}>{unit}</i>
        </span>
        <button className={styles.step} type="button" aria-label={up} onClick={() => bump(k, 1)}>
          <svg viewBox="0 0 256 256" width="16" height="16" aria-hidden="true">{CARET_UP}</svg>
        </button>
      </div>
    );
  }

  return (
    <div className={`${styles.cd} ${demo ? styles.isDemo : ""}`} style={vars}>
      <div className={styles.ring} style={ringVars}>
        <span className={styles.hole}>
          <span className={styles.num}>{pad(Math.floor(shown / 60))}:{pad(shown % 60)}</span>
          {demoFrames.map((t, i) => (
            <span className={styles.f} data-k={i + 1} key={t}>{t}</span>
          ))}
        </span>
      </div>

      <div className={styles.side}>
        <span className={styles.cap}>{labels.cap}</span>
        {field("min", labels.min, labels.minUnit, labels.minUp, labels.minDown)}
        {field("sec", labels.sec, labels.secUnit, labels.secUp, labels.secDown)}
        <button className={styles.go} type="button" onClick={start}>{labels.start}</button>
      </div>
    </div>
  );
}
