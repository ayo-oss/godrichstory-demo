// StepCheckMorphDraw — vanilla 판(03-step-precision-check-morph-draw) 의 React 포트.
// 값 하나: 체크 path 의 getTotalLength() 로 잰 실제 길이 × (1 - easeOutCubic(t)) 를 매 프레임
// stroke-dashoffset 에 써서 "그려지는" 궤적을 만든다 — 숫자 opacity 는 그 반대값으로 동시에 뺀다.
import { useEffect, useRef, useState } from "react";
import styles from "./StepCheckMorphDraw.module.scss";

type Box<T> = { current: T };

const STEP_CHECK_DRAW_MS = 640;
const STEP_COUNT = 3;
const LABELS = ["본인확인", "서류작성", "제출완료"];
const STATUS_TEXTS = ["본인확인 진행 중", "서류작성 진행 중", "제출완료 진행 중"];
const STATUS_ALL_DONE = "모든 단계 완료";

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export default function StepCheckMorphDraw() {
  const [current, setCurrent] = useState(0);
  const [done, setDone] = useState([false, false, false]);
  const [reduce, setReduce] = useState(false);
  const currentRef = useRef<number>(0) as Box<number>;
  const doneRef = useRef<boolean[]>([false, false, false]) as Box<boolean[]>;
  const demoRef = useRef<boolean>(true) as Box<boolean>;
  const pathRefs = useRef<Array<SVGPathElement | null>>([null, null, null]) as Box<Array<SVGPathElement | null>>;
  const digitRefs = useRef<Array<HTMLSpanElement | null>>([null, null, null]) as Box<Array<HTMLSpanElement | null>>;
  const circleRefs = useRef<Array<HTMLSpanElement | null>>([null, null, null]) as Box<Array<HTMLSpanElement | null>>;
  const lengthsRef = useRef<number[]>([0, 0, 0]) as Box<number[]>;
  const progressStateRef = useRef<number[]>([0, 0, 0]) as Box<number[]>;
  const rootRef = useRef<HTMLDivElement | null>(null) as Box<HTMLDivElement | null>;
  const animsRef = useRef<Array<number | null>>([null, null, null]) as Box<Array<number | null>>;
  const frameRef = useRef<number>(0) as Box<number>;

  useEffect(() => {
    setReduce(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    lengthsRef.current = pathRefs.current.map((p) => (p ? p.getTotalLength() : 0));
    pathRefs.current.forEach((p, i) => {
      if (!p) return;
      p.style.strokeDasharray = String(lengthsRef.current[i]);
      p.style.strokeDashoffset = String(lengthsRef.current[i]);
    });
  }, []);

  function setDrawProgress(i: number, progress: number): void {
    const len = lengthsRef.current[i];
    const p = pathRefs.current[i];
    const d = digitRefs.current[i];
    const c = circleRefs.current[i];
    if (p) { p.style.strokeDashoffset = String(len * (1 - progress)); p.style.opacity = String(progress); }
    if (d) d.style.opacity = String(1 - progress);
    if (c) c.style.setProperty("--drawGlow", progress.toFixed(3));
    progressStateRef.current[i] = progress;
    if (rootRef.current) {
      const g = Math.max(progressStateRef.current[0], progressStateRef.current[1], progressStateRef.current[2]);
      rootRef.current.style.setProperty("--cmGlow", g.toFixed(3));
    }
  }

  function animateDraw(i: number, forward: boolean): void {
    const startFrom = forward ? 0 : 1;
    const startTo = forward ? 1 : 0;
    if (reduce) { setDrawProgress(i, startTo); return; }
    let start = 0;
    function step(now: number): void {
      if (start === 0) start = now;
      const t = clamp((now - start) / STEP_CHECK_DRAW_MS, 0, 1);
      const eased = easeOutCubic(t);
      setDrawProgress(i, startFrom + (startTo - startFrom) * eased);
      animsRef.current[i] = t < 1 ? requestAnimationFrame(step) : null;
    }
    const existing = animsRef.current[i];
    if (existing) cancelAnimationFrame(existing);
    animsRef.current[i] = requestAnimationFrame(step);
  }

  function complete(): void {
    const cur = currentRef.current;
    if (doneRef.current[cur]) return;
    const nextDone = doneRef.current.slice();
    nextDone[cur] = true;
    doneRef.current = nextDone;
    setDone(nextDone);
    animateDraw(cur, true);
    if (cur < STEP_COUNT - 1) { currentRef.current = cur + 1; setCurrent(cur + 1); }
  }

  function back(): void {
    const cur = currentRef.current;
    const target = clamp(doneRef.current[cur] ? cur : cur - 1, 0, STEP_COUNT - 1);
    if (doneRef.current[target]) {
      const nextDone = doneRef.current.slice();
      nextDone[target] = false;
      doneRef.current = nextDone;
      setDone(nextDone);
      animateDraw(target, false);
    }
    currentRef.current = target;
    setCurrent(target);
  }

  function stopDemo(): void { demoRef.current = false; }

  useEffect(() => {
    let startTime = 0;
    let phase = 0;
    function loopTick(now: number): void {
      if (startTime === 0) startTime = now;
      const t = ((now - startTime) / 1000) % 2;
      if (demoRef.current) {
        if (t < 0.05 && phase !== 0) phase = 0;
        if (phase === 0 && t > 0.2) { complete(); phase = 1; }
        if (phase === 1 && t > 0.85) { complete(); phase = 2; }
        if (phase === 2 && t > 1.5) { complete(); phase = 3; }
        if (phase === 3 && t > 1.9) {
          [0, 1, 2].forEach((i) => {
            const existing = animsRef.current[i];
            if (existing) { cancelAnimationFrame(existing); animsRef.current[i] = null; }
          });
          doneRef.current = [false, false, false];
          currentRef.current = 0;
          setDone([false, false, false]);
          setCurrent(0);
          [0, 1, 2].forEach((i) => setDrawProgress(i, 0));
          phase = 4;
        }
      }
      frameRef.current = requestAnimationFrame(loopTick);
    }
    frameRef.current = requestAnimationFrame(loopTick);
    return () => cancelAnimationFrame(frameRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onKeyDown(e: { key: string; preventDefault: () => void }): void {
    if (e.key === "ArrowRight") { stopDemo(); complete(); e.preventDefault(); }
    else if (e.key === "ArrowLeft") { stopDemo(); back(); e.preventDefault(); }
  }

  const allDone = done[current] || (current >= STEP_COUNT - 1 && done[STEP_COUNT - 1]);
  const statusText = allDone ? STATUS_ALL_DONE : STATUS_TEXTS[current];

  return (
    <main className={styles.stage}>
      <div className={styles.cm} onKeyDown={onKeyDown} ref={(el: HTMLDivElement | null) => { rootRef.current = el; }}>
        <ol className={styles.row} role="list" aria-label="신청서 제출 단계">
          {LABELS.map((label, i) => (
            <li key={label} style={{ display: "contents" }}>
              <div className={styles.node}>
                <span className={[styles.circle, i === current && !done[i] ? styles.circleActive : "", done[i] ? styles.circleDone : ""].join(" ")} ref={(el: HTMLSpanElement | null) => { circleRefs.current[i] = el; }}>
                  <span className={styles.digit} ref={(el: HTMLSpanElement | null) => { digitRefs.current[i] = el; }}>{i + 1}</span>
                  <svg className={styles.check} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                    <path className={styles.checkPath} ref={(el: SVGPathElement | null) => { pathRefs.current[i] = el; }} d="M5 12.5 L10 17.5 L19 6.5" />
                  </svg>
                </span>
                <span className={styles.label}>{label}</span>
              </div>
              {i < STEP_COUNT - 1 && <div className={styles.connector} />}
            </li>
          ))}
        </ol>
        <p className={styles.status} aria-live="polite">{statusText}</p>
        <div className={styles.controls}>
          <button type="button" className={styles.btn} disabled={current === 0} onClick={() => { stopDemo(); back(); }}>이전</button>
          <button type="button" className={[styles.btn, styles.btnPrimary].join(" ")} disabled={done[STEP_COUNT - 1]} onClick={() => { stopDemo(); complete(); }}>완료</button>
        </div>
      </div>
    </main>
  );
}
