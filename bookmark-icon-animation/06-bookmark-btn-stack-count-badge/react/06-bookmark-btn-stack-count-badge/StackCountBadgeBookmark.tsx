// StackCountBadgeBookmark — vanilla 판(run/416/demo/06-bookmark-btn-stack-count-badge/index.html) 의 React 포트.
// 값 하나: 자릿수 인덱스(오른쪽부터) × BOOKMARK_COUNT_STAGGER_MS = 그 칸이 구르기 시작하는 지연 시간.
import { useEffect, useRef, useState } from "react";
import styles from "./StackCountBadgeBookmark.module.scss";

type Box<T> = { current: T };
type Column = { delay: number; start: number | null; from: string; to: string };

const BOOKMARK_COUNT_STAGGER_MS = 40;
const DIGIT_ROLL_MS = 260;
const CYCLE_S = 2;

function pad2(n: number): string {
  return (n < 10 ? "0" : "") + n;
}

export default function StackCountBadgeBookmark() {
  const rowRef = useRef<HTMLDivElement | null>(null);
  const oldRefs = useRef<Array<HTMLSpanElement | null>>([null, null]) as Box<Array<HTMLSpanElement | null>>;
  const newRefs = useRef<Array<HTMLSpanElement | null>>([null, null]) as Box<Array<HTMLSpanElement | null>>;
  const countRef = useRef<number>(9) as Box<number>;
  const savedRef = useRef<boolean>(false) as Box<boolean>;
  const pendingRef = useRef<boolean>(false) as Box<boolean>;
  const frameRef = useRef<number>(0) as Box<number>;
  const columnsRef = useRef<Column[]>([
    { delay: 1 * BOOKMARK_COUNT_STAGGER_MS, start: null, from: "0", to: "0" },
    { delay: 0 * BOOKMARK_COUNT_STAGGER_MS, start: null, from: "9", to: "9" },
  ]) as Box<Column[]>;
  const [status, setStatus] = useState("저장 전");
  const [pressed, setPressed] = useState(false);
  const [demo, setDemo] = useState(true);
  const [reduce, setReduce] = useState(false);

  function beginRoll(now: number): void {
    const next = savedRef.current ? countRef.current + 1 : countRef.current - 1;
    const fromStr = pad2(countRef.current);
    const toStr = pad2(next);
    countRef.current = next;
    const cols = columnsRef.current;
    for (let i = 0; i < 2; i++) {
      cols[i].from = fromStr[i];
      cols[i].to = toStr[i];
      cols[i].start = now + cols[i].delay;
    }
    setStatus(savedRef.current ? "저장됨" : "저장 전");
    const row = rowRef.current;
    if (row) {
      row.classList.add(styles.rowPulse);
      window.setTimeout(() => { row.classList.remove(styles.rowPulse); }, 320);
    }
  }

  function renderColumns(now: number): void {
    const cols = columnsRef.current;
    for (let i = 0; i < 2; i++) {
      const col = cols[i];
      const oldEl = oldRefs.current[i];
      const newEl = newRefs.current[i];
      if (!oldEl || !newEl) continue;
      oldEl.textContent = col.from;
      newEl.textContent = col.to;
      let p = 0;
      if (col.start !== null) {
        const raw = (now - col.start) / DIGIT_ROLL_MS;
        p = Math.max(0, Math.min(1, raw));
        if (raw >= 1) { col.start = null; }
      }
      const eased = 1 - Math.pow(1 - p, 2);
      oldEl.style.transform = "translateY(" + (-eased * 100).toFixed(1) + "%)";
      newEl.style.transform = "translateY(" + ((1 - eased) * 100).toFixed(1) + "%)";
    }
  }

  useEffect(() => {
    setReduce(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(() => {
    let start = 0;
    let prevT = 0;
    let toggledA = false;
    let toggledB = false;
    function loop(now: number): void {
      if (start === 0) start = now;
      if (pendingRef.current) { beginRoll(now); pendingRef.current = false; }
      const t = ((now - start) / 1000) % CYCLE_S;
      if (t < prevT) { toggledA = false; toggledB = false; }
      prevT = t;
      if (!reduce && demo) {
        if (!toggledA && t > 0.3) {
          toggledA = true; savedRef.current = true; setPressed(true); beginRoll(now);
        }
        if (!toggledB && t > 1.3) {
          toggledB = true; savedRef.current = false; setPressed(false); beginRoll(now);
        }
      }
      if (reduce) {
        for (let i = 0; i < 2; i++) { columnsRef.current[i].start = null; }
      }
      renderColumns(now);
      frameRef.current = requestAnimationFrame(loop);
    }
    frameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameRef.current);
  }, [reduce, demo]);

  function onClick(): void {
    setDemo(false);
    const v = !savedRef.current;
    savedRef.current = v;
    setPressed(v);
    pendingRef.current = true;
  }

  return (
    <main className={styles.stage}>
      <div className={styles.cb}>
        <p className={styles.caption}>저장 수</p>
        <div className={styles.row} ref={rowRef}>
          <span className={styles.rowTitle}>디자인 영감 모음</span>
          <button className={styles.btn} type="button" aria-pressed={pressed} onClick={onClick}>
            <svg className={styles.icon} viewBox="0 0 24 24" width={20} height={20} aria-hidden="true" focusable="false">
              <path className={styles.shape} d="M6.5 3A1.5 1.5 0 0 1 8 1.5h8A1.5 1.5 0 0 1 17.5 3v18.2a.9.9 0 0 1-1.38.76L12 19.1l-4.12 2.86A.9.9 0 0 1 6.5 21.2Z" />
            </svg>
            <span className={styles.badge} aria-live="polite">
              <span className={styles.digit}>
                <span className={styles.digitOld} ref={(el: HTMLSpanElement | null) => { oldRefs.current[0] = el; }}>0</span>
                <span className={styles.digitNew} ref={(el: HTMLSpanElement | null) => { newRefs.current[0] = el; }}>0</span>
              </span>
              <span className={styles.digit}>
                <span className={styles.digitOld} ref={(el: HTMLSpanElement | null) => { oldRefs.current[1] = el; }}>9</span>
                <span className={styles.digitNew} ref={(el: HTMLSpanElement | null) => { newRefs.current[1] = el; }}>9</span>
              </span>
            </span>
          </button>
        </div>
        <p className={styles.status}>{status}</p>
      </div>
    </main>
  );
}
