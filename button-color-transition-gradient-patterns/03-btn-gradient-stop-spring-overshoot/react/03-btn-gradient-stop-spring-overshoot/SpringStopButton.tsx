// SpringStopButton — vanilla 판(03-btn-gradient-stop-spring-overshoot) 의 React 포트.
// 그라데이션 색 경계 위치(--stop)를 스프링 방정식으로 푼다. 목표를 지나쳤다가 돌아와 안착한다.
import { useEffect, useRef } from "react";
import styles from "./SpringStopButton.module.scss";

type Box<T> = { current: T };

const STIFFNESS = 170;
const DAMPING = 11;
const STOP_REST = 20;
const STOP_HOVER = 70;
const STEP = 1 / 120;
const START_MS = 200;
const ON_MS = 800;
const CYCLE_MS = 2000;

export default function SpringStopButton() {
  const btnRef = useRef<HTMLButtonElement | null>(null) as Box<HTMLButtonElement | null>;
  const posRef = useRef<HTMLElement | null>(null) as Box<HTMLElement | null>;

  useEffect(() => {
    const btn = btnRef.current;
    const posEl = posRef.current;
    if (!btn || !posEl) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let pos = STOP_REST;
    let vel = 0;
    let acc = 0;
    let demo = !reduce;
    let pointerIn = false;
    let kbFocus = false;
    let t0: number | null = null;
    let lastTs: number | null = null;
    let raf = 0;

    const demoOn = (now: number): boolean => demo && now >= START_MS && (now - START_MS) % CYCLE_MS < ON_MS;
    const paint = (): void => {
      btn.style.setProperty("--stop", pos.toFixed(2));
      posEl.textContent = String(Math.round(pos));
    };
    const stopDemo = (): void => { demo = false; };
    const jump = (): void => { pos = pointerIn || kbFocus ? STOP_HOVER : STOP_REST; vel = 0; paint(); };
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
      const g = demoOn(now) || pointerIn || kbFocus ? STOP_HOVER : STOP_REST;
      acc += dt;
      while (acc >= STEP) {
        vel += (STIFFNESS * (g - pos) - DAMPING * vel) * STEP;
        pos += vel * STEP;
        acc -= STEP;
      }
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
        <button className={styles.bc__btn} type="button" ref={btnRef}>다음 단계</button>
        <p className={styles.bc__meta}><span className={styles.bc__tag}>STOP</span> <b ref={posRef}>20</b><span>%</span></p>
      </div>
    </main>
  );
}
