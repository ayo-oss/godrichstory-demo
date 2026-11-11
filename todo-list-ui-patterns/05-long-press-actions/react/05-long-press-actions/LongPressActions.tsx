// LongPressActions — vanilla 판(run/377/demo/05-long-press-actions/index.html) 의 React 포트.
// 계산 겹: 실제 경과 시간(elapsed) / LONGPRESS_HOLD_MS 비율을 원 둘레 길이에 곱해 링을 채운다.
import { useEffect, useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
// KeyboardEvent 는 "react" 스텁이 export 하지 않는다(demo.py ambient.d.ts) — lib.dom 의 전역 타입을 그대로 쓴다.
import styles from "./LongPressActions.module.scss";

type Box<T> = { current: T };

const LONGPRESS_HOLD_MS = 500;
const CIRC = 2 * Math.PI * 14;

const ROWS = [
  { id: 0, text: "우편함 확인하기" },
  { id: 1, text: "화분 물 주기" },
];

export default function LongPressActions() {
  const [isDemo, setIsDemo] = useState(true);
  const [ratios, setRatios] = useState([0, 0]);
  const [pressing, setPressing] = useState([false, false]);
  const [actionsOpen, setActionsOpen] = useState([false, false]);
  const rafRefs = useRef([0, 0]) as unknown as Box<number[]>;
  const timerRef = useRef(0) as unknown as Box<number>;

  function human() {
    if (isDemo) { setIsDemo(false); window.clearInterval(timerRef.current); }
  }

  function startPress(i: number, startTime: number) {
    setPressing(function (p) { const n = p.slice(); n[i] = true; return n; });
    function tick(now: number) {
      const elapsed = now - startTime;
      const ratio = Math.min(1, Math.max(0, elapsed / LONGPRESS_HOLD_MS));
      setRatios(function (r) { const n = r.slice(); n[i] = ratio; return n; });
      if (ratio >= 1) {
        setActionsOpen(function (a) { const n = a.slice(); n[i] = true; return n; });
        cancelPress(i);
        return;
      }
      rafRefs.current[i] = requestAnimationFrame(tick);
    }
    rafRefs.current[i] = requestAnimationFrame(tick);
  }

  function cancelPress(i: number) {
    setPressing(function (p) { const n = p.slice(); n[i] = false; return n; });
    setRatios(function (r) { const n = r.slice(); n[i] = 0; return n; });
    cancelAnimationFrame(rafRefs.current[i]);
  }

  function closeActions(i: number) {
    setActionsOpen(function (a) { const n = a.slice(); n[i] = false; return n; });
  }

  useEffect(function () {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    let cursor = 0;
    function autoStep() {
      const i = cursor;
      startPress(i, performance.now() - LONGPRESS_HOLD_MS * 0.02);
      window.setTimeout(function () {
        window.setTimeout(function () { closeActions(i); }, 700);
      }, LONGPRESS_HOLD_MS + 60);
      cursor = (cursor + 1) % ROWS.length;
    }
    autoStep();
    timerRef.current = window.setInterval(autoStep, 1900);
    return function () {
      window.clearInterval(timerRef.current);
      rafRefs.current.forEach(function (id) { cancelAnimationFrame(id); });
    };
    // eslint-disable-next-line
  }, []);

  return (
    <main className={styles.stage}>
      <ul className={styles.list + (isDemo ? " " + styles.isDemo : "")}>
        {ROWS.map(function (row, i) {
          const offset = CIRC * (1 - ratios[i]);
          return (
            <li
              key={row.id}
              className={styles.row + (pressing[i] ? " " + styles.pressing : "")}
              tabIndex={0}
              role="button"
              aria-haspopup="true"
              aria-label={row.text + " — 길게 눌러 액션 보기"}
              onPointerDown={function () { human(); startPress(i, performance.now()); }}
              onPointerUp={function () { cancelPress(i); }}
              onPointerLeave={function () { cancelPress(i); }}
              onKeyDown={function (e: KeyboardEvent) {
                human();
                if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setActionsOpen(function (a) { const n = a.slice(); n[i] = true; return n; }); }
                else if (e.key === "Escape") { closeActions(i); }
              }}
            >
              <span className={styles.ring} aria-hidden="true">
                <svg viewBox="0 0 32 32">
                  <circle className={styles.ringTrack} cx={16} cy={16} r={14} />
                  <circle className={styles.ringFill} cx={16} cy={16} r={14} style={{ strokeDasharray: CIRC.toFixed(2), strokeDashoffset: offset.toFixed(2) }} />
                </svg>
              </span>
              <span className={styles.rowText}>{row.text}</span>
              <span className={styles.actions} data-open={actionsOpen[i] ? "true" : "false"}>
                <button className={styles.actEdit} type="button" aria-label="수정" onClick={function (e: ReactMouseEvent) { e.stopPropagation(); human(); closeActions(i); }}>수정</button>
                <button className={styles.actDel} type="button" aria-label="삭제" onClick={function (e: ReactMouseEvent) { e.stopPropagation(); human(); closeActions(i); }}>삭제</button>
              </span>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
