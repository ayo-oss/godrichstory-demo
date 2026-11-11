// StepProgressDigitRoll — vanilla 판(08-step-precision-progress-digit-roll) 의 React 포트.
// 값 하나: 자릿수마다 목표 숫자까지 굴러가는 계산이 index × STEP_PROGRESS_DIGIT_ROLL_STAGGER_MS 만큼
// 늦게 시작해, 같은 easeInOutCubic 보간이 세 자릿수를 순서대로 어긋나게 굴린다 — CSS 트랜지션이 아니다.
import { useEffect, useRef, useState } from "react";
import styles from "./StepProgressDigitRoll.module.scss";

type Box<T> = { current: T };

const STEP_PROGRESS_DIGIT_ROLL_STAGGER_MS = 30;
const DIGIT_ROLL_DURATION_MS = 380;
const STEP_COUNT = 5;
const ROW_HEIGHT_EM = 1;
const DIGITS = "0123456789".split("");
const HALO_MAX_PX = 190;

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}
function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
function percentOf(step: number): number {
  return Math.round((step / (STEP_COUNT - 1)) * 100);
}
function digitsOf(n: number): number[] {
  const s = String(clamp(n, 0, 100)).padStart(3, "0");
  return [s.charCodeAt(0) - 48, s.charCodeAt(1) - 48, s.charCodeAt(2) - 48];
}

export default function StepProgressDigitRoll() {
  const [current, setCurrent] = useState(0);
  const [status, setStatus] = useState("전체 진행률 0%");
  const [reduce, setReduce] = useState(false);
  const currentRef = useRef<number>(0) as Box<number>;
  const demoRef = useRef<boolean>(true) as Box<boolean>;
  const reelRefs = useRef<Array<HTMLSpanElement | null>>([null, null, null]) as Box<Array<HTMLSpanElement | null>>;
  const digitRefs = useRef<Array<HTMLSpanElement | null>>([null, null, null]) as Box<Array<HTMLSpanElement | null>>;
  const haloRef = useRef<HTMLSpanElement | null>(null) as Box<HTMLSpanElement | null>;
  const fillRef = useRef<HTMLDivElement | null>(null) as Box<HTMLDivElement | null>;
  const shownDigitsRef = useRef<number[]>([0, 0, 0]) as Box<number[]>;
  const shownPctRef = useRef<number>(0) as Box<number>;
  const animsRef = useRef<Array<number | null>>([null, null, null]) as Box<Array<number | null>>;
  const haloAnimRef = useRef<number>(0) as Box<number>;
  const barAnimRef = useRef<number>(0) as Box<number>;
  const frameRef = useRef<number>(0) as Box<number>;

  useEffect(() => {
    setReduce(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  function setReel(i: number, digit: number, animate: boolean): void {
    const el = reelRefs.current[i];
    if (!el) return;
    const y = -digit * ROW_HEIGHT_EM;
    if (!animate || reduce) {
      el.style.transition = "none";
      el.style.transform = "translateY(" + y + "em)";
      shownDigitsRef.current[i] = digit;
      return;
    }
    const delay = i * STEP_PROGRESS_DIGIT_ROLL_STAGGER_MS;
    const fromDigit = shownDigitsRef.current[i];
    let start = 0;
    const existing = animsRef.current[i];
    if (existing) cancelAnimationFrame(existing);
    function step(now: number): void {
      if (start === 0) start = now;
      const elapsed = now - start - delay;
      if (elapsed < 0) { animsRef.current[i] = requestAnimationFrame(step); return; }
      const t = clamp(elapsed / DIGIT_ROLL_DURATION_MS, 0, 1);
      const eased = easeInOutCubic(t);
      const cur = fromDigit + (digit - fromDigit) * eased;
      if (el) el.style.transform = "translateY(" + (-cur * ROW_HEIGHT_EM) + "em)";
      if (t < 1) { animsRef.current[i] = requestAnimationFrame(step); } else { animsRef.current[i] = null; shownDigitsRef.current[i] = digit; }
    }
    animsRef.current[i] = requestAnimationFrame(step);
  }

  // 계산된 시각 레이어: 롤 진행을 0→1→0 으로 잡아 오도미터 배경 하이라이트 · 아우라 · 진행 바에 같은 값으로 전파
  function applyHalo(ratio: number): void {
    const small = window.innerWidth < 340;
    const haloMax = small ? HALO_MAX_PX * 0.32 : HALO_MAX_PX;
    const size = haloMax * ratio;
    const halo = haloRef.current;
    if (halo) { halo.style.width = size.toFixed(1) + "px"; halo.style.height = size.toFixed(1) + "px"; halo.style.opacity = (0.42 * ratio).toFixed(3); }
    digitRefs.current.forEach((el) => { if (el) el.style.backgroundColor = "rgba(23, 20, 26, " + (0.06 + 0.30 * ratio).toFixed(3) + ")"; });
  }

  function pulseHalo(): void {
    if (haloAnimRef.current) cancelAnimationFrame(haloAnimRef.current);
    if (reduce) { applyHalo(0); return; }
    let start = 0;
    const total = DIGIT_ROLL_DURATION_MS + STEP_PROGRESS_DIGIT_ROLL_STAGGER_MS * 2 + 80;
    function step(now: number): void {
      if (start === 0) start = now;
      const t = clamp((now - start) / total, 0, 1);
      const ratio = Math.sin(Math.PI * t);
      applyHalo(ratio);
      if (t < 1) { haloAnimRef.current = requestAnimationFrame(step); } else { haloAnimRef.current = 0; applyHalo(0); }
    }
    haloAnimRef.current = requestAnimationFrame(step);
  }

  function setBarWidth(pct: number): void {
    const fill = fillRef.current;
    if (fill) fill.style.width = clamp(pct, 0, 100).toFixed(1) + "%";
  }

  function tweenBar(fromPct: number, toPct: number): void {
    if (barAnimRef.current) cancelAnimationFrame(barAnimRef.current);
    if (reduce) { setBarWidth(toPct); shownPctRef.current = toPct; return; }
    let start = 0;
    function step(now: number): void {
      if (start === 0) start = now;
      const t = clamp((now - start) / DIGIT_ROLL_DURATION_MS, 0, 1);
      const v = fromPct + (toPct - fromPct) * easeInOutCubic(t);
      setBarWidth(v);
      if (t < 1) { barAnimRef.current = requestAnimationFrame(step); } else { barAnimRef.current = 0; shownPctRef.current = toPct; }
    }
    barAnimRef.current = requestAnimationFrame(step);
  }

  function paint(step: number, animate: boolean): void {
    const pct = percentOf(step);
    const d = digitsOf(pct);
    d.forEach((digit, i) => setReel(i, digit, animate));
    setStatus("전체 진행률 " + pct + "%");
    if (animate) { tweenBar(shownPctRef.current, pct); pulseHalo(); } else { setBarWidth(pct); shownPctRef.current = pct; }
  }

  function goTo(step: number): void {
    const clamped = clamp(step, 0, STEP_COUNT - 1);
    if (clamped === currentRef.current) return;
    currentRef.current = clamped;
    setCurrent(clamped);
    paint(clamped, true);
  }

  function stopDemo(): void { demoRef.current = false; }

  useEffect(() => {
    paint(0, false);
    let startTime = 0;
    let phase = 0;
    function tick(now: number): void {
      if (startTime === 0) startTime = now;
      const t = ((now - startTime) / 1000) % 2.0;
      if (demoRef.current) {
        if (t < 0.05 && phase !== 0) phase = 0;
        if (phase === 0 && t > 0.22) { goTo(2); phase = 1; }
        if (phase === 1 && t > 0.75) { goTo(4); phase = 2; }
        if (phase === 2 && t > 1.25) { goTo(1); phase = 3; }
        if (phase === 3 && t > 1.7) { goTo(0); phase = 4; }
      }
      frameRef.current = requestAnimationFrame(tick);
    }
    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduce]);

  function onKeyDown(e: { key: string; preventDefault: () => void }): void {
    if (e.key === "ArrowRight") { stopDemo(); goTo(current + 1); e.preventDefault(); }
    else if (e.key === "ArrowLeft") { stopDemo(); goTo(current - 1); e.preventDefault(); }
  }

  return (
    <main className={styles.stage}>
      <div className={styles.dr} onKeyDown={onKeyDown}>
        <span className={styles.halo} ref={haloRef} />
        <div className={styles.odometer} aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <span className={styles.digit} key={i} ref={(el: HTMLSpanElement | null) => { digitRefs.current[i] = el; }}>
              <span className={styles.reel} ref={(el: HTMLSpanElement | null) => { reelRefs.current[i] = el; }}>
                {DIGITS.map((ch) => <i key={ch}>{ch}</i>)}
              </span>
            </span>
          ))}
          <span className={styles.percentSign}>%</span>
        </div>
        <div className={styles.track}><div className={styles.fill} ref={fillRef} /></div>
        <p className={styles.status} aria-live="polite">{status}</p>
        <ol className={styles.row} role="list" aria-label="온보딩 진행 단계">
          {[0, 1, 2, 3, 4].map((i) => (
            <li
              key={i}
              className={[styles.node, i === current ? styles.nodeActive : "", i < current ? styles.nodeDone : ""].join(" ")}
              onClick={() => { stopDemo(); goTo(i); }}
            >
              {i + 1}
            </li>
          ))}
        </ol>
        <div className={styles.controls}>
          <button type="button" className={styles.btn} disabled={current === 0} onClick={() => { stopDemo(); goTo(current - 1); }}>이전</button>
          <button type="button" className={[styles.btn, styles.btnPrimary].join(" ")} disabled={current === STEP_COUNT - 1} onClick={() => { stopDemo(); goTo(current + 1); }}>다음</button>
        </div>
      </div>
    </main>
  );
}
