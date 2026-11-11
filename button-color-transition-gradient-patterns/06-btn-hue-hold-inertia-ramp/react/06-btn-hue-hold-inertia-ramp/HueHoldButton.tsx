// HueHoldButton — vanilla 판(06-btn-hue-hold-inertia-ramp) 의 React 포트.
// 누르는 동안 색상 각속도가 가속하고(MAX_SPEED 상한), 떼면 FRICTION 으로 줄어 멈춘다.
import { useEffect, useRef } from "react";
import styles from "./HueHoldButton.module.scss";

type Box<T> = { current: T };
type PointerLike = Event & { pointerId: number };
type KeyLike = Event & { key: string; repeat: boolean };

const ACCEL = 600;
const MAX_SPEED = 720;
const FRICTION = 2.4;
const HUE_START = 270;
const HUE_STEP = 60;
const START_MS = 200;
const HOLD_MS = 900;
const CYCLE_MS = 2000;

export default function HueHoldButton() {
  const btnRef = useRef<HTMLButtonElement | null>(null) as Box<HTMLButtonElement | null>;
  const hueRef = useRef<HTMLElement | null>(null) as Box<HTMLElement | null>;
  const speedRef = useRef<HTMLElement | null>(null) as Box<HTMLElement | null>;

  useEffect(() => {
    const btn = btnRef.current;
    const hueEl = hueRef.current;
    const speedEl = speedRef.current;
    if (!btn || !hueEl || !speedEl) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let hue = HUE_START;
    let speed = 0;
    let pressed = false;
    let demo = !reduce;
    let t0: number | null = null;
    let lastTs: number | null = null;
    let raf = 0;

    const paint = (): void => {
      btn.style.setProperty("--hue", hue.toFixed(1));
      hueEl.textContent = String(Math.round(hue));
      speedEl.textContent = String(Math.round(speed));
    };
    const press = (): void => {
      demo = false;
      pressed = true;
      if (reduce) { hue = (hue + HUE_STEP) % 360; paint(); }
    };
    const release = (): void => { pressed = false; };
    const onDown = (e: Event): void => {
      try { btn.setPointerCapture((e as PointerLike).pointerId); } catch (err) { /* 캡처를 못 걸어도 누름은 동작한다 */ }
      press();
    };
    const onKeyDown = (e: Event): void => {
      const k = e as KeyLike;
      if ((k.key === " " || k.key === "Enter") && !k.repeat) press();
    };
    const onKeyUp = (e: Event): void => {
      const k = e as KeyLike;
      if (k.key === " " || k.key === "Enter") release();
    };
    btn.addEventListener("pointerdown", onDown);
    btn.addEventListener("pointerup", release);
    btn.addEventListener("pointercancel", release);
    btn.addEventListener("blur", release);
    btn.addEventListener("keydown", onKeyDown);
    btn.addEventListener("keyup", onKeyUp);

    const demoPressed = (now: number): boolean => demo && now >= START_MS && (now - START_MS) % CYCLE_MS < HOLD_MS;

    function tick(ts: number): void {
      if (t0 === null) t0 = ts;
      const now = ts - t0;
      const dt = lastTs === null ? 0.016 : Math.min(0.05, (ts - lastTs) / 1000);
      lastTs = ts;
      if (demoPressed(now) || pressed) {
        speed = Math.min(MAX_SPEED, speed + ACCEL * dt);
      } else {
        speed *= Math.exp(-FRICTION * dt);
        if (speed < 0.5) speed = 0;
      }
      hue = (hue + speed * dt) % 360;
      paint();
      raf = requestAnimationFrame(tick);
    }

    if (reduce) paint();
    else raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      btn.removeEventListener("pointerdown", onDown);
      btn.removeEventListener("pointerup", release);
      btn.removeEventListener("pointercancel", release);
      btn.removeEventListener("blur", release);
      btn.removeEventListener("keydown", onKeyDown);
      btn.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.bc}>
        <button className={styles.bc__btn} type="button" ref={btnRef}>꾹 누르기</button>
        <p className={styles.bc__meta}>
          <span className={styles.bc__tag}>HUE</span> <b ref={hueRef}>270</b><span>deg</span> <span className={styles.bc__tag}>SPEED</span> <b ref={speedRef}>0</b>
        </p>
      </div>
    </main>
  );
}
