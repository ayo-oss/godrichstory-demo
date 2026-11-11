// WaitingQueuePriorityLaneBadgeShift — vanilla 판(08-waiting-queue-priority-lane-badge-shift) 의
// React 포트. 우선순위 차이로 끼어들 자리를 계산하고, 뒤 줄들은 FLIP 실측 거리만큼 스프링
// 감쇠로 내려가며, 새 배지 행은 확대+페이드로 끼어든다.
import { useEffect, useRef, useState } from "react";
import styles from "./WaitingQueuePriorityLaneBadgeShift.module.scss";

type Box<T> = { current: T };

const PRIORITY_SHIFT_SPRING_STIFFNESS = 260;
const SPRING_SETTLE_EASING = "linear(0.0, 0.051, 0.176, 0.341, 0.518, 0.685, 0.831, 0.947, 1.032, 1.087, 1.117, 1.126, 1.121, 1.105, 1.085, 1.062, 1.041, 1.022, 1.008, 0.997, 1)";

type Row = { id: string; ticket: string; note: string; weight: number };

function initialOrder(): Row[] {
  return [
    { id: "r1", ticket: "108번", note: "일반 접수", weight: 0 },
    { id: "r2", ticket: "109번", note: "일반 접수", weight: 0 },
    { id: "r3", ticket: "110번", note: "일반 접수", weight: 0 },
    { id: "r4", ticket: "111번", note: "일반 접수", weight: 0 }
  ];
}

function shiftDuration(gapPx: number): number {
  return Math.round(60 + 100000 / PRIORITY_SHIFT_SPRING_STIFFNESS + Math.min(240, gapPx * 0.55));
}

export default function WaitingQueuePriorityLaneBadgeShift() {
  const [order, setOrder] = useState<Row[]>(initialOrder);
  const [status, setStatus] = useState("우선 대상이 접수되면 계산된 자리로 끼어듭니다.");
  const [reduce, setReduce] = useState(false);
  const rowRefs = useRef<Record<string, HTMLLIElement | null>>({}) as Box<Record<string, HTMLLIElement | null>>;
  const orderRef = useRef<Row[]>(order) as Box<Row[]>;
  const priorityCountRef = useRef<number>(0) as Box<number>;
  const demoRef = useRef<boolean>(true) as Box<boolean>;
  const demoIndexRef = useRef<number>(0) as Box<number>;
  const demoScheduleRef = useRef<number[]>([200, 1200]) as Box<number[]>;
  const frameRef = useRef<number>(0) as Box<number>;

  useEffect(() => {
    setReduce(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  function priorityInsertIndex(newWeight: number): number {
    const rows = orderRef.current;
    let idx = 0;
    for (let i = 0; i < rows.length; i += 1) {
      if (rows[i].weight >= newWeight) idx = i + 1; else break;
    }
    return idx;
  }

  function insertPriority(): void {
    priorityCountRef.current += 1;
    const newRow: Row = { id: "p" + priorityCountRef.current, ticket: (301 + priorityCountRef.current - 1) + "번", note: "우선 호출", weight: 10 };
    const idx = priorityInsertIndex(newRow.weight);
    const next = orderRef.current.slice();
    next.splice(idx, 0, newRow);
    orderRef.current = next;
    setOrder(next);

    if (!reduce) {
      requestAnimationFrame(() => {
        const list = document.getElementById("wplList");
        if (!list) return;
        const below = Array.prototype.slice.call(list.children, idx + 1);
        below.forEach((el: Element, i: number) => {
          const li = el as HTMLElement;
          const li2 = rowRefs.current[next[idx + 1 + i] ? next[idx + 1 + i].id : ""];
          void li;
          if (!li2) return;
          const gap = li2.offsetHeight + 8;
          li2.animate(
            [
              { transform: "translateY(" + -gap + "px)" },
              { transform: "translateY(0px)" }
            ],
            { duration: shiftDuration(gap), easing: SPRING_SETTLE_EASING }
          );
        });
        const newEl = rowRefs.current[newRow.id];
        if (newEl) {
          newEl.animate(
            [{ opacity: 0, transform: "scale(.85)" }, { opacity: 1, transform: "scale(1)" }],
            { duration: 260, easing: "ease-out" }
          );
        }
      });
    }

    setStatus(newRow.ticket + " 우선 접수 · " + (idx + 1) + "번째 자리로 끼어들었습니다.");
  }

  function resetAll(): void {
    priorityCountRef.current = 0;
    orderRef.current = initialOrder();
    setOrder(orderRef.current);
    setStatus("대기 목록을 초기화했습니다.");
  }

  function stopDemo(): void { demoRef.current = false; }

  useEffect(() => {
    let t0 = 0;
    function tick(ts: number): void {
      if (t0 === 0) t0 = ts;
      const now = ts - t0;
      const sched = demoScheduleRef.current;
      if (!reduce && demoRef.current && demoIndexRef.current < sched.length && now >= sched[demoIndexRef.current]) {
        if (priorityCountRef.current >= 2) { resetAll(); } else { insertPriority(); }
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

  function onInsert(): void { stopDemo(); insertPriority(); }
  function onReset(): void { stopDemo(); resetAll(); }

  function onKeyDown(e: { key: string; preventDefault: () => void }, fn: () => void): void {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); }
  }

  return (
    <main className={styles.stage}>
      <div className={styles.wpl}>
        <ul className={styles.list} id="wplList" role="list">
          {order.map((row) => (
            <li
              key={row.id}
              className={[styles.item, row.weight > 0 ? styles.itemPriority : ""].join(" ")}
              ref={(el: HTMLLIElement | null) => { rowRefs.current[row.id] = el; }}
            >
              {row.weight > 0 ? <span className={styles.badge}>우선</span> : <span className={styles.spacer} />}
              <span className={styles.ticket}>{row.ticket}</span>
              <span className={styles.note}>{row.note}</span>
            </li>
          ))}
        </ul>
        <p className={styles.status} aria-live="polite">{status}</p>
        <div className={styles.controls}>
          <button type="button" className={[styles.btn, styles.btnPrimary].join(" ")} onClick={onInsert} onKeyDown={(e: { key: string; preventDefault: () => void }) => onKeyDown(e, onInsert)}>우선 접수</button>
          <button type="button" className={styles.btn} onClick={onReset} onKeyDown={(e: { key: string; preventDefault: () => void }) => onKeyDown(e, onReset)}>초기화</button>
        </div>
      </div>
    </main>
  );
}
