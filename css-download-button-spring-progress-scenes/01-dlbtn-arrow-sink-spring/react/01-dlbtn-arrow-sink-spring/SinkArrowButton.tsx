// SinkArrowButton — vanilla 판(01-dlbtn-arrow-sink-spring) 의 React 포트.
// 눌림 깊이와 기울기를 스프링 방정식으로 매 프레임 적분한다. CSS transition 은 쓰지 않는다.
import { useEffect, useRef } from "react";
import styles from "./SinkArrowButton.module.scss";

const SINK_PX = 10;
const SPRING_K = 120;
const SPRING_DAMP = 9;
const TILT_MAX = 14;
const START_MS = 200;
const HOLD_MS = 560;
const CYCLE_MS = 2000;

type Goal = { depth: number; lean: number };

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export default function SinkArrowButton() {
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const iconRef = useRef<SVGSVGElement | null>(null);
  const yRef = useRef<HTMLElement | null>(null);
  const tiltRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const btn = btnRef.current;
    const icon = iconRef.current;
    const yEl = yRef.current;
    const tiltEl = tiltRef.current;
    if (!btn || !icon || !yEl || !tiltEl) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let demo = !reduce;
    let y = 0;
    let vy = 0;
    let tilt = 0;
    let vt = 0;
    let pressed = false;
    let side = 0;
    let t0: number | null = null;
    let lastTs: number | null = null;
    let raf = 0;

    const goal = (now: number): Goal => {
      if (demo && now >= START_MS) {
        const ph = (now - START_MS) % CYCLE_MS;
        return { depth: ph < HOLD_MS ? SINK_PX : 0, lean: ph < HOLD_MS ? -0.8 : ph < 1100 ? 0.8 : 0 };
      }
      return { depth: pressed ? SINK_PX : 0, lean: side };
    };
    const integrate = (dt: number, g: Goal): void => {
      const n = Math.ceil(dt / 0.008);
      const h = dt / n;
      for (let i = 0; i < n; i += 1) {
        vy += (-SPRING_K * (y - g.depth) - SPRING_DAMP * vy) * h;
        y += vy * h;
        vt += (-SPRING_K * (tilt - g.lean * TILT_MAX) - SPRING_DAMP * vt) * h;
        tilt += vt * h;
      }
    };
    const render = (): void => {
      const p = clamp(y / SINK_PX, -0.3, 1);
      icon.style.transform = `translateY(${y.toFixed(2)}px) rotate(${tilt.toFixed(2)}deg)`;
      btn.style.transform = `translateY(${(y * 0.3).toFixed(2)}px)`;
      btn.style.setProperty("--p", p.toFixed(3));
      yEl.textContent = y.toFixed(1);
      tiltEl.textContent = tilt.toFixed(1);
    };
    const snap = (): void => {
      const g = goal(0);
      y = g.depth; vy = 0; tilt = g.lean * TILT_MAX; vt = 0;
      render();
    };
    const press = (): void => { demo = false; pressed = true; if (reduce) snap(); };
    const release = (): void => { pressed = false; if (reduce) snap(); };

    const onDown = (e: PointerEvent): void => {
      const r = btn.getBoundingClientRect();
      side = clamp((e.clientX - r.left - r.width / 2) / (r.width / 2), -1, 1);
      press();
    };
    const onKeyDown = (e: KeyboardEvent): void => {
      if ((e.key === "Enter" || e.key === " ") && !e.repeat) { side = 0; press(); }
    };
    const onKeyUp = (e: KeyboardEvent): void => { if (e.key === "Enter" || e.key === " ") release(); };
    btn.addEventListener("pointerdown", onDown);
    btn.addEventListener("pointerup", release);
    btn.addEventListener("pointerleave", release);
    btn.addEventListener("pointercancel", release);
    btn.addEventListener("keydown", onKeyDown);
    btn.addEventListener("keyup", onKeyUp);
    btn.addEventListener("blur", release);

    function tick(ts: number): void {
      if (t0 === null) t0 = ts;
      const now = ts - t0;
      const dt = lastTs === null ? 0.016 : Math.min(0.05, (ts - lastTs) / 1000);
      lastTs = ts;
      integrate(dt, goal(now));
      render();
      raf = requestAnimationFrame(tick);
    }

    if (reduce) render();
    else raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      btn.removeEventListener("pointerdown", onDown);
      btn.removeEventListener("pointerup", release);
      btn.removeEventListener("pointerleave", release);
      btn.removeEventListener("pointercancel", release);
      btn.removeEventListener("keydown", onKeyDown);
      btn.removeEventListener("keyup", onKeyUp);
      btn.removeEventListener("blur", release);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.sk}>
        <button className={styles.sk__btn} type="button" ref={btnRef}>
          <svg className={styles.sk__icon} viewBox="0 0 24 24" aria-hidden="true" ref={iconRef}>
            <path d="M12 4v11M6.5 10.5 12 16l5.5-5.5M5 20h14" />
          </svg>
          <span>내려받기</span>
        </button>
        <p className={styles.sk__meta}>
          <span className={styles.sk__tag}>Y</span> <b ref={yRef}>0.0</b> <span className={styles.sk__tag}>TILT</span> <b ref={tiltRef}>0.0</b>
        </p>
      </div>
    </main>
  );
}
