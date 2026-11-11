// LiquidLevelButton — vanilla 판(05-dlbtn-liquid-level-wave) 의 React 포트.
// 수위는 목표 진행률을 지수 보간(LEVEL_LERP)으로 따라가고, 수면은 사인 두 개의 합성이며 물이 찰수록 진폭이 줄어든다.
import { useEffect, useRef } from "react";
import styles from "./LiquidLevelButton.module.scss";

const WAVE_AMP = 6;
const WAVE_FREQ = 2;
const LEVEL_LERP = 6;
const RUN_MS = 1500;
const START_MS = 200;
const CYCLE_MS = 2000;
const W = 240;
const H = 72;
const POINTS = 48;

export default function LiquidLevelButton() {
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const pathRef = useRef<SVGPathElement | null>(null);
  const labelRef = useRef<HTMLSpanElement | null>(null);
  const pctRef = useRef<HTMLElement | null>(null);
  const levelRef = useRef<HTMLElement | null>(null);
  const ampRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const btn = btnRef.current;
    const pathEl = pathRef.current;
    const labelEl = labelRef.current;
    const pctEl = pctRef.current;
    const levelEl = levelRef.current;
    const ampEl = ampRef.current;
    if (!btn || !pathEl || !labelEl || !pctEl || !levelEl || !ampEl) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let demo = !reduce;
    let clock = 0;
    let runStart: number | null = null;
    let level = 0;
    let t0: number | null = null;
    let lastTs: number | null = null;
    let raf = 0;

    const progressAt = (now: number): number => {
      const s = demo
        ? now < START_MS ? null : START_MS + Math.floor((now - START_MS) / CYCLE_MS) * CYCLE_MS
        : runStart;
      return s === null ? 0 : Math.max(0, Math.min(1, (now - s) / RUN_MS));
    };
    const draw = (phase: number): void => {
      const reach = WAVE_AMP * 1.5;
      const base = -reach + (H + 2 * reach) * (1 - level);
      const amp = WAVE_AMP * (1 - 0.7 * level);
      let d = "M0 " + H;
      for (let i = 0; i <= POINTS; i += 1) {
        const x = (i / POINTS) * W;
        const a = 2 * Math.PI * WAVE_FREQ * (x / W);
        const y = base + amp * (Math.sin(a + phase) + 0.5 * Math.sin(2 * a - 1.3 * phase));
        d += "L" + x.toFixed(1) + " " + y.toFixed(2);
      }
      d += "L" + W + " " + H + "Z";
      pathEl.setAttribute("d", d);
      pctEl.textContent = Math.round(level * 100) + "%";
      labelEl.textContent = level > 0.995 ? "완료" : level > 0.01 ? "받는 중" : "내려받기";
      levelEl.textContent = level.toFixed(2);
      ampEl.textContent = amp.toFixed(1);
    };
    const activate = (): void => {
      demo = false;
      if (reduce) { level = 1; draw(0); return; }
      if (runStart !== null && clock - runStart < RUN_MS) return;
      runStart = clock;
    };
    btn.addEventListener("click", activate);

    function tick(ts: number): void {
      if (t0 === null) t0 = ts;
      clock = ts - t0;
      const dt = lastTs === null ? 0.016 : Math.min(0.05, (ts - lastTs) / 1000);
      lastTs = ts;
      level += (progressAt(clock) - level) * (1 - Math.exp(-dt * LEVEL_LERP));
      draw(clock * 0.006);
      raf = requestAnimationFrame(tick);
    }

    if (reduce) draw(0);
    else raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      btn.removeEventListener("click", activate);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.lq}>
        <button className={styles.lq__btn} type="button" ref={btnRef}>
          <svg className={styles.lq__wave} viewBox="0 0 240 72" preserveAspectRatio="none" aria-hidden="true">
            <path d="M0 72H240V72Z" ref={pathRef} />
          </svg>
          <span className={styles.lq__text}>
            <span ref={labelRef}>내려받기</span> <b ref={pctRef}>0%</b>
          </span>
        </button>
        <p className={styles.lq__meta}>
          <span className={styles.lq__tag}>LEVEL</span> <b ref={levelRef}>0.00</b> <span className={styles.lq__tag}>AMP</span> <b ref={ampRef}>0.0</b>
        </p>
      </div>
    </main>
  );
}
