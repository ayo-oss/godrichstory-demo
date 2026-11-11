// ContrastChecker — vanilla 판(run/286/demo/07-color-picker-contrast-checker) 의 React 포트.
// 변수 3개(duration·easing·color)는 props 로 받아 CSS 변수(var(--duration) 등)로 들어온다.
// 상태는 배경색 hex 문자열 하나뿐이다. 비율 숫자는 JS 가 글자로 쓰지 않는다 —
// 정수부(--rw)와 소수 두 자리(--rf)만 넘기면 module.scss 의 counter-set 이 4.53 꼴로 찍는다.
import { useState } from "react";
import type { CSSProperties, ChangeEvent } from "react";
import styles from "./ContrastChecker.module.scss";

export type ContrastCheckerProps = {
  sampleText?: string;
  passWord?: string;
  failWord?: string;
  inputLabel?: string;
  /** "명암비 %r 대 1, AA %a, AAA %b" 처럼 자리표시자 셋을 가진 틀 */
  liveFormat?: string;
  /** 격자 미리보기용 2초 자동 루프. 사람이 손대면 꺼진다 */
  demo?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & {
  "--duration"?: string;
  "--easing"?: string;
  "--color"?: string;
  "--bg"?: string;
  "--rw"?: number;
  "--rf"?: number;
  "--aa"?: number;
  "--aaa"?: number;
};

const SWATCHES = ["#8aa9ff", "#4d8bf0", "#2f6df6", "#1f4fb8", "#17141a"];
const INK = "#17141a";

// WCAG 2.x 상대 휘도 — 채널마다 감마를 되돌린 뒤 사람 눈의 민감도로 가중한다
function channel(c: number): number {
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const r = channel(((n >> 16) & 255) / 255);
  const g = channel(((n >> 8) & 255) / 255);
  const b = channel((n & 255) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// 글자는 흰색 고정이므로 밝은 쪽 휘도는 언제나 1 이다
function ratioToWhite(hex: string): number {
  return 1.05 / (luminance(hex) + 0.05);
}

function ratioToInk(hex: string): number {
  return (luminance(hex) + 0.05) / (luminance(INK) + 0.05);
}

function twoDigits(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export default function ContrastChecker({
  sampleText = "본문 글자 견본",
  passWord = "통과",
  failWord = "미달",
  inputLabel = "배경색 직접 고르기",
  liveFormat = "명암비 %r 대 1, AA %a, AAA %b",
  demo = true,
  duration = 2000,
  easing = "cubic-bezier(.2, 1.4, .4, 1)",
  color = "#2f6df6",
}: ContrastCheckerProps) {
  const [live, setLive] = useState(demo);
  const [bg, setBg] = useState("#2f6df6");

  const ratio = ratioToWhite(bg);
  let whole = Math.floor(ratio);
  let frac = Math.round((ratio - whole) * 100);
  if (frac === 100) {
    whole += 1;
    frac = 0;
  }
  const passesAa = ratio >= 4.5;
  const passesAaa = ratio >= 7;

  const vars: Vars = {
    "--duration": `${duration}ms`,
    "--easing": easing,
    "--color": color,
    "--bg": bg,
    "--rw": whole,
    "--rf": frac,
    "--aa": passesAa ? 1 : 0,
    "--aaa": passesAaa ? 1 : 0,
  };

  const liveText = liveFormat
    .replace("%r", `${whole}.${twoDigits(frac)}`)
    .replace("%a", passesAa ? passWord : failWord)
    .replace("%b", passesAaa ? passWord : failWord);

  function pick(hex: string) {
    setLive(false);
    setBg(hex);
  }

  function onInput(e: ChangeEvent<HTMLInputElement>) {
    setLive(false);
    setBg(e.target.value);
  }

  function badge(kind: "aa" | "aaa", grade: string) {
    return (
      <span
        className={[styles.badge, kind === "aa" ? styles.badgeAa : styles.badgeAaa].join(" ")}
        aria-hidden="true"
      >
        <b className={styles.grade}>{grade}</b>
        <span className={styles.state}>
          <i className={styles.pass}>{passWord}</i>
          <i className={styles.fail}>{failWord}</i>
        </span>
      </span>
    );
  }

  return (
    <div className={[styles.cc, live ? styles.isDemo : ""].filter(Boolean).join(" ")} style={vars}>
      <div className={styles.prev}>
        <span className={styles.sample}>{sampleText}</span>
        <span className={styles.ratio} aria-hidden="true" />
      </div>
      <div className={styles.row}>
        {badge("aa", "AA")}
        {badge("aaa", "AAA")}
        <input
          className={styles.input}
          type="color"
          value={bg}
          aria-label={inputLabel}
          onChange={onInput}
        />
      </div>
      <div className={styles.sws}>
        {SWATCHES.map((hex) => (
          <button
            key={hex}
            type="button"
            className={styles.sw}
            style={{ background: hex, color: ratioToWhite(hex) >= ratioToInk(hex) ? "#ffffff" : INK }}
            onClick={() => pick(hex)}
          >
            {`${Math.floor(ratioToWhite(hex))}.${twoDigits(Math.round((ratioToWhite(hex) % 1) * 100))}`}
          </button>
        ))}
      </div>
      <span className={styles.liveRegion} aria-live="polite">
        {liveText}
      </span>
    </div>
  );
}
