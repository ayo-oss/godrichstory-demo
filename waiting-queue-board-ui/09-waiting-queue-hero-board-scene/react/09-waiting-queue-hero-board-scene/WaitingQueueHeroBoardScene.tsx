// WaitingQueueHeroBoardScene — vanilla 판(09-waiting-queue-hero-board-scene) 의 React 포트.
// HERO_CALL_ROLL_MS 호출 번호 굴림(01) + HERO_LIST_SPRING_STIFFNESS 목록 자리 이동(04) +
// HERO_COUNT_ROLL_MS 전체 인원 카운터(07) 를 한 화면에서 같은 호출 하나로 동시에 계산한다.
import { useEffect, useRef, useState } from "react";
import styles from "./WaitingQueueHeroBoardScene.module.scss";

type Box<T> = { current: T };

const HERO_CALL_ROLL_MS = 480;
const HERO_DIGIT_STAGGER_MS = 70;
const HERO_COUNT_ROLL_MS = 420;
const HERO_LIST_SPRING_STIFFNESS = 260;
const HERO_FLASH_MS = 520;
const SPRING_SETTLE_EASING = "linear(0.0, 0.051, 0.176, 0.341, 0.518, 0.685, 0.831, 0.947, 1.032, 1.087, 1.117, 1.126, 1.121, 1.105, 1.085, 1.062, 1.041, 1.022, 1.008, 0.997, 1)";

const HERO_CALL_BASE = 501;
const HERO_TOTAL_START = 18;

type Row = { id: string; ticket: string; note: string };

function heroRowsStart(): Row[] {
  return [
    { id: "h1", ticket: "501번", note: "대기 2분" },
    { id: "h2", ticket: "502번", note: "대기 6분" },
    { id: "h3", ticket: "503번", note: "대기 11분" },
    { id: "h4", ticket: "504번", note: "대기 15분" },
    { id: "h5", ticket: "505번", note: "대기 19분" }
  ];
}

function seedRand(seed: number): () => number {
  let s = seed >>> 0;
  return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function shiftDuration(gapPx: number): number {
  return Math.round(60 + 100000 / HERO_LIST_SPRING_STIFFNESS + Math.min(240, gapPx * 0.55));
}

type Digit = { value: number; from: number; to: number; start: number; dur: number };

function digitsOf(n: number, len: number): number[] {
  const s = String(n).padStart(len, "0");
  const out: number[] = [];
  for (let i = 0; i < s.length; i += 1) out.push(s.charCodeAt(i) - 48);
  return out;
}

export default function WaitingQueueHeroBoardScene() {
  const randRef = useRef<() => number>(seedRand(434091)) as Box<() => number>;
  const [rows, setRows] = useState<Row[]>(heroRowsStart);
  const [frontIndex, setFrontIndex] = useState(0);
  const [status, setStatus] = useState("");
  const [reduce, setReduce] = useState(false);
  const [flashClass, setFlashClass] = useState("");
  const callDigitsRef = useRef<Digit[]>([{ value: 0, from: 0, to: 0, start: 0, dur: 0 }, { value: 0, from: 0, to: 0, start: 0, dur: 0 }, { value: 0, from: 0, to: 0, start: 0, dur: 0 }]) as Box<Digit[]>;
  const totalDigitsRef = useRef<Digit[]>([{ value: 0, from: 0, to: 0, start: 0, dur: 0 }, { value: 0, from: 0, to: 0, start: 0, dur: 0 }]) as Box<Digit[]>;
  const callReelRefs = useRef<Array<HTMLDivElement | null>>([null, null, null]) as Box<Array<HTMLDivElement | null>>;
  const totalReelRefs = useRef<Array<HTMLDivElement | null>>([null, null]) as Box<Array<HTMLDivElement | null>>;
  const callNumRef = useRef<number>(HERO_CALL_BASE) as Box<number>;
  const totalRef = useRef<number>(HERO_TOTAL_START) as Box<number>;
  const nextTicketRef = useRef<number>(506) as Box<number>;
  const flashUntilRef = useRef<number>(0) as Box<number>;
  const demoRef = useRef<boolean>(true) as Box<boolean>;
  const demoIndexRef = useRef<number>(0) as Box<number>;
  const demoScheduleRef = useRef<number[]>([200, 900, 1500]) as Box<number[]>;
  const frameRef = useRef<number>(0) as Box<number>;

  useEffect(() => {
    setReduce(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  function paintReel(el: HTMLDivElement | null, value: number): void {
    if (!el) return;
    el.style.transform = "translateY(" + (-value * 10) + "%)";
  }

  function rollDigits(digits: Digit[], num: number, nowMs: number, rollMs: number): void {
    const s = digitsOf(num, digits.length);
    if (reduce) {
      const refs = digits === callDigitsRef.current ? callReelRefs.current : totalReelRefs.current;
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
      digits[i].start = nowMs + i * HERO_DIGIT_STAGGER_MS;
      digits[i].dur = rollMs;
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

  function flashTotal(dir: number, nowMs: number): void {
    setFlashClass(dir > 0 ? styles.countUp : dir < 0 ? styles.countDown : "");
    flashUntilRef.current = nowMs + HERO_FLASH_MS;
  }

  function paintStatus(): void {
    setStatus("호출 " + callNumRef.current + "번 · 대기 " + totalRef.current + "명");
  }

  function callFront(nowMs: number): void {
    const el = document.getElementById("whbRow-" + rows[frontIndex]);
    const gap = el ? el.offsetHeight + 8 : 40;
    if (frontIndex >= rows.length) return;
    if (!reduce && el) {
      const h = el.offsetHeight;
      el.style.height = h + "px";
      el.style.overflow = "hidden";
      el.style.boxSizing = "border-box";
      el.animate(
        [{ height: h + "px", opacity: 1 }, { height: "0px", opacity: 0 }],
        { duration: 220, easing: "ease-in", fill: "forwards" }
      );
      const list = document.getElementById("whbList");
      if (list) {
        const below = Array.prototype.slice.call(list.children, frontIndex + 1);
        const dur = shiftDuration(gap);
        below.forEach((b: Element) => {
          (b as HTMLElement).animate(
            [{ transform: "translateY(" + gap + "px)" }, { transform: "translateY(0px)" }],
            { duration: dur, easing: SPRING_SETTLE_EASING, fill: "both" }
          );
        });
      }
    }

    const nextRows = rows.slice();
    nextRows.splice(frontIndex, 1);
    setRows(nextRows);

    callNumRef.current = HERO_CALL_BASE + (HERO_ROWS_START_LEN - nextRows.length);
    rollDigits(callDigitsRef.current, callNumRef.current, nowMs, HERO_CALL_ROLL_MS);
    const nextTotal = Math.max(0, totalRef.current - 1);
    const dir = nextTotal - totalRef.current;
    totalRef.current = nextTotal;
    rollDigits(totalDigitsRef.current, totalRef.current, nowMs, HERO_COUNT_ROLL_MS);
    flashTotal(dir, nowMs);
    setFrontIndex(frontIndex);
    paintStatus();
  }

  const HERO_ROWS_START_LEN = 5;

  function joinQueue(nowMs: number): void {
    const ticket = nextTicketRef.current;
    nextTicketRef.current += 1;
    const id = "j" + ticket;
    setRows((prev) => prev.concat({ id, ticket: ticket + "번", note: "대기 접수" }));
    if (!reduce) {
      requestAnimationFrame(() => {
        const el = document.getElementById("whbRow-" + id);
        if (el) {
          el.animate(
            [{ opacity: 0, transform: "translateY(6px)" }, { opacity: 1, transform: "translateY(0px)" }],
            { duration: 240, easing: "ease-out" }
          );
        }
      });
    }
    const nextTotal = Math.min(99, totalRef.current + 1);
    const dir = nextTotal - totalRef.current;
    totalRef.current = nextTotal;
    rollDigits(totalDigitsRef.current, totalRef.current, nowMs, HERO_COUNT_ROLL_MS);
    flashTotal(dir, nowMs);
    void randRef;
    paintStatus();
  }

  function resetAll(nowMs: number): void {
    setRows(heroRowsStart());
    setFrontIndex(0);
    totalRef.current = HERO_TOTAL_START;
    callNumRef.current = HERO_CALL_BASE;
    nextTicketRef.current = 506;
    rollDigits(callDigitsRef.current, callNumRef.current, nowMs, HERO_CALL_ROLL_MS);
    rollDigits(totalDigitsRef.current, totalRef.current, nowMs, HERO_COUNT_ROLL_MS);
    setFlashClass("");
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
        stepDigits(totalDigitsRef.current, totalReelRefs.current, now);
        if (flashUntilRef.current && now >= flashUntilRef.current) {
          setFlashClass("");
          flashUntilRef.current = 0;
        }
        const sched = demoScheduleRef.current;
        if (demoRef.current && demoIndexRef.current < sched.length && now >= sched[demoIndexRef.current]) {
          if (demoIndexRef.current % 2 === 0) callFront(now); else joinQueue(now);
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
  }, [reduce, rows, frontIndex]);

  function onCall(): void { stopDemo(); callFront(performance.now()); }
  function onJoin(): void { stopDemo(); joinQueue(performance.now()); }
  function onReset(): void { stopDemo(); resetAll(performance.now()); }

  function onKeyDown(e: { key: string; preventDefault: () => void }, fn: () => void): void {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); }
  }

  return (
    <main className={styles.stage}>
      <div className={styles.whb}>
        <div className={styles.head}>
          <div className={styles.odometer} aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <div className={styles.digit} key={i}>
                <div className={styles.reel} ref={(el: HTMLDivElement | null) => { callReelRefs.current[i] = el; }}>
                  {"0123456789".split("").map((ch) => <i key={ch}>{ch}</i>)}
                </div>
              </div>
            ))}
          </div>
          <div className={[styles.countWrap, flashClass].join(" ")} aria-hidden="true">
            <div className={[styles.odometer, styles.odometerSmall].join(" ")}>
              {[0, 1].map((i) => (
                <div className={styles.digit} key={i}>
                  <div className={styles.reel} ref={(el: HTMLDivElement | null) => { totalReelRefs.current[i] = el; }}>
                    {"0123456789".split("").map((ch) => <i key={ch}>{ch}</i>)}
                  </div>
                </div>
              ))}
            </div>
            <span className={styles.countUnit}>명 대기중</span>
          </div>
        </div>
        <ul className={styles.list} id="whbList" role="list">
          {rows.map((r, i) => (
            <li key={r.id} id={"whbRow-" + r.id} className={[styles.item, i === frontIndex ? styles.itemNext : ""].join(" ")}>
              <span className={styles.ticket}>{r.ticket}</span>
              <span className={styles.note}>{r.note}</span>
            </li>
          ))}
        </ul>
        <p className={styles.status} aria-live="polite">{status}</p>
        <div className={styles.controls}>
          <button type="button" className={[styles.btn, styles.btnPrimary].join(" ")} disabled={rows.length === 0} onClick={onCall} onKeyDown={(e: { key: string; preventDefault: () => void }) => onKeyDown(e, onCall)}>다음 호출</button>
          <button type="button" className={styles.btn} onClick={onJoin} onKeyDown={(e: { key: string; preventDefault: () => void }) => onKeyDown(e, onJoin)}>입장</button>
          <button type="button" className={styles.btn} onClick={onReset} onKeyDown={(e: { key: string; preventDefault: () => void }) => onKeyDown(e, onReset)}>초기화</button>
        </div>
      </div>
    </main>
  );
}
