// WaitingQueueTotalCountRollUpdown — vanilla 판(07-waiting-queue-total-count-roll-updown) 의 React 포트.
// 입장·퇴장이 있을 때마다 이전 값과 새 값의 차이를 계산해 자릿수 릴을 그 차이만큼 굴리고,
// 늘었는지 줄었는지를 계산해 보드에 is-up/is-down 을 잠깐 켰다 끈다.
import { useEffect, useRef, useState } from "react";
import styles from "./WaitingQueueTotalCountRollUpdown.module.scss";

type Box<T> = { current: T };

const COUNT_ROLL_MS = 420;
const DIGIT_STAGGER_MS = 60;
const FLASH_MS = 520;

function seedRand(seed: number): () => number {
  let s = seed >>> 0;
  return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

type Digit = { value: number; from: number; to: number; start: number; dur: number };

function digitsOf(n: number, len: number): number[] {
  const s = String(n).padStart(len, "0");
  const out: number[] = [];
  for (let i = 0; i < s.length; i += 1) out.push(s.charCodeAt(i) - 48);
  return out;
}

export default function WaitingQueueTotalCountRollUpdown() {
  const randRef = useRef<() => number>(seedRand(434071)) as Box<() => number>;
  const [status, setStatus] = useState("");
  const [reduce, setReduce] = useState(false);
  const [flashClass, setFlashClass] = useState("");
  const digitsRef = useRef<Digit[]>([{ value: 0, from: 0, to: 0, start: 0, dur: 0 }, { value: 0, from: 0, to: 0, start: 0, dur: 0 }]) as Box<Digit[]>;
  const reelRefs = useRef<Array<HTMLDivElement | null>>([null, null]) as Box<Array<HTMLDivElement | null>>;
  const totalRef = useRef<number>(18) as Box<number>;
  const flashUntilRef = useRef<number>(0) as Box<number>;
  const demoRef = useRef<boolean>(true) as Box<boolean>;
  const demoIndexRef = useRef<number>(0) as Box<number>;
  const demoScheduleRef = useRef<number[]>([200, 1200]) as Box<number[]>;
  const frameRef = useRef<number>(0) as Box<number>;

  useEffect(() => {
    setReduce(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  function paintReel(el: HTMLDivElement | null, value: number): void {
    if (!el) return;
    el.style.transform = "translateY(" + (-value * 10) + "%)";
  }

  function rollDigits(num: number, nowMs: number): void {
    const digits = digitsRef.current;
    const s = digitsOf(num, digits.length);
    if (reduce) {
      for (let i = 0; i < digits.length; i += 1) {
        digits[i].value = s[i]; digits[i].from = s[i]; digits[i].to = s[i]; digits[i].dur = 0;
        paintReel(reelRefs.current[i], s[i]);
      }
      return;
    }
    for (let i = 0; i < digits.length; i += 1) {
      const v = s[i];
      if (v === digits[i].to) continue;
      digits[i].from = digits[i].value;
      digits[i].to = v;
      digits[i].start = nowMs + i * DIGIT_STAGGER_MS;
      digits[i].dur = COUNT_ROLL_MS;
    }
  }

  function stepDigits(nowMs: number): void {
    const digits = digitsRef.current;
    const refs = reelRefs.current;
    for (let i = 0; i < digits.length; i += 1) {
      const d = digits[i];
      if (d.value === d.to && nowMs >= d.start) continue;
      if (nowMs < d.start) continue;
      const t = Math.min(1, (nowMs - d.start) / d.dur);
      const e = easeInOutCubic(t);
      let span = d.to - d.from;
      if (Math.abs(span) > 5) span = span > 0 ? span - 10 : span + 10;
      let cur = d.from + span * e;
      cur = ((cur % 10) + 10) % 10;
      d.value = t >= 1 ? d.to : cur;
      paintReel(refs[i], cur);
    }
  }

  function paintStatus(delta: number): void {
    const total = totalRef.current;
    const word = delta > 0 ? (delta + "명 늘어 " + total + "명") : delta < 0 ? ((-delta) + "명 줄어 " + total + "명") : (total + "명 대기중");
    setStatus(word + ".");
  }

  function applyDelta(delta: number, nowMs: number): void {
    if (delta === 0) { paintStatus(0); return; }
    const next = Math.max(0, Math.min(99, totalRef.current + delta));
    const actualDelta = next - totalRef.current;
    totalRef.current = next;
    rollDigits(totalRef.current, nowMs);
    setFlashClass(actualDelta > 0 ? styles.boardUp : actualDelta < 0 ? styles.boardDown : "");
    flashUntilRef.current = nowMs + FLASH_MS;
    paintStatus(actualDelta);
  }

  function join(nowMs: number): void { applyDelta(1 + Math.floor(randRef.current() * 3), nowMs); }
  function leave(nowMs: number): void { applyDelta(-(1 + Math.floor(randRef.current() * 2)), nowMs); }

  function resetAll(nowMs: number): void {
    totalRef.current = 18;
    rollDigits(totalRef.current, nowMs);
    setFlashClass("");
    paintStatus(0);
  }

  function stopDemo(): void { demoRef.current = false; }

  useEffect(() => {
    paintStatus(0);
    let t0 = 0;
    function tick(ts: number): void {
      if (t0 === 0) t0 = ts;
      const now = ts - t0;
      if (!reduce) {
        stepDigits(now);
        if (flashUntilRef.current && now >= flashUntilRef.current) {
          setFlashClass("");
          flashUntilRef.current = 0;
        }
        const sched = demoScheduleRef.current;
        if (demoRef.current && demoIndexRef.current < sched.length && now >= sched[demoIndexRef.current]) {
          if (demoIndexRef.current % 2 === 0) join(now); else leave(now);
          demoIndexRef.current += 1;
          if (demoIndexRef.current >= sched.length) {
            demoIndexRef.current = 0;
            demoScheduleRef.current = sched.map((v) => v + now + 2000);
          }
        }
      }
      frameRef.current = requestAnimationFrame(tick);
    }
    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduce]);

  function onJoin(): void { stopDemo(); join(performance.now()); }
  function onLeave(): void { stopDemo(); leave(performance.now()); }
  function onReset(): void { stopDemo(); resetAll(performance.now()); }

  function onKeyDown(e: { key: string; preventDefault: () => void }, fn: () => void): void {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); }
  }

  return (
    <main className={styles.stage}>
      <div className={styles.wtc}>
        <div className={[styles.board, flashClass].join(" ")}>
          <div className={styles.odometer} aria-hidden="true">
            {[0, 1].map((i) => (
              <div className={styles.digit} key={i}>
                <div className={styles.reel} ref={(el: HTMLDivElement | null) => { reelRefs.current[i] = el; }}>
                  {"0123456789".split("").map((ch) => <i key={ch}>{ch}</i>)}
                </div>
              </div>
            ))}
          </div>
          <span className={styles.unit}>명 대기중</span>
        </div>
        <p className={styles.status} aria-live="polite">{status}</p>
        <div className={styles.controls}>
          <button type="button" className={[styles.btn, styles.btnPrimary].join(" ")} onClick={onJoin} onKeyDown={(e: { key: string; preventDefault: () => void }) => onKeyDown(e, onJoin)}>입장</button>
          <button type="button" className={styles.btn} onClick={onLeave} onKeyDown={(e: { key: string; preventDefault: () => void }) => onKeyDown(e, onLeave)}>퇴장</button>
          <button type="button" className={styles.btn} onClick={onReset} onKeyDown={(e: { key: string; preventDefault: () => void }) => onKeyDown(e, onReset)}>초기화</button>
        </div>
      </div>
    </main>
  );
}
