// WaitingQueueCallNumberRoll — vanilla 판(01-waiting-queue-call-number-roll-remaining) 의 React 포트.
// 새 순번이 호출될 때마다 남은 대기 인원(총원 - 호출된 인원)을 다시 계산해 자릿수 릴로 굴려 내리고,
// 순번 숫자도 자리마다 CALL_NUMBER_ROLL_MS 동안 굴러간다 — CSS 트랜지션이 아니라 rAF 보간.
import { useEffect, useRef, useState } from "react";
import styles from "./WaitingQueueCallNumberRoll.module.scss";

type Box<T> = { current: T };

const CALL_NUMBER_ROLL_MS = 480;
const DIGIT_STAGGER_MS = 70;
const TOTAL_PARTIES = 42;
const CALL_BASE = 101;

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

function flash(el: HTMLElement | null, cls: string, reduce: boolean): void {
  if (reduce || !el) return;
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
}

export default function WaitingQueueCallNumberRoll() {
  seedRand(434011);
  const [status, setStatus] = useState("");
  const [reduce, setReduce] = useState(false);
  const callDigitsRef = useRef<Digit[]>([{ value: 0, from: 0, to: 0, start: 0, dur: 0 }, { value: 0, from: 0, to: 0, start: 0, dur: 0 }, { value: 0, from: 0, to: 0, start: 0, dur: 0 }]) as Box<Digit[]>;
  const remainDigitsRef = useRef<Digit[]>([{ value: 0, from: 0, to: 0, start: 0, dur: 0 }, { value: 0, from: 0, to: 0, start: 0, dur: 0 }]) as Box<Digit[]>;
  const callReelRefs = useRef<Array<HTMLDivElement | null>>([null, null, null]) as Box<Array<HTMLDivElement | null>>;
  const remainReelRefs = useRef<Array<HTMLDivElement | null>>([null, null]) as Box<Array<HTMLDivElement | null>>;
  const callNumRef = useRef<number>(CALL_BASE) as Box<number>;
  const remainRef = useRef<number>(TOTAL_PARTIES) as Box<number>;
  const callIndexRef = useRef<number>(0) as Box<number>;
  const demoRef = useRef<boolean>(true) as Box<boolean>;
  const demoIndexRef = useRef<number>(0) as Box<number>;
  const demoScheduleRef = useRef<number[]>([200, 1200]) as Box<number[]>;
  const frameRef = useRef<number>(0) as Box<number>;
  const boardRef = useRef<HTMLDivElement | null>(null) as Box<HTMLDivElement | null>;

  useEffect(() => {
    setReduce(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  function paintReel(el: HTMLDivElement | null, value: number): void {
    if (!el) return;
    el.style.transform = "translateY(" + (-value * 10) + "%)";
  }

  function rollDigits(digits: Digit[], num: number, nowMs: number): void {
    if (digits === callDigitsRef.current) flash(boardRef.current, styles.isFlash, reduce);
    const s = digitsOf(num, digits.length);
    if (reduce) {
      const refs = digits === callDigitsRef.current ? callReelRefs.current : remainReelRefs.current;
      for (let i = 0; i < digits.length; i += 1) {
        digits[i].value = s[i]; digits[i].from = s[i]; digits[i].to = s[i]; digits[i].dur = 0;
        paintReel(refs[i], s[i]);
      }
      return;
    }
    for (let i = 0; i < digits.length; i += 1) {
      const v = s[i];
      if (v === digits[i].to) continue;
      digits[i].from = digits[i].value;
      digits[i].to = v;
      digits[i].start = nowMs + i * DIGIT_STAGGER_MS;
      digits[i].dur = CALL_NUMBER_ROLL_MS;
    }
  }

  function stepDigits(digits: Digit[], refs: Array<HTMLDivElement | null>, nowMs: number): void {
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

  function paintStatus(): void {
    setStatus("호출 번호 " + callNumRef.current + " · 남은 " + remainRef.current + "명");
  }

  function callNext(nowMs: number): void {
    if (remainRef.current <= 0) { paintStatus(); return; }
    callIndexRef.current += 1;
    callNumRef.current = CALL_BASE + callIndexRef.current - 1;
    remainRef.current = Math.max(0, TOTAL_PARTIES - callIndexRef.current);
    rollDigits(callDigitsRef.current, callNumRef.current, nowMs);
    rollDigits(remainDigitsRef.current, remainRef.current, nowMs);
    paintStatus();
  }

  function resetAll(nowMs: number): void {
    callIndexRef.current = 0;
    callNumRef.current = CALL_BASE;
    remainRef.current = TOTAL_PARTIES;
    rollDigits(callDigitsRef.current, 0, nowMs);
    rollDigits(remainDigitsRef.current, remainRef.current, nowMs);
    paintStatus();
  }

  function stopDemo(): void { demoRef.current = false; }

  useEffect(() => {
    paintStatus();
    let t0 = 0;
    function tick(ts: number): void {
      if (t0 === 0) t0 = ts;
      const now = ts - t0;
      if (!reduce) {
        stepDigits(callDigitsRef.current, callReelRefs.current, now);
        stepDigits(remainDigitsRef.current, remainReelRefs.current, now);
        const sched = demoScheduleRef.current;
        if (demoRef.current && demoIndexRef.current < sched.length && now >= sched[demoIndexRef.current]) {
          if (remainRef.current <= 0) { resetAll(now); } else { callNext(now); }
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

  function onNext(): void { stopDemo(); callNext(performance.now()); }
  function onReset(): void { stopDemo(); resetAll(performance.now()); }

  function onKeyDown(e: { key: string; preventDefault: () => void }, fn: () => void): void {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); }
  }

  return (
    <main className={styles.stage}>
      <div className={styles.wcn}>
        <div className={styles.board} ref={boardRef}>
          <div className={styles.odometer} aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <div className={styles.digit} key={i}>
                <div className={styles.reel} ref={(el: HTMLDivElement | null) => { callReelRefs.current[i] = el; }}>
                  {"0123456789".split("").map((ch) => <i key={ch}>{ch}</i>)}
                </div>
              </div>
            ))}
          </div>
          <div className={styles.remainWrap} aria-hidden="true">
            <span className={styles.remainLabel}>남은</span>
            <div className={[styles.odometer, styles.odometerSmall].join(" ")}>
              {[0, 1].map((i) => (
                <div className={styles.digit} key={i}>
                  <div className={styles.reel} ref={(el: HTMLDivElement | null) => { remainReelRefs.current[i] = el; }}>
                    {"0123456789".split("").map((ch) => <i key={ch}>{ch}</i>)}
                  </div>
                </div>
              ))}
            </div>
            <span className={styles.remainUnit}>명</span>
          </div>
        </div>
        <p className={styles.status} aria-live="polite">{status}</p>
        <div className={styles.controls}>
          <button type="button" className={styles.btn} onClick={onReset} onKeyDown={(e: { key: string; preventDefault: () => void }) => onKeyDown(e, onReset)}>처음으로</button>
          <button type="button" className={[styles.btn, styles.btnPrimary].join(" ")} onClick={onNext} onKeyDown={(e: { key: string; preventDefault: () => void }) => onKeyDown(e, onNext)}>다음 호출</button>
        </div>
      </div>
    </main>
  );
}
