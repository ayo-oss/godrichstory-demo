// WaitingQueueMultiCounterDistribution — vanilla 판(06-waiting-queue-multi-counter-distribution) 의
// React 포트. 창구마다 처리 로그 평균(분)을 계산해 막대 길이를 이징 트윈으로 채우고, 가장 빠른
// 창구를 매 계산마다 다시 판정해 은은한 발광을 켠다.
import { useEffect, useRef, useState } from "react";
import styles from "./WaitingQueueMultiCounterDistribution.module.scss";

type Box<T> = { current: T };

const BAR_TWEEN_MS = 420;
const SERVICE_LOG_MAX = 8;

function seedRand(seed: number): () => number {
  let s = seed >>> 0;
  return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}
function easeOutCubic(t: number): number { return 1 - Math.pow(1 - t, 3); }

type Counter = {
  id: string;
  label: string;
  seed: number;
  base: number;
  rand: () => number;
  log: number[];
  processed: number;
  shownRatio: number;
  anim: number;
};

function makeCounters(): Counter[] {
  const defs = [
    { id: "a", label: "1번 창구", seed: 434061, base: 2.4 },
    { id: "b", label: "2번 창구", seed: 434062, base: 3.6 },
    { id: "c", label: "3번 창구", seed: 434063, base: 3.0 }
  ];
  return defs.map((d) => {
    const rand = seedRand(d.seed);
    const log: number[] = [];
    for (let i = 0; i < 4; i += 1) log.push(d.base + rand() * 1.4);
    return { ...d, rand, log, processed: 0, shownRatio: 0, anim: 0 };
  });
}

function avgMinutes(c: Counter): number {
  if (c.log.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < c.log.length; i += 1) sum += c.log[i];
  return sum / c.log.length;
}

export default function WaitingQueueMultiCounterDistribution() {
  const countersRef = useRef<Counter[]>(makeCounters()) as Box<Counter[]>;
  const [, forceTick] = useState(0);
  const [barPct, setBarPct] = useState<Record<string, number>>({ a: 0, b: 0, c: 0 });
  const [meta, setMeta] = useState<Record<string, string>>({ a: "", b: "", c: "" });
  const [fastestId, setFastestId] = useState("a");
  const [status, setStatus] = useState("창구 3곳의 처리 속도를 계산해 다음 예상 시각을 보여줍니다.");
  const [reduce, setReduce] = useState(false);
  const demoRef = useRef<boolean>(true) as Box<boolean>;
  const turnRef = useRef<number>(0) as Box<number>;
  const demoIndexRef = useRef<number>(0) as Box<number>;
  const demoScheduleRef = useRef<number[]>([200, 1200]) as Box<number[]>;
  const frameRef = useRef<number>(0) as Box<number>;

  useEffect(() => {
    setReduce(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  function maxAvg(): number {
    let m = 0.0001;
    countersRef.current.forEach((c) => { m = Math.max(m, avgMinutes(c)); });
    return m;
  }

  function calcFastestId(): string {
    const cs = countersRef.current;
    let best = cs[0];
    cs.forEach((c) => { if (avgMinutes(c) < avgMinutes(best)) best = c; });
    return best.id;
  }

  function tweenBar(c: Counter): void {
    if (c.anim) cancelAnimationFrame(c.anim);
    const mx = maxAvg();
    const to = 1 - Math.min(1, avgMinutes(c) / mx) * 0.7;
    const from = c.shownRatio;
    if (reduce) {
      c.shownRatio = to;
      setBarPct((p) => ({ ...p, [c.id]: to * 100 }));
      return;
    }
    let start = 0;
    function step(ts: number): void {
      if (start === 0) start = ts;
      const t = Math.min(1, (ts - start) / BAR_TWEEN_MS);
      const e = easeOutCubic(t);
      const v = from + (to - from) * e;
      c.shownRatio = v;
      setBarPct((p) => ({ ...p, [c.id]: v * 100 }));
      if (t < 1) { c.anim = requestAnimationFrame(step); } else { c.anim = 0; }
    }
    c.anim = requestAnimationFrame(step);
  }

  function recalcAll(): void {
    const cs = countersRef.current;
    cs.forEach((c) => {
      tweenBar(c);
      setMeta((p) => ({ ...p, [c.id]: c.processed + "명 처리 · 다음 예상 " + avgMinutes(c).toFixed(1) + "분 뒤" }));
    });
    setFastestId(calcFastestId());
  }

  function processNext(): void {
    const cs = countersRef.current;
    const c = cs[turnRef.current % cs.length];
    turnRef.current += 1;
    c.log.push(c.base + c.rand() * 1.4);
    if (c.log.length > SERVICE_LOG_MAX) c.log.shift();
    c.processed += 1;
    recalcAll();
    setStatus(c.label + " " + c.processed + "명째 처리 · 다음 예상 " + avgMinutes(c).toFixed(1) + "분 뒤.");
    forceTick((n) => n + 1);
  }

  function resetAll(): void {
    turnRef.current = 0;
    countersRef.current = makeCounters();
    recalcAll();
    setStatus("창구 현황을 초기화했습니다.");
    forceTick((n) => n + 1);
  }

  function stopDemo(): void { demoRef.current = false; }

  useEffect(() => {
    recalcAll();
    let t0 = 0;
    function tick(ts: number): void {
      if (t0 === 0) t0 = ts;
      const now = ts - t0;
      const sched = demoScheduleRef.current;
      if (!reduce && demoRef.current && demoIndexRef.current < sched.length && now >= sched[demoIndexRef.current]) {
        processNext();
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

  function onNext(): void { stopDemo(); processNext(); }
  function onReset(): void { stopDemo(); resetAll(); }

  function onKeyDown(e: { key: string; preventDefault: () => void }, fn: () => void): void {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); }
  }

  return (
    <main className={styles.stage}>
      <div className={styles.wmc}>
        <ul className={styles.list} role="list">
          {countersRef.current.map((c) => (
            <li key={c.id} className={[styles.row, c.id === fastestId ? styles.rowFastest : ""].join(" ")}>
              <span className={styles.label}>{c.label}</span>
              <div className={styles.track} aria-hidden="true"><div className={styles.bar} style={{ width: (barPct[c.id] || 0) + "%" }} /></div>
              <span className={styles.meta} aria-hidden="true">{meta[c.id]}</span>
            </li>
          ))}
        </ul>
        <p className={styles.status} aria-live="polite">{status}</p>
        <div className={styles.controls}>
          <button type="button" className={[styles.btn, styles.btnPrimary].join(" ")} onClick={onNext} onKeyDown={(e: { key: string; preventDefault: () => void }) => onKeyDown(e, onNext)}>다음 처리</button>
          <button type="button" className={styles.btn} onClick={onReset} onKeyDown={(e: { key: string; preventDefault: () => void }) => onKeyDown(e, onReset)}>초기화</button>
        </div>
      </div>
    </main>
  );
}
