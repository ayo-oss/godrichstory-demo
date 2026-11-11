// WaitingQueueListShiftPositionSpring — vanilla 판(04-waiting-queue-list-shift-position-spring) 의
// React 포트. 맨 앞 순번이 빠지면 아래 행들이 이동할 거리(gap)를 실측해 FLIP + 스프링 감쇠
// (LIST_SHIFT_SPRING_STIFFNESS)로 자리를 메우고, 새 맨 앞 행은 is-next 계산으로 강조한다.
import { useEffect, useRef, useState } from "react";
import styles from "./WaitingQueueListShiftPositionSpring.module.scss";

type Box<T> = { current: T };

const LIST_SHIFT_SPRING_STIFFNESS = 260;
const SPRING_SETTLE_EASING = "linear(0.0, 0.051, 0.176, 0.341, 0.518, 0.685, 0.831, 0.947, 1.032, 1.087, 1.117, 1.126, 1.121, 1.105, 1.085, 1.062, 1.041, 1.022, 1.008, 0.997, 1)";

type Row = { id: string; ticket: string; note: string };

const ROWS: Row[] = [
  { id: "d1", ticket: "101번", note: "대기 3분" },
  { id: "d2", ticket: "102번", note: "대기 9분" },
  { id: "d3", ticket: "103번", note: "대기 14분" },
  { id: "d4", ticket: "104번", note: "대기 18분" },
  { id: "d5", ticket: "105번", note: "대기 22분" }
];

function shiftDuration(gapPx: number): number {
  return Math.round(60 + 100000 / LIST_SHIFT_SPRING_STIFFNESS + Math.min(240, gapPx * 0.55));
}

export default function WaitingQueueListShiftPositionSpring() {
  const [frontIndex, setFrontIndex] = useState(0);
  const [hiddenIds, setHiddenIds] = useState<string[]>([]);
  const [status, setStatus] = useState("101번이 다음 차례입니다.");
  const [reduce, setReduce] = useState(false);
  const rowRefs = useRef<Record<string, HTMLLIElement | null>>({}) as Box<Record<string, HTMLLIElement | null>>;
  const demoRef = useRef<boolean>(true) as Box<boolean>;
  const demoIndexRef = useRef<number>(0) as Box<number>;
  const demoScheduleRef = useRef<number[]>([200, 1200]) as Box<number[]>;
  const frameRef = useRef<number>(0) as Box<number>;

  useEffect(() => {
    setReduce(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  function visibleRows(excludeId?: string): HTMLLIElement[] {
    return ROWS.filter((r) => !hiddenIds.includes(r.id) && r.id !== excludeId)
      .map((r) => rowRefs.current[r.id])
      .filter((el): el is HTMLLIElement => !!el);
  }

  function callFront(): void {
    if (frontIndex >= ROWS.length) { setStatus("대기 목록이 비었습니다."); return; }
    const row = ROWS[frontIndex];
    const el = rowRefs.current[row.id];
    const below = visibleRows(row.id);
    const before = below.map((r) => r.getBoundingClientRect().top);
    const gap = (el ? el.offsetHeight : 0) + 8;

    if (!reduce && el) {
      const h = el.offsetHeight;
      el.style.height = h + "px";
      el.style.overflow = "hidden";
      el.style.boxSizing = "border-box";
      el.style.marginTop = "0px";
      el.style.marginBottom = "0px";
      el.animate(
        [{ height: h + "px", opacity: 1 }, { height: "0px", opacity: 0 }],
        { duration: 220, easing: "ease-in", fill: "forwards" }
      );
      const dur = shiftDuration(gap);
      below.forEach((rEl) => {
        rEl.animate(
          [
            { transform: "translateY(0px)" },
            { transform: "translateY(" + gap + "px)" },
            { transform: "translateY(0px)" }
          ],
          { duration: dur, delay: 220, easing: SPRING_SETTLE_EASING, fill: "both" }
        );
      });
    }

    setHiddenIds((prev) => prev.concat(row.id));
    const nextIdx = frontIndex + 1;
    setFrontIndex(nextIdx);
    const next = ROWS[nextIdx];
    setStatus(next ? row.ticket + " 호출 완료 · 다음은 " + next.ticket : row.ticket + " 호출 완료 · 대기 목록이 비었습니다.");
    void before;
  }

  function restoreAll(): void {
    Object.keys(rowRefs.current).forEach((id) => {
      const el = rowRefs.current[id];
      if (!el) return;
      el.getAnimations().forEach((a) => a.cancel());
      el.style.height = "";
      el.style.overflow = "";
      el.style.marginTop = "";
      el.style.marginBottom = "";
    });
    setHiddenIds([]);
    setFrontIndex(0);
    setStatus("대기 목록을 되돌렸습니다.");
  }

  function stopDemo(): void { demoRef.current = false; }

  useEffect(() => {
    let t0 = 0;
    function tick(ts: number): void {
      if (t0 === 0) t0 = ts;
      const now = ts - t0;
      const sched = demoScheduleRef.current;
      if (!reduce && demoRef.current && demoIndexRef.current < sched.length && now >= sched[demoIndexRef.current]) {
        if (frontIndexIsDone()) { restoreAll(); } else { callFront(); }
        demoIndexRef.current += 1;
        if (demoIndexRef.current >= sched.length) {
          demoIndexRef.current = 0;
          demoScheduleRef.current = sched.map((v) => v + now + 2000);
        }
      }
      frameRef.current = requestAnimationFrame(tick);
    }
    function frontIndexIsDone(): boolean { return frontIndex >= ROWS.length; }
    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduce, frontIndex]);

  function onCall(): void { stopDemo(); callFront(); }
  function onReset(): void { stopDemo(); restoreAll(); }

  function onKeyDown(e: { key: string; preventDefault: () => void }, fn: () => void): void {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); }
  }

  return (
    <main className={styles.stage}>
      <div className={styles.wls}>
        <ul className={styles.list} role="list">
          {ROWS.map((r, i) => (
            <li
              key={r.id}
              className={[styles.item, i === frontIndex ? styles.itemNext : ""].join(" ")}
              style={{ display: hiddenIds.includes(r.id) ? "none" : "" }}
              ref={(el: HTMLLIElement | null) => { rowRefs.current[r.id] = el; }}
            >
              <span className={styles.ticket}>{r.ticket}</span>
              <span className={styles.note}>{r.note}</span>
            </li>
          ))}
        </ul>
        <div className={styles.controls}>
          <button type="button" className={styles.btn} onClick={onReset} onKeyDown={(e: { key: string; preventDefault: () => void }) => onKeyDown(e, onReset)}>되돌리기</button>
          <button type="button" className={[styles.btn, styles.btnPrimary].join(" ")} disabled={frontIndex >= ROWS.length} onClick={onCall} onKeyDown={(e: { key: string; preventDefault: () => void }) => onKeyDown(e, onCall)}>호출 완료</button>
        </div>
        <p className={styles.status} aria-live="polite">{status}</p>
      </div>
    </main>
  );
}
