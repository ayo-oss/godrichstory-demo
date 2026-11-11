// WaitingQueueEtaAverageServiceTime — vanilla 판(02-waiting-queue-eta-average-service-time) 의 React 포트.
// 처리 로그 평균(분) × 남은 인원으로 예상 대기 시간을 다시 계산해, 바뀐 값을 easeOutCubic 으로
// 보간하고 변화 폭에 비례한 발광을 같은 값으로 전파한다 — Date 없이 rAF 타임스탬프만 쓰는 가상 시계.
import { useEffect, useRef, useState } from "react";
import styles from "./WaitingQueueEtaAverageServiceTime.module.scss";

type Box<T> = { current: T };

const ETA_TWEEN_MS = 420;
const SERVICE_LOG_MAX = 12;
const INITIAL_REMAIN = 24;

function seedRand(seed: number): () => number {
  let s = seed >>> 0;
  return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function flash(el: HTMLElement | null, cls: string, reduce: boolean): void {
  if (reduce || !el) return;
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
}

export default function WaitingQueueEtaAverageServiceTime() {
  const [etaText, setEtaText] = useState("0");
  const [avgText, setAvgText] = useState("건당 평균 0.0분");
  const [status, setStatus] = useState("");
  const [glow, setGlow] = useState({ opacity: 0, scale: 0.85 });
  const [reduce, setReduce] = useState(false);
  const randRef = useRef<() => number>(seedRand(434021)) as Box<() => number>;
  const logRef = useRef<number[]>([]) as Box<number[]>;
  const remainRef = useRef<number>(INITIAL_REMAIN) as Box<number>;
  const shownEtaRef = useRef<number>(0) as Box<number>;
  const etaAnimRef = useRef<number>(0) as Box<number>;
  const demoRef = useRef<boolean>(true) as Box<boolean>;
  const demoIndexRef = useRef<number>(0) as Box<number>;
  const demoScheduleRef = useRef<number[]>([200, 1200]) as Box<number[]>;
  const frameRef = useRef<number>(0) as Box<number>;
  const etaWrapRef = useRef<HTMLDivElement | null>(null) as Box<HTMLDivElement | null>;

  function randServiceMinutes(): number { return 2.5 + randRef.current() * 3.5; }

  useEffect(() => {
    setReduce(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    for (let i = 0; i < 6; i += 1) logRef.current.push(randServiceMinutes());
    shownEtaRef.current = targetEta();
    setEtaText(String(Math.round(shownEtaRef.current)));
    paintStatic();
    paintStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function avgMinutes(): number {
    const log = logRef.current;
    if (log.length === 0) return 0;
    let sum = 0;
    for (let i = 0; i < log.length; i += 1) sum += log[i];
    return sum / log.length;
  }

  function targetEta(): number { return avgMinutes() * remainRef.current; }

  function paintStatic(): void {
    setAvgText("건당 평균 " + avgMinutes().toFixed(1) + "분");
  }

  function paintStatus(): void {
    setStatus("평균 처리 " + avgMinutes().toFixed(1) + "분 · 예상 대기 " + Math.round(targetEta()) + "분");
  }

  function tweenEta(from: number, to: number): void {
    flash(etaWrapRef.current, styles.isFlash, reduce);
    if (etaAnimRef.current) cancelAnimationFrame(etaAnimRef.current);
    const maxDelta = Math.max(1, avgMinutes() * 4);
    const deltaRatio = Math.min(1, Math.abs(to - from) / maxDelta);
    if (reduce) {
      shownEtaRef.current = to;
      setEtaText(String(Math.round(to)));
      setGlow({ opacity: 0, scale: 0.85 });
      return;
    }
    let start = 0;
    function step(ts: number): void {
      if (start === 0) start = ts;
      const t = Math.min(1, (ts - start) / ETA_TWEEN_MS);
      const e = easeOutCubic(t);
      const v = from + (to - from) * e;
      shownEtaRef.current = v;
      setEtaText(String(Math.round(v)));
      const ratio = deltaRatio * (1 - t);
      setGlow({ opacity: 0.5 * ratio, scale: 0.85 + ratio * 0.5 });
      if (t < 1) { etaAnimRef.current = requestAnimationFrame(step); } else { etaAnimRef.current = 0; setGlow({ opacity: 0, scale: 0.85 }); }
    }
    etaAnimRef.current = requestAnimationFrame(step);
  }

  function recalc(): void {
    const from = shownEtaRef.current;
    const to = targetEta();
    tweenEta(from, to);
    paintStatic();
    paintStatus();
  }

  function processNext(): void {
    if (remainRef.current <= 0) { paintStatus(); return; }
    logRef.current.push(randServiceMinutes());
    if (logRef.current.length > SERVICE_LOG_MAX) logRef.current.shift();
    remainRef.current = Math.max(0, remainRef.current - 1);
    recalc();
  }

  function resetAll(): void {
    logRef.current = [];
    for (let i = 0; i < 6; i += 1) logRef.current.push(randServiceMinutes());
    remainRef.current = INITIAL_REMAIN;
    shownEtaRef.current = targetEta();
    setEtaText(String(Math.round(shownEtaRef.current)));
    setGlow({ opacity: 0, scale: 0.85 });
    paintStatic();
    paintStatus();
  }

  function stopDemo(): void { demoRef.current = false; }

  useEffect(() => {
    let t0 = 0;
    function tick(ts: number): void {
      if (t0 === 0) t0 = ts;
      const now = ts - t0;
      const sched = demoScheduleRef.current;
      if (!reduce && demoRef.current && demoIndexRef.current < sched.length && now >= sched[demoIndexRef.current]) {
        if (remainRef.current <= 0) { resetAll(); } else { processNext(); }
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

  function onProcess(): void { stopDemo(); processNext(); }
  function onReset(): void { stopDemo(); resetAll(); }

  function onKeyDown(e: { key: string; preventDefault: () => void }, fn: () => void): void {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); }
  }

  return (
    <main className={styles.stage}>
      <div className={styles.wet}>
        <div className={styles.etaWrap} ref={etaWrapRef}>
          <span className={styles.etaGlow} aria-hidden="true" style={{ opacity: glow.opacity, transform: "translate(-50%, -50%) scale(" + glow.scale + ")" }} />
          <span className={styles.etaNum} aria-hidden="true">{etaText}</span>
          <span className={styles.etaUnit} aria-hidden="true">분 뒤 예상</span>
        </div>
        <p className={styles.avg} aria-hidden="true">{avgText}</p>
        <p className={styles.status} aria-live="polite">{status}</p>
        <div className={styles.controls}>
          <button type="button" className={[styles.btn, styles.btnPrimary].join(" ")} onClick={onProcess} onKeyDown={(e: { key: string; preventDefault: () => void }) => onKeyDown(e, onProcess)}>다음 처리</button>
          <button type="button" className={styles.btn} onClick={onReset} onKeyDown={(e: { key: string; preventDefault: () => void }) => onKeyDown(e, onReset)}>초기화</button>
        </div>
      </div>
    </main>
  );
}
