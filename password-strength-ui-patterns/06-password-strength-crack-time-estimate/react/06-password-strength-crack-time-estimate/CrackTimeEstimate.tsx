import { useEffect, useRef } from "react";
import styles from "./CrackTimeEstimate.module.scss";

type Box<T> = { current: T };

// 가정값: 데모 안 임의 상수 — 실제 하드웨어·연도·연구 인용이 아니다.
const GUESSES_PER_SEC = 1e6;
const LOG_MAX = 12;

type Unit = { at: number; name: string; div?: number };
const UNITS: Unit[] = [
  { at: 1, name: "초" },
  { at: 60, name: "분", div: 60 },
  { at: 3600, name: "시간", div: 3600 },
  { at: 86400, name: "일", div: 86400 },
  { at: 31536000, name: "년", div: 31536000 },
  { at: 31536000 * 100, name: "세기", div: 31536000 * 100 },
];

export default function CrackTimeEstimate() {
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement | null>;

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const input = root.querySelector(`.${styles.input}`) as HTMLInputElement | null;
    const timeEl = root.querySelector(`.${styles.time}`) as HTMLElement | null;
    const fill = root.querySelector(`.${styles.fill}`) as HTMLElement | null;
    const guessesEl = root.querySelector(`.${styles.guesses}`) as HTMLElement | null;
    if (!input || !timeEl || !fill || !guessesEl) return;

    function charsetSize(value: string) {
      let size = 0;
      if (/[a-z]/.test(value)) size += 26;
      if (/[A-Z]/.test(value)) size += 26;
      if (/[0-9]/.test(value)) size += 10;
      if (/[^A-Za-z0-9]/.test(value)) size += 32;
      return size;
    }

    // 계산 겹: 문자 집합 크기의 글자 수 제곱으로 경우의 수를 구하고, 가정 초당
    // 시도 수로 나눠 초 값을 만든 뒤, 자리 단위(초→분→시간→일→년→세기)로 변환한다.
    function guessesOf(value: string) {
      const size = charsetSize(value);
      if (!value.length || size === 0) return 0;
      return Math.pow(size, value.length);
    }

    function formatTime(seconds: number) {
      if (seconds < 1) return "즉시";
      let pick = UNITS[0];
      for (let i = 0; i < UNITS.length; i++) if (seconds >= UNITS[i].at) pick = UNITS[i];
      const div = pick.div || 1;
      const n = seconds / div;
      const text = n >= 100 ? Math.round(n).toLocaleString() : (Math.round(n * 10) / 10).toString();
      return "약 " + text + pick.name;
    }

    function paint(value: string) {
      const guesses = guessesOf(value);
      const seconds = guesses / GUESSES_PER_SEC;
      timeEl!.textContent = formatTime(seconds);
      const mag = seconds < 1 ? 0 : Math.log(seconds + 1) / Math.LN10;
      fill!.style.transform = "scaleX(" + Math.max(0, Math.min(1, mag / LOG_MAX)) + ")";
      guessesEl!.textContent = guesses >= 1e6 ? guesses.toExponential(1) : Math.round(guesses).toLocaleString();
    }

    function onInput() {
      root!.classList.remove(styles["is-demo"]);
      stopAutoplay();
      paint(input!.value);
    }
    input.addEventListener("input", onInput);
    paint(input.value);

    // 자동 루프: 시드 고정 문자열 배열로 길이·문자 종류를 함께 늘렸다 줄인다.
    const SEQ = ["", "ab", "abcd12", "abcd12EF", "abcd12EF!@", "abcd12EF!@#$xy",
      "abcd12EF!@", "abcd12EF", "abcd12", "ab", ""];
    let si = 0;
    let autoTimer: number | null = null;
    function autoTick() { input!.value = SEQ[si]; paint(SEQ[si]); si = (si + 1) % SEQ.length; }
    function stopAutoplay() { if (autoTimer !== null) { window.clearInterval(autoTimer); autoTimer = null; } }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) { autoTimer = window.setInterval(autoTick, 380); autoTick(); }

    return () => {
      stopAutoplay();
      input.removeEventListener("input", onInput);
    };
  }, []);

  return (
    <div ref={rootRef} className={`${styles.stage} ${styles.ct} ${styles["is-demo"]}`}>
      <label className={styles.field}>
        <input className={styles.input} type="text" autoComplete="off" spellCheck={false} defaultValue="" />
      </label>
      <div className={styles.readout}>
        <span className={styles.time}>즉시</span>
      </div>
      <div className={styles.track}><div className={styles.fill} /></div>
      <div className={styles.meta}>경우의 수 <b className={styles.guesses}>0</b></div>
    </div>
  );
}
