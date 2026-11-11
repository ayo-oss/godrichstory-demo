// FadeDivider — vanilla 판(01-divl-gradient-fade-ends-line) 의 React 포트.
// 선 색의 알파를 양 끝 FADE_PCT% 구간에서만 smoothstep 곡선으로 올린다. 정지점은 JS 가 계산한다.
import { useEffect, useRef } from "react";
import styles from "./FadeDivider.module.scss";

type Box<T> = { current: T };

const LINE_H_PX = 20;
const STEPS = 8;
const CYCLE_MS = 2000;
const LOW_PCT = 6;
const HIGH_PCT = 50;
const RGB = "185,160,255";

function gradientOf(pct: number): string {
  const stops: string[] = [];
  for (let i = 0; i <= STEPS; i += 1) {
    const t = i / STEPS;
    const a = t * t * (3 - 2 * t);
    stops.push("rgba(" + RGB + "," + a.toFixed(3) + ") " + (pct * t).toFixed(2) + "%");
  }
  for (let i = STEPS; i >= 0; i -= 1) {
    const u = i / STEPS;
    const b = u * u * (3 - 2 * u);
    stops.push("rgba(" + RGB + "," + b.toFixed(3) + ") " + (100 - pct * u).toFixed(2) + "%");
  }
  return "linear-gradient(90deg," + stops.join(",") + ")";
}

export default function FadeDivider() {
  const lineRef = useRef<HTMLDivElement | null>(null) as Box<HTMLDivElement | null>;
  const glowRef = useRef<HTMLDivElement | null>(null) as Box<HTMLDivElement | null>;
  const rangeRef = useRef<HTMLInputElement | null>(null) as Box<HTMLInputElement | null>;
  const pctRef = useRef<HTMLElement | null>(null) as Box<HTMLElement | null>;

  useEffect(() => {
    const line = lineRef.current;
    const glow = glowRef.current;
    const range = rangeRef.current;
    const pctEl = pctRef.current;
    if (!line || !glow || !range || !pctEl) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let demo = !reduce;
    let t0: number | null = null;
    let raf = 0;

    const paint = (pct: number): void => {
      const g = gradientOf(pct);
      line.style.background = g;
      glow.style.background = g;
      pctEl.textContent = String(Math.round(pct));
      range.value = String(Math.round(pct));
    };
    const onInput = (): void => {
      demo = false;
      paint(Number(range.value));
    };
    range.addEventListener("input", onInput);

    function tick(ts: number): void {
      if (t0 === null) t0 = ts;
      if (demo) {
        const phase = ((ts - t0) % CYCLE_MS) / CYCLE_MS;
        const wave = 0.5 - 0.5 * Math.cos(phase * Math.PI * 2);
        paint(LOW_PCT + (HIGH_PCT - LOW_PCT) * wave);
      }
      raf = requestAnimationFrame(tick);
    }

    line.style.height = LINE_H_PX + "px";
    paint(30);
    if (!reduce) raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      range.removeEventListener("input", onInput);
    };
  }, []);

  return (
    <div className={styles.dv}>
      <p className={styles.block}>위 단락</p>
      <div className={styles.rail}>
        <div className={styles.glow} ref={glowRef} />
        <div className={styles.line} ref={lineRef} role="separator" />
      </div>
      <p className={styles.block}>아래 단락</p>
      <label className={styles.ctrl}>
        <span>사라지는 구간</span>
        <input type="range" min={0} max={50} defaultValue={30} ref={rangeRef} />
      </label>
      <p className={styles.meta}>
        <span className={styles.tag}>FADE_PCT</span> <b ref={pctRef}>30</b>%
      </p>
    </div>
  );
}
