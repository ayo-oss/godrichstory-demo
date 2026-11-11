// RetryDecayButton — vanilla 판(08-dlbtn-error-retry-decay) 의 React 포트.
// 실패 순간부터 흔들림 진폭이 지수로 줄고, 링은 실패한 길이에서 처음으로 REWIND_MS 동안 되감긴다. 두 번째 시도는 끝까지 간다.
import { useEffect, useRef } from "react";
import styles from "./RetryDecayButton.module.scss";

const SHAKE_AMP = 14;
const SHAKE_DECAY = 5;
const REWIND_MS = 500;
const SHAKE_HZ = 4.5;
const FAIL_AT = 0.62;
const RUN_MS = 700;
const REWIND_DELAY = 150;
const START_MS = 200;
const CYCLE_MS = 2000;
const ARROW = "M12 4v11M6.5 10.5 12 16l5.5-5.5";
const BANG = "M12 5v9M12 19v.5";

type Frame = { p: number; x: number; e: number; label: string; glyph: string; note: string };
type Outcome = "fail" | "ok";

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}
function outQuad(t: number): number {
  return 1 - (1 - t) * (1 - t);
}
function inOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

export default function RetryDecayButton() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const barRef = useRef<HTMLDivElement | null>(null);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const ringRef = useRef<SVGRectElement | null>(null);
  const labelRef = useRef<HTMLSpanElement | null>(null);
  const glyphRef = useRef<SVGPathElement | null>(null);
  const xRef = useRef<HTMLElement | null>(null);
  const pRef = useRef<HTMLElement | null>(null);
  const statusRef = useRef<HTMLParagraphElement | null>(null);

  useEffect(() => {
    const bar = barRef.current;
    const btn = btnRef.current;
    const ring = ringRef.current;
    const labelEl = labelRef.current;
    const glyph = glyphRef.current;
    const xEl = xRef.current;
    const pEl = pRef.current;
    const statusEl = statusRef.current;
    if (!bar || !btn || !ring || !labelEl || !glyph || !xEl || !pEl || !statusEl) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let demo = !reduce;
    let clock = 0;
    let runStart: number | null = null;
    let outcome: Outcome = "fail";
    let attempts = 0;
    let lastNote = "";
    let t0: number | null = null;
    let raf = 0;

    const busy = (now: number): boolean =>
      runStart !== null && now - runStart < RUN_MS + REWIND_DELAY + REWIND_MS;

    const frame = (now: number): Frame => {
      let s: number | null;
      let res: Outcome = outcome;
      if (demo) {
        s = now < START_MS ? null : START_MS + Math.floor((now - START_MS) / CYCLE_MS) * CYCLE_MS;
        res = "fail";
      } else {
        s = runStart;
      }
      if (s === null) return { p: 0, x: 0, e: 0, label: "내려받기", glyph: ARROW, note: "" };
      const t = now - s;
      if (t < RUN_MS) {
        const u = outQuad(t / RUN_MS);
        return { p: res === "fail" ? FAIL_AT * u : u, x: 0, e: 0, label: "받는 중", glyph: ARROW, note: "" };
      }
      if (res === "ok") return { p: 1, x: 0, e: 0, label: "완료", glyph: ARROW, note: "받기 완료" };
      const tau = (t - RUN_MS) / 1000;
      const rw = clamp((t - RUN_MS - REWIND_DELAY) / REWIND_MS, 0, 1);
      return {
        p: FAIL_AT * (1 - inOut(rw)),
        x: SHAKE_AMP * Math.exp(-SHAKE_DECAY * tau) * Math.sin(2 * Math.PI * SHAKE_HZ * tau),
        e: 1,
        label: rw >= 1 ? "다시 시도" : "실패",
        glyph: BANG,
        note: "받기가 끊겼어요"
      };
    };
    const paint = (f: Frame): void => {
      const pct = Math.round(f.p * 100);
      ring.style.strokeDashoffset = (100 - f.p * 100).toFixed(2);
      ring.style.opacity = f.p < 0.004 ? "0" : "1";
      bar.style.setProperty("--e", String(f.e));
      bar.style.transform = `translateX(${f.x.toFixed(2)}px)`;
      labelEl.textContent = f.label;
      glyph.setAttribute("d", f.glyph);
      xEl.textContent = f.x.toFixed(1);
      pEl.textContent = String(pct);
      bar.setAttribute("aria-valuenow", String(pct));
      bar.setAttribute("aria-valuetext", pct + "%");
      if (f.note !== lastNote) { lastNote = f.note; statusEl.textContent = f.note; }
    };
    const onClick = (): void => {
      demo = false;
      if (busy(clock)) return;
      outcome = attempts % 2 === 0 ? "fail" : "ok";
      attempts += 1;
      if (reduce) {
        paint(outcome === "ok"
          ? { p: 1, x: 0, e: 0, label: "완료", glyph: ARROW, note: "받기 완료" }
          : { p: 0, x: 0, e: 1, label: "다시 시도", glyph: BANG, note: "받기가 끊겼어요" });
        runStart = null;
        return;
      }
      runStart = clock;
    };
    btn.addEventListener("click", onClick);

    function tick(ts: number): void {
      if (t0 === null) t0 = ts;
      clock = ts - t0;
      paint(frame(clock));
      raf = requestAnimationFrame(tick);
    }

    if (reduce) paint(frame(0));
    else raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      btn.removeEventListener("click", onClick);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.rt} ref={rootRef}>
        <div className={styles.rt__wrap} ref={barRef} role="progressbar" aria-labelledby="rtLabel" aria-valuemin={0} aria-valuemax={100} aria-valuenow={0} aria-valuetext="0%">
          <svg className={styles.rt__svg} viewBox="0 0 232 96" aria-hidden="true">
            <rect className={styles.rt__ring} ref={ringRef} x="3" y="3" width="226" height="90" rx="16" pathLength="100" />
          </svg>
          <button className={styles.rt__btn} type="button" ref={btnRef}>
            <svg className={styles.rt__icon} viewBox="0 0 24 24" aria-hidden="true"><path d={ARROW} ref={glyphRef} /></svg>
            <span id="rtLabel" ref={labelRef}>내려받기</span>
          </button>
        </div>
        <p className={styles.rt__meta}>
          <span className={styles.rt__tag}>X</span> <b ref={xRef}>0.0</b> <span className={styles.rt__tag}>P</span> <b ref={pRef}>0</b>
        </p>
        <p className={styles.rt__sr} role="status" ref={statusRef} />
      </div>
    </main>
  );
}
