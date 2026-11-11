// CheckMorphButton — vanilla 판(06-dlbtn-check-stroke-morph) 의 React 포트.
// 화살표와 체크 두 경로의 stroke-dashoffset 을 같은 진행값 p 에서 계산하고, 버튼 폭은 라벨 실측 너비로 보간한다.
import { useEffect, useRef } from "react";
import styles from "./CheckMorphButton.module.scss";

const STROKE_LEN = 100;
const CHECK_MS = 360;
const WIDTH_LERP = 10;
const PAD_X = 24;
const ICON_GAP = 16;
const ICON_W = 36;
const START_MS = 200;
const HOLD_MS = 1300;
const CYCLE_MS = 2000;

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export default function CheckMorphButton() {
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const arrowRef = useRef<SVGPathElement | null>(null);
  const checkRef = useRef<SVGPathElement | null>(null);
  const labelRef = useRef<HTMLSpanElement | null>(null);
  const rulerARef = useRef<HTMLSpanElement | null>(null);
  const rulerBRef = useRef<HTMLSpanElement | null>(null);
  const pRef = useRef<HTMLElement | null>(null);
  const wRef = useRef<HTMLElement | null>(null);
  const statusRef = useRef<HTMLParagraphElement | null>(null);

  useEffect(() => {
    const btn = btnRef.current;
    const arrow = arrowRef.current;
    const check = checkRef.current;
    const label = labelRef.current;
    const rulerA = rulerARef.current;
    const rulerB = rulerBRef.current;
    const pEl = pRef.current;
    const wEl = wRef.current;
    const statusEl = statusRef.current;
    if (!btn || !arrow || !check || !label || !rulerA || !rulerB || !pEl || !wEl || !statusEl) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let demo = !reduce;
    let p = 0;
    let width = 0;
    let done = false;
    let announced = false;
    let t0: number | null = null;
    let lastTs: number | null = null;
    let raf = 0;

    arrow.setAttribute("pathLength", String(STROKE_LEN));
    check.setAttribute("pathLength", String(STROKE_LEN));
    arrow.style.strokeDasharray = STROKE_LEN + " " + STROKE_LEN;
    check.style.strokeDasharray = STROKE_LEN + " " + STROKE_LEN;

    const widthFor = (isDone: boolean): number =>
      2 * PAD_X + ICON_W + ICON_GAP + (isDone ? rulerB : rulerA).offsetWidth;
    const goal = (now: number): boolean => {
      if (demo) return now >= START_MS && (now - START_MS) % CYCLE_MS < HOLD_MS;
      return done;
    };
    const render = (): void => {
      const shrink = clamp(p / 0.5, 0, 1);
      const draw = clamp((p - 0.4) / 0.6, 0, 1);
      arrow.style.strokeDashoffset = (STROKE_LEN * shrink).toFixed(2);
      check.style.strokeDashoffset = (STROKE_LEN * (1 - draw)).toFixed(2);
      label.textContent = p >= 0.5 ? "완료" : "내려받기";
      label.style.opacity = Math.abs(2 * p - 1).toFixed(2);
      btn.style.setProperty("--p", p.toFixed(3));
      btn.style.width = width.toFixed(1) + "px";
      pEl.textContent = p.toFixed(2);
      wEl.textContent = String(Math.round(width));
      if (p >= 1 && !announced) { announced = true; statusEl.textContent = "받기 완료"; }
      if (p <= 0 && announced) { announced = false; statusEl.textContent = ""; }
    };
    const toggle = (): void => {
      demo = false;
      done = !done;
      if (reduce) { p = done ? 1 : 0; width = widthFor(done); render(); }
    };
    btn.addEventListener("click", toggle);

    function tick(ts: number): void {
      if (t0 === null) t0 = ts;
      const now = ts - t0;
      const dt = lastTs === null ? 0.016 : Math.min(0.05, (ts - lastTs) / 1000);
      lastTs = ts;
      const want = goal(now);
      const step = dt / (CHECK_MS / 1000);
      p = clamp(p + (want ? step : -step), 0, 1);
      width += (widthFor(want) - width) * (1 - Math.exp(-dt * WIDTH_LERP));
      render();
      raf = requestAnimationFrame(tick);
    }

    width = widthFor(false);
    if (reduce) render();
    else raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      btn.removeEventListener("click", toggle);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.ck}>
        <button className={styles.ck__btn} type="button" ref={btnRef}>
          <svg className={styles.ck__icon} viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 4v11M6.5 10.5 12 16l5.5-5.5" ref={arrowRef} />
            <path d="M5 13l4.5 4.5L19 7" ref={checkRef} />
          </svg>
          <span className={styles.ck__label} ref={labelRef}>내려받기</span>
        </button>
        <span className={styles.ck__ruler} ref={rulerARef} aria-hidden="true">내려받기</span>
        <span className={styles.ck__ruler} ref={rulerBRef} aria-hidden="true">완료</span>
        <p className={styles.ck__meta}>
          <span className={styles.ck__tag}>P</span> <b ref={pRef}>0.00</b> <span className={styles.ck__tag}>W</span> <b ref={wRef}>0</b>
        </p>
        <p className={styles.ck__sr} role="status" ref={statusRef} />
      </div>
    </main>
  );
}
