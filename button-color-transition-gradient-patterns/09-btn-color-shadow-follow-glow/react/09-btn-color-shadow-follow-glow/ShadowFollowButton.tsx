// ShadowFollowButton — vanilla 판(09-btn-color-shadow-follow-glow) 의 React 포트.
// 진행도 p 하나가 바탕색·그림자 색·그림자 높이를 함께 정한다. 그림자 색은 지금 바탕색에 SHADOW_DARKEN 을 곱한 값이다.
import { useEffect, useRef } from "react";
import styles from "./ShadowFollowButton.module.scss";

type Box<T> = { current: T };
type Rgb = [number, number, number];

const SHADOW_DARKEN = 0.6;
const SHADOW_ALPHA = 0.55;
const LIFT_REST = 4;
const LIFT_HOVER = 14;
const BLUR_REST = 10;
const BLUR_HOVER = 28;
const GLOW_RATE = 6;
const START_MS = 200;
const ON_MS = 1000;
const CYCLE_MS = 2000;

function toHex(rgb: Rgb): string {
  return "#" + rgb.map((c) => ("0" + Math.round(c).toString(16)).slice(-2)).join("");
}

export default function ShadowFollowButton() {
  const btnRef = useRef<HTMLButtonElement | null>(null) as Box<HTMLButtonElement | null>;
  const hexRef = useRef<HTMLSpanElement | null>(null) as Box<HTMLSpanElement | null>;
  const yRef = useRef<HTMLElement | null>(null) as Box<HTMLElement | null>;

  useEffect(() => {
    const btn = btnRef.current;
    const hexEl = hexRef.current;
    const yEl = yRef.current;
    if (!btn || !hexEl || !yEl) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const readRgb = (name: string): Rgb => {
      let v = getComputedStyle(btn).getPropertyValue(name).trim().replace("#", "");
      if (v.length === 3) v = v.split("").map((c) => c + c).join("");
      return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)];
    };
    const from = readRgb("--c-from");
    const to = readRgb("--c-to");
    let p = 0;
    let demo = !reduce;
    let pointerIn = false;
    let kbFocus = false;
    let t0: number | null = null;
    let lastTs: number | null = null;
    let raf = 0;

    const demoOn = (now: number): boolean => demo && now >= START_MS && (now - START_MS) % CYCLE_MS < ON_MS;
    const paint = (): void => {
      const fill: Rgb = [from[0] + (to[0] - from[0]) * p, from[1] + (to[1] - from[1]) * p, from[2] + (to[2] - from[2]) * p];
      const shade: Rgb = [fill[0] * SHADOW_DARKEN, fill[1] * SHADOW_DARKEN, fill[2] * SHADOW_DARKEN];
      const lift = LIFT_REST + (LIFT_HOVER - LIFT_REST) * p;
      const blur = BLUR_REST + (BLUR_HOVER - BLUR_REST) * p;
      btn.style.background = toHex(fill);
      btn.style.boxShadow = "0 " + lift.toFixed(1) + "px " + blur.toFixed(1) + "px rgba(" +
        Math.round(shade[0]) + ", " + Math.round(shade[1]) + ", " + Math.round(shade[2]) + ", " + SHADOW_ALPHA + ")";
      hexEl.textContent = toHex(shade);
      yEl.textContent = String(Math.round(lift));
    };
    const stopDemo = (): void => { demo = false; };
    const jump = (): void => { p = pointerIn || kbFocus ? 1 : 0; paint(); };
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
      const g = demoOn(now) || pointerIn || kbFocus ? 1 : 0;
      p += (g - p) * (1 - Math.exp(-dt * GLOW_RATE));
      if (Math.abs(g - p) < 0.002) p = g;
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
      <div className={styles.bc}>
        <button className={styles.bc__btn} type="button" ref={btnRef}>구매하기</button>
        <p className={styles.bc__meta}>
          <span className={styles.bc__tag}>SHADOW</span> <span ref={hexRef}>#6f6099</span> <span className={styles.bc__tag}>Y</span> <b ref={yRef}>4</b>
        </p>
      </div>
    </main>
  );
}
