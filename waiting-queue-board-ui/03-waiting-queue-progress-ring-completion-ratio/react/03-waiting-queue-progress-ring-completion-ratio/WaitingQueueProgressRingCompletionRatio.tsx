// WaitingQueueProgressRingCompletionRatio — vanilla 판(03-waiting-queue-progress-ring-completion-ratio) 의
// React 포트. 처리 인원 / 전체 인원 비율을 다시 계산해 stroke-dashoffset 으로 링을 채우고,
// 비율 구간(0~1/3, 1/3~2/3, 2/3~1)마다 링 색을 계산해 함께 바꾼다.
import { useEffect, useRef, useState } from "react";
import styles from "./WaitingQueueProgressRingCompletionRatio.module.scss";

type Box<T> = { current: T };

const RING_FILL_DURATION_MS = 500;
const TOTAL = 30;
const RADIUS = 52;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function seedRand(seed: number): () => number {
  let s = seed >>> 0;
  return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

function easeOutCubic(t: number): number { return 1 - Math.pow(1 - t, 3); }

function stageOf(ratio: number): string {
  if (ratio >= 2 / 3) return styles.isLate;
  if (ratio >= 1 / 3) return styles.isMid;
  return styles.isEarly;
}

function flash(el: HTMLElement | null, cls: string, reduce: boolean): void {
  if (reduce || !el) return;
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
}

export default function WaitingQueueProgressRingCompletionRatio() {
  const [offset, setOffset] = useState(CIRCUMFERENCE);
  const [stageClass, setStageClass] = useState("");
  const [pctText, setPctText] = useState("0%");
  const [status, setStatus] = useState("");
  const [reduce, setReduce] = useState(false);
  const randRef = useRef<() => number>(seedRand(434031)) as Box<() => number>;
  const processedRef = useRef<number>(0) as Box<number>;
  const shownRatioRef = useRef<number>(0) as Box<number>;
  const ringAnimRef = useRef<number>(0) as Box<number>;
  const demoRef = useRef<boolean>(true) as Box<boolean>;
  const demoIndexRef = useRef<number>(0) as Box<number>;
  const demoScheduleRef = useRef<number[]>([200, 1200]) as Box<number[]>;
  const frameRef = useRef<number>(0) as Box<number>;
  const ringWrapRef = useRef<HTMLDivElement | null>(null) as Box<HTMLDivElement | null>;

  useEffect(() => {
    setReduce(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  function paintRing(ratio: number): void {
    setOffset(CIRCUMFERENCE * (1 - ratio));
    setStageClass(stageOf(ratio));
    setPctText(Math.round(ratio * 100) + "%");
  }

  function paintStatus(): void {
    setStatus("처리 " + processedRef.current + "/" + TOTAL + " · " + Math.round((processedRef.current / TOTAL) * 100) + "%");
  }

  function tweenRing(from: number, to: number): void {
    flash(ringWrapRef.current, styles.isFlash, reduce);
    if (ringAnimRef.current) cancelAnimationFrame(ringAnimRef.current);
    if (reduce) { shownRatioRef.current = to; paintRing(to); return; }
    let start = 0;
    function step(ts: number): void {
      if (start === 0) start = ts;
      const t = Math.min(1, (ts - start) / RING_FILL_DURATION_MS);
      const e = easeOutCubic(t);
      const v = from + (to - from) * e;
      shownRatioRef.current = v;
      paintRing(v);
      if (t < 1) { ringAnimRef.current = requestAnimationFrame(step); } else { ringAnimRef.current = 0; }
    }
    ringAnimRef.current = requestAnimationFrame(step);
  }

  function addProcessed(): void {
    if (processedRef.current >= TOTAL) { paintStatus(); return; }
    const step = 1 + Math.floor(randRef.current() * 3);
    processedRef.current = Math.min(TOTAL, processedRef.current + step);
    tweenRing(shownRatioRef.current, processedRef.current / TOTAL);
    paintStatus();
  }

  function resetAll(): void {
    processedRef.current = 0;
    shownRatioRef.current = 0;
    paintRing(0);
    paintStatus();
  }

  function stopDemo(): void { demoRef.current = false; }

  useEffect(() => {
    paintRing(0);
    paintStatus();
    let t0 = 0;
    function tick(ts: number): void {
      if (t0 === 0) t0 = ts;
      const now = ts - t0;
      const sched = demoScheduleRef.current;
      if (!reduce && demoRef.current && demoIndexRef.current < sched.length && now >= sched[demoIndexRef.current]) {
        if (processedRef.current >= TOTAL) { resetAll(); } else { addProcessed(); }
        demoIndexRef.current += 1;
        if (demoIndexRef.current >= sched.length) {
          demoIndexRef.current = 0;
          demoScheduleRef.current = sched.map((v) => v + now + 2000);
        }
      }
      frameRef.current = requestAnimationFrame(tick);
    }
    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduce]);

  function onProcess(): void { stopDemo(); addProcessed(); }
  function onReset(): void { stopDemo(); resetAll(); }

  function onKeyDown(e: { key: string; preventDefault: () => void }, fn: () => void): void {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); }
  }

  return (
    <main className={styles.stage}>
      <div className={styles.wpr}>
        <div className={styles.ringWrap} ref={ringWrapRef}>
          <svg className={styles.ring} viewBox="0 0 120 120" aria-hidden="true">
            <circle className={styles.track} cx="60" cy="60" r="52" />
            <circle
              className={[styles.fill, stageClass].join(" ")}
              cx="60" cy="60" r="52"
              style={{ strokeDasharray: CIRCUMFERENCE.toFixed(2), strokeDashoffset: offset.toFixed(2) }}
            />
          </svg>
          <div className={styles.pct} aria-hidden="true">{pctText}</div>
        </div>
        <p className={styles.status} aria-live="polite">{status}</p>
        <div className={styles.controls}>
          <button type="button" className={[styles.btn, styles.btnPrimary].join(" ")} onClick={onProcess} onKeyDown={(e: { key: string; preventDefault: () => void }) => onKeyDown(e, onProcess)}>처리 추가</button>
          <button type="button" className={styles.btn} onClick={onReset} onKeyDown={(e: { key: string; preventDefault: () => void }) => onKeyDown(e, onReset)}>초기화</button>
        </div>
      </div>
    </main>
  );
}
