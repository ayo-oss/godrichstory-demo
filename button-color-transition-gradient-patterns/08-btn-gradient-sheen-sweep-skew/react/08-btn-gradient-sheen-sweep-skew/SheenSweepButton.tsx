// SheenSweepButton — vanilla 판(08-btn-gradient-sheen-sweep-skew) 의 React 포트.
// hover 가 시작되면 기울어진 밝은 띠가 SWEEP_MS 동안 한 번 지나간다. 위치는 smoothstep, 세기는 사인 반 주기.
import { useEffect, useRef } from "react";
import styles from "./SheenSweepButton.module.scss";

type Box<T> = { current: T };

const SWEEP_MS = 700;
const BAND_FROM = -30;
const BAND_TO = 130;
const PEAK_GLOW = 0.7;
const START_MS = 200;
const ON_MS = 900;
const CYCLE_MS = 2000;

export default function SheenSweepButton() {
  const btnRef = useRef<HTMLButtonElement | null>(null) as Box<HTMLButtonElement | null>;
  const xRef = useRef<HTMLElement | null>(null) as Box<HTMLElement | null>;
  const aRef = useRef<HTMLElement | null>(null) as Box<HTMLElement | null>;

  useEffect(() => {
    const btn = btnRef.current;
    const xEl = xRef.current;
    const aEl = aRef.current;
    if (!btn || !xEl || !aEl) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let demo = !reduce;
    let pointerIn = false;
    let kbFocus = false;
    let wasOn = false;
    let sweepAt = -1;
    let t0: number | null = null;
    let raf = 0;

    const demoOn = (now: number): boolean => demo && now >= START_MS && (now - START_MS) % CYCLE_MS < ON_MS;
    const paint = (x: number, glow: number): void => {
      btn.style.setProperty("--x", x.toFixed(1));
      btn.style.setProperty("--glow", glow.toFixed(3));
      xEl.textContent = String(Math.round(x));
      aEl.textContent = glow.toFixed(2);
    };
    const stopDemo = (): void => { demo = false; };
    const staticState = (): void => {
      if (pointerIn || kbFocus) paint(50, 0.5);
      else paint(BAND_FROM, 0);
    };
    const onEnter = (): void => { stopDemo(); pointerIn = true; if (reduce) staticState(); };
    const onLeave = (): void => { pointerIn = false; if (reduce) staticState(); };
    const onFocus = (): void => { kbFocus = btn.matches(":focus-visible"); if (kbFocus) stopDemo(); if (reduce) staticState(); };
    const onBlur = (): void => { kbFocus = false; if (reduce) staticState(); };
    btn.addEventListener("pointerenter", onEnter);
    btn.addEventListener("pointerleave", onLeave);
    btn.addEventListener("focus", onFocus);
    btn.addEventListener("blur", onBlur);

    function tick(ts: number): void {
      if (t0 === null) t0 = ts;
      const now = ts - t0;
      const on = demoOn(now) || pointerIn || kbFocus;
      if (on && !wasOn) sweepAt = now;
      wasOn = on;
      const p = sweepAt < 0 ? 1 : Math.min(1, (now - sweepAt) / SWEEP_MS);
      const eased = p * p * (3 - 2 * p);
      if (p >= 1) paint(BAND_FROM, 0);
      else paint(BAND_FROM + (BAND_TO - BAND_FROM) * eased, PEAK_GLOW * Math.sin(Math.PI * p));
      raf = requestAnimationFrame(tick);
    }

    if (reduce) staticState();
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
        <button className={styles.bc__btn} type="button" ref={btnRef}>시작하기</button>
        <p className={styles.bc__meta}>
          <span className={styles.bc__tag}>BAND</span> <b ref={xRef}>-30</b><span>%</span> <span className={styles.bc__tag}>GLOW</span> <b ref={aRef}>0.00</b>
        </p>
      </div>
    </main>
  );
}
