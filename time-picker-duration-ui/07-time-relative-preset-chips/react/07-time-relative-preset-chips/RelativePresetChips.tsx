import { useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./RelativePresetChips.module.scss";

type KeyEvt = { key: string; preventDefault(): void };
type Box<T> = { current: T };
type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export type Preset = { label: string; add?: number; at?: number };

export type RelativePresetChipsProps = {
  /** 기준 시각 — 자정부터의 분. 데모라 지금 시각이 아니라 고정값이다 */
  base?: number;
  presets?: Preset[];
  /** [오늘, 내일] 꼴 — {t} 자리에 계산한 시각이 들어간다 */
  dayTemplates?: [string, string];
  baseLabel?: string;
  outLabel?: string;
  groupLabel?: string;
  duration?: number;
  easing?: string;
  color?: string;
};

const ALARM = (
  <g fill="currentColor">
    <path d="M216 136a88 88 0 1 1-88-88a88 88 0 0 1 88 88" opacity=".2" />
    <path d="M128 40a96 96 0 1 0 96 96a96.11 96.11 0 0 0-96-96m0 176a80 80 0 1 1 80-80a80.09 80.09 0 0 1-80 80M61.66 37.66l-32 32a8 8 0 0 1-11.32-11.32l32-32a8 8 0 0 1 11.32 11.32m176 32a8 8 0 0 1-11.32 0l-32-32a8 8 0 0 1 11.32-11.32l32 32a8 8 0 0 1 0 11.32M184 128a8 8 0 0 1 0 16h-56a8 8 0 0 1-8-8V80a8 8 0 0 1 16 0v48Z" />
  </g>
);

function pad(n: number) {
  return (n < 10 ? "0" : "") + n;
}

function clockOf(m: number, tpl: [string, string]) {
  const day = m >= 1440 ? 1 : 0;
  const t = m % 1440;
  return tpl[day].replace("{t}", pad(Math.floor(t / 60)) + ":" + pad(t % 60));
}

export default function RelativePresetChips({
  base = 14 * 60 + 40,
  presets = [
    { label: "In 10 min", add: 10 },
    { label: "In 1 hour", add: 60 },
    { label: "This evening", at: 18 * 60 },
    { label: "Tomorrow morning", at: 32 * 60 },
  ],
  dayTemplates = ["Today {t}", "Tomorrow {t}"],
  baseLabel = "Base time",
  outLabel = "Reminder at",
  groupLabel = "Relative time presets",
  duration = 220,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#fff7e6",
}: RelativePresetChipsProps) {
  const minutesOf = (p: Preset) => (p.add === undefined ? (p.at ?? 0) : base + p.add);
  const [demo, setDemo] = useState(true);
  const [sel, setSel] = useState(0);
  const [cur, setCur] = useState(() => clockOf(minutesOf(presets[0]), dayTemplates));
  const [next, setNext] = useState("");
  const [rolling, setRolling] = useState(false);
  const [live, setLive] = useState("");
  const chips = useRef<(HTMLButtonElement | null)[]>([]) as Box<(HTMLButtonElement | null)[]>;
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  // 칩마다 더할 분(add)이나 절대 분(at)이 적혀 있고, 결과 시각은 그때그때 계산한다
  function pick(i: number) {
    setDemo(false);
    setSel(i);
    const t = clockOf(minutesOf(presets[i]), dayTemplates);
    setLive(t);
    if (t === cur) return;
    setNext(t);
    setRolling(false);
    requestAnimationFrame(() => setRolling(true)); // 같은 값이 아니면 언제나 한 번 더 굴러야 한다
  }

  function onKey(e: KeyEvt, i: number) {
    const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    const j = (i + d + presets.length) % presets.length;
    const el = chips.current[j];
    if (el) el.focus({ preventScroll: true });
    pick(j);
  }

  return (
    <div className={`${styles.rp} ${demo ? styles.isDemo : ""}`} style={vars}>
      <p className={styles.base}>
        <span className={styles.baseLab}>{baseLabel}</span>
        <time className={styles.baseNum} dateTime={pad(Math.floor(base / 60)) + ":" + pad(base % 60)}>
          {pad(Math.floor(base / 60))}:{pad(base % 60)}
        </time>
      </p>

      <div className={styles.chips} role="group" aria-label={groupLabel}>
        {presets.map((p, i) => (
          <button
            key={p.label}
            className={styles.chip}
            type="button"
            data-i={i}
            aria-pressed={sel === i}
            ref={(el: HTMLButtonElement | null) => {
              chips.current[i] = el;
            }}
            onClick={() => pick(i)}
            onKeyDown={(e: KeyEvt) => onKey(e, i)}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className={styles.out}>
        <span className={styles.cap}>
          <span className={styles.ic} aria-hidden="true">
            <svg viewBox="0 0 256 256" width="14" height="14">{ALARM}</svg>
          </span>
          <span>{outLabel}</span>
        </span>
        <span className={`${styles.slot} ${rolling ? styles.isRoll : ""}`}>
          <span className={`${styles.val} ${styles.valCur}`}>{cur}</span>
          <span
            className={`${styles.val} ${styles.valNext}`}
            onTransitionEnd={() => {
              setCur(next); // 굴러 올라온 값이 확정 값이 된다
              setRolling(false);
            }}
          >
            {next}
          </span>
          <span className={styles.f} data-k="a">{clockOf(minutesOf(presets[0]), dayTemplates)}</span>
          <span className={styles.f} data-k="b">{clockOf(minutesOf(presets[3]), dayTemplates)}</span>
        </span>
      </div>

      <p className={styles.live} aria-live="polite">{live}</p>
    </div>
  );
}
