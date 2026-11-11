// TextFlipButton — vanilla 판(07-btn-color-text-contrast-flip) 의 React 포트.
// 바탕색이 어두운 색에서 밝은 색으로 옮겨 가는 동안 상대 밝기 L 을 계산해 FLIP_THRESHOLD 를 넘으면 글자색을 뒤집는다.
import { useEffect, useRef } from "react";
import styles from "./TextFlipButton.module.scss";

type Box<T> = { current: T };
type Rgb = [number, number, number];

const FLIP_THRESHOLD = 0.179;
const FILL_RATE = 4;
const START_MS = 200;
const ON_MS = 1000;
const CYCLE_MS = 2000;

function toHex(rgb: Rgb): string {
  return "#" + rgb.map((c) => ("0" + Math.round(c).toString(16)).slice(-2)).join("");
}
function channel(c: number): number {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}
function luminance(rgb: Rgb): number {
  return 0.2126 * channel(rgb[0]) + 0.7152 * channel(rgb[1]) + 0.0722 * channel(rgb[2]);
}
function ratio(a: number, b: number): number {
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

export default function TextFlipButton() {
  const rootRef = useRef<HTMLDivElement | null>(null) as Box<HTMLDivElement | null>;
  const btnRef = useRef<HTMLButtonElement | null>(null) as Box<HTMLButtonElement | null>;
  const lumRef = useRef<HTMLElement | null>(null) as Box<HTMLElement | null>;
  const ratioRef = useRef<HTMLElement | null>(null) as Box<HTMLElement | null>;

  useEffect(() => {
    const btn = btnRef.current;
    const lumEl = lumRef.current;
    const ratioEl = ratioRef.current;
    if (!btn || !lumEl || !ratioEl) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const readRgb = (name: string): Rgb => {
      let v = getComputedStyle(btn).getPropertyValue(name).trim().replace("#", "");
      if (v.length === 3) v = v.split("").map((c) => c + c).join("");
      return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)];
    };
    const from = readRgb("--c-from");
    const to = readRgb("--c-to");
    const textLight = readRgb("--t-light");
    const textDark = readRgb("--t-dark");
    const lumLight = luminance(textLight);
    const lumDark = luminance(textDark);
    let cur: Rgb = [from[0], from[1], from[2]];
    let demo = !reduce;
    let pointerIn = false;
    let kbFocus = false;
    let t0: number | null = null;
    let lastTs: number | null = null;
    let raf = 0;

    const demoOn = (now: number): boolean => demo && now >= START_MS && (now - START_MS) % CYCLE_MS < ON_MS;
    const paint = (): void => {
      const l = luminance(cur);
      const dark = l > FLIP_THRESHOLD;
      btn.style.background = toHex(cur);
      btn.style.color = toHex(dark ? textDark : textLight);
      lumEl.textContent = l.toFixed(2);
      ratioEl.textContent = ratio(l, dark ? lumDark : lumLight).toFixed(1);
    };
    const stopDemo = (): void => { demo = false; };
    const jump = (): void => {
      const g = pointerIn || kbFocus ? to : from;
      cur = [g[0], g[1], g[2]];
      paint();
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
      const g = demoOn(now) || pointerIn || kbFocus ? to : from;
      const k = 1 - Math.exp(-dt * FILL_RATE);
      const next: Rgb = [cur[0] + (g[0] - cur[0]) * k, cur[1] + (g[1] - cur[1]) * k, cur[2] + (g[2] - cur[2]) * k];
      const gap = Math.abs(g[0] - next[0]) + Math.abs(g[1] - next[1]) + Math.abs(g[2] - next[2]);
      cur = gap < 0.5 ? [g[0], g[1], g[2]] : next;
      paint();
      raf = requestAnimationFrame(tick);
    }

    if (reduce) paint();
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
        <button className={styles.bc__btn} type="button" ref={btnRef}>읽히는 글자</button>
        <p className={styles.bc__meta}>
          <span className={styles.bc__tag}>L</span> <b ref={lumRef}>0.01</b> <span className={styles.bc__tag}>RATIO</span> <b ref={ratioRef}>17.0</b><span>:1</span>
        </p>
      </div>
    </main>
  );
}
