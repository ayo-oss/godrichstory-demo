// PullColorButton — vanilla 판(01-btn-color-exp-ease-fill) 의 React 포트.
// 현재 색이 목표 색까지 남은 거리의 일정 비율(PULL_RATE)만큼 매 프레임 다가간다. CSS transition 은 쓰지 않는다.
import { useEffect, useRef } from "react";
import styles from "./PullColorButton.module.scss";

type Box<T> = { current: T };
type Rgb = [number, number, number];

const PULL_RATE = 7;
const SETTLE_GAP = 0.5;
const START_MS = 200;
const ON_MS = 900;
const CYCLE_MS = 2000;

function toHex(rgb: Rgb): string {
  return "#" + rgb.map((c) => ("0" + Math.round(c).toString(16)).slice(-2)).join("");
}

export default function PullColorButton() {
  const rootRef = useRef<HTMLDivElement | null>(null) as Box<HTMLDivElement | null>;
  const btnRef = useRef<HTMLButtonElement | null>(null) as Box<HTMLButtonElement | null>;
  const gapRef = useRef<HTMLElement | null>(null) as Box<HTMLElement | null>;
  const hexRef = useRef<HTMLSpanElement | null>(null) as Box<HTMLSpanElement | null>;

  useEffect(() => {
    const btn = btnRef.current;
    const gapEl = gapRef.current;
    const hexEl = hexRef.current;
    if (!btn || !gapEl || !hexEl) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const readRgb = (name: string): Rgb => {
      let v = getComputedStyle(btn).getPropertyValue(name).trim().replace("#", "");
      if (v.length === 3) v = v.split("").map((c) => c + c).join("");
      return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)];
    };
    const from = readRgb("--c-from");
    const to = readRgb("--c-to");
    let cur: Rgb = [from[0], from[1], from[2]];
    let demo = !reduce;
    let pointerIn = false;
    let kbFocus = false;
    let t0: number | null = null;
    let lastTs: number | null = null;
    let raf = 0;

    const demoOn = (now: number): boolean => demo && now >= START_MS && (now - START_MS) % CYCLE_MS < ON_MS;
    const gapOf = (goal: Rgb): number =>
      Math.abs(goal[0] - cur[0]) + Math.abs(goal[1] - cur[1]) + Math.abs(goal[2] - cur[2]);
    const paint = (goal: Rgb): void => {
      btn.style.background = toHex(cur);
      gapEl.textContent = String(Math.round(gapOf(goal)));
      hexEl.textContent = toHex(cur);
    };
    const stopDemo = (): void => { demo = false; };
    const jump = (): void => {
      const goal = pointerIn || kbFocus ? to : from;
      cur = [goal[0], goal[1], goal[2]];
      paint(goal);
    };

    const onEnter = (): void => { stopDemo(); pointerIn = true; if (reduce) jump(); };
    const onLeave = (): void => { pointerIn = false; if (reduce) jump(); };
    const onFocus = (): void => { kbFocus = btn.matches(":focus-visible"); if (kbFocus) stopDemo(); if (reduce) jump(); };
    const onBlur = (): void => { kbFocus = false; if (reduce) jump(); };
    btn.addEventListener("pointerenter", onEnter);
    btn.addEventListener("pointerleave", onLeave);
    btn.addEventListener("focus", onFocus);
    btn.addEventListener("blur", onBlur);

    function tick(ts: number): void {
      if (t0 === null) t0 = ts;
      const now = ts - t0;
      const dt = lastTs === null ? 0.016 : Math.min(0.05, (ts - lastTs) / 1000);
      lastTs = ts;
      const goal = demoOn(now) || pointerIn || kbFocus ? to : from;
      const k = 1 - Math.exp(-dt * PULL_RATE);
      cur = [cur[0] + (goal[0] - cur[0]) * k, cur[1] + (goal[1] - cur[1]) * k, cur[2] + (goal[2] - cur[2]) * k];
      if (gapOf(goal) < SETTLE_GAP) cur = [goal[0], goal[1], goal[2]];
      paint(goal);
      raf = requestAnimationFrame(tick);
    }

    if (reduce) paint(from);
    else raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      btn.removeEventListener("pointerenter", onEnter);
      btn.removeEventListener("pointerleave", onLeave);
      btn.removeEventListener("focus", onFocus);
      btn.removeEventListener("blur", onBlur);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.bc} ref={rootRef}>
        <button className={styles.bc__btn} type="button" ref={btnRef}>저장하기</button>
        <p className={styles.bc__meta}>
          <span className={styles.bc__tag}>GAP</span> <b ref={gapRef}>0</b> <span className={styles.bc__hex} ref={hexRef}>#b9a0ff</span>
        </p>
      </div>
    </main>
  );
}
