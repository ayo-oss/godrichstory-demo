// RingProgressButton — vanilla 판(02-dlbtn-ring-progress-curve) 의 React 포트.
// 진행률은 곡선 p = 1 - (1 - u)^CURVE_POW 로 계산한다. 굵은 링 = 곡선, 가는 링 = 같은 시간의 균일 진행률.
import { useEffect, useRef } from "react";
import styles from "./RingProgressButton.module.scss";

const CURVE_POW = 2;
const RING_R = 16;
const RUN_MS = 1400;
const START_MS = 200;
const CYCLE_MS = 2000;

type Start = number | "done" | null;

function ringCurve(u: number): number {
  return 1 - Math.pow(1 - u, CURVE_POW);
}

export default function RingProgressButton() {
  const barRef = useRef<HTMLDivElement | null>(null);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const ringRef = useRef<SVGRectElement | null>(null);
  const ghostRef = useRef<SVGRectElement | null>(null);
  const labelRef = useRef<HTMLSpanElement | null>(null);
  const pctRef = useRef<HTMLElement | null>(null);
  const leadRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const bar = barRef.current;
    const btn = btnRef.current;
    const ring = ringRef.current;
    const ghost = ghostRef.current;
    const labelEl = labelRef.current;
    const pctEl = pctRef.current;
    const leadEl = leadRef.current;
    if (!bar || !btn || !ring || !ghost || !labelEl || !pctEl || !leadEl) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let demo = !reduce;
    let clock = 0;
    let runStart: Start = null;
    let t0: number | null = null;
    let raf = 0;

    ring.setAttribute("rx", String(RING_R));
    ghost.setAttribute("rx", String(RING_R - 6));

    const startOf = (now: number): number | null => {
      if (demo) return now < START_MS ? null : START_MS + Math.floor((now - START_MS) / CYCLE_MS) * CYCLE_MS;
      return runStart === "done" ? null : runStart;
    };
    const render = (now: number): void => {
      const s = startOf(now);
      let u = s === null ? 0 : Math.max(0, Math.min(1, (now - s) / RUN_MS));
      if (reduce && runStart === "done") u = 1;
      const p = ringCurve(u);
      const pct = Math.round(p * 100);
      ring.style.strokeDashoffset = (100 - p * 100).toFixed(2);
      ghost.style.strokeDashoffset = (100 - u * 100).toFixed(2);
      ring.style.opacity = p < 0.004 ? "0" : "1";
      ghost.style.opacity = u < 0.004 ? "0" : "1";
      btn.style.setProperty("--f", p.toFixed(3));
      pctEl.textContent = pct + "%";
      leadEl.textContent = String(Math.round((p - u) * 100));
      labelEl.textContent = u >= 1 ? "완료" : u > 0 ? "받는 중" : "내려받기";
      bar.setAttribute("aria-valuenow", String(pct));
      bar.setAttribute("aria-valuetext", pct + "%");
    };
    const activate = (): void => {
      demo = false;
      if (reduce) { runStart = "done"; render(clock); return; }
      if (typeof runStart === "number" && clock - runStart < RUN_MS) return;
      runStart = clock;
    };
    btn.addEventListener("click", activate);

    function tick(ts: number): void {
      if (t0 === null) t0 = ts;
      clock = ts - t0;
      render(clock);
      raf = requestAnimationFrame(tick);
    }

    if (reduce) render(0);
    else raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      btn.removeEventListener("click", activate);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.rg}>
        <div className={styles.rg__wrap} ref={barRef} role="progressbar" aria-labelledby="rgLabel" aria-valuemin={0} aria-valuemax={100} aria-valuenow={0} aria-valuetext="0%">
          <svg className={styles.rg__svg} viewBox="0 0 232 96" aria-hidden="true">
            <rect className={styles.rg__ghost} ref={ghostRef} x="11" y="11" width="210" height="74" pathLength="100" />
            <rect className={styles.rg__ring} ref={ringRef} x="3" y="3" width="226" height="90" pathLength="100" />
          </svg>
          <button className={styles.rg__btn} type="button" ref={btnRef}>
            <span id="rgLabel" ref={labelRef}>내려받기</span>
            <b ref={pctRef}>0%</b>
          </button>
        </div>
        <p className={styles.rg__meta}>
          <span className={styles.rg__tag}>POW</span> <b>{CURVE_POW}</b> <span className={styles.rg__tag}>LEAD</span> <b ref={leadRef}>0</b>
        </p>
      </div>
    </main>
  );
}
