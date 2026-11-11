// ReorderIndicator — vanilla 판(run/377/demo/06-reorder-indicator/index.html) 의 React 포트.
// 계산 겹: 포인터 Y 를 각 행의 실측 경계와 비교해 삽입선 위치를 정한다. 항목은 놓을 때만 옮긴다.
import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
// KeyboardEvent 는 "react" 스텁이 export 하지 않는다(demo.py ambient.d.ts) — lib.dom 의 전역 타입을 그대로 쓴다.
import styles from "./ReorderIndicator.module.scss";

type Box<T> = { current: T };

export default function ReorderIndicator() {
  const [isDemo, setIsDemo] = useState(true);
  const [order, setOrder] = useState(["시장 조사 정리", "초안 작성", "팀 검토 요청", "최종본 제출"]);
  const [liveNote, setLiveNote] = useState("");
  const [lineTop, setLineTop] = useState<number | null>(null);
  const listRef = useRef(null) as unknown as Box<HTMLUListElement>;
  const rowRefs = useRef([]) as unknown as Box<(HTMLLIElement | null)[]>;
  const handleRefs = useRef([]) as unknown as Box<(HTMLButtonElement | null)[]>;
  const dragIndexRef = useRef(-1) as unknown as Box<number>;
  const [draggingIndex, setDraggingIndex] = useState(-1);
  const timerRef = useRef(0) as unknown as Box<number>;
  const focusNextRef = useRef(-1) as unknown as Box<number>;

  function human() {
    if (isDemo) { setIsDemo(false); window.clearInterval(timerRef.current); }
  }

  function gapIndexFor(pointerY: number, excludeIndex: number) {
    const rows = rowRefs.current.filter(function (_r, i) { return i !== excludeIndex; });
    for (let i = 0; i < rows.length; i++) {
      const el = rows[i];
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      const mid = rect.top + rect.height / 2;
      if (pointerY < mid) return i;
    }
    return rows.length;
  }

  function showLineAt(gapIndex: number, excludeIndex: number) {
    const list = listRef.current;
    if (!list) return;
    const rows = rowRefs.current.filter(function (_r, i) { return i !== excludeIndex; });
    const listRect = list.getBoundingClientRect();
    let y;
    if (rows.length === 0) y = 0;
    else if (gapIndex <= 0) y = (rows[0] as HTMLLIElement).getBoundingClientRect().top - listRect.top - 3;
    else if (gapIndex >= rows.length) y = (rows[rows.length - 1] as HTMLLIElement).getBoundingClientRect().bottom - listRect.top + 3;
    else {
      const a = (rows[gapIndex - 1] as HTMLLIElement).getBoundingClientRect();
      const b = (rows[gapIndex] as HTMLLIElement).getBoundingClientRect();
      y = (a.bottom + b.top) / 2 - listRect.top;
    }
    setLineTop(y);
  }

  function commitMove(fromIndex: number, gapIndex: number) {
    setOrder(function (prev) {
      const item = prev[fromIndex];
      const rest = prev.slice(0, fromIndex).concat(prev.slice(fromIndex + 1));
      rest.splice(gapIndex, 0, item);
      setLiveNote('"' + item + '" 항목을 ' + (gapIndex + 1) + "번째 자리로 옮겼습니다.");
      return rest;
    });
  }

  function onHandlePointerDown(i: number, e: ReactPointerEvent<HTMLButtonElement>) {
    human();
    dragIndexRef.current = i;
    setDraggingIndex(i);
    (e.target as HTMLButtonElement).setPointerCapture(e.pointerId);
  }

  function onHandlePointerMove(e: ReactPointerEvent<HTMLButtonElement>) {
    if (dragIndexRef.current < 0) return;
    const gap = gapIndexFor(e.clientY, dragIndexRef.current);
    showLineAt(gap, dragIndexRef.current);
  }

  function onHandlePointerUp(e: ReactPointerEvent<HTMLButtonElement>) {
    if (dragIndexRef.current < 0) return;
    const gap = gapIndexFor(e.clientY, dragIndexRef.current);
    setLineTop(null);
    const from = dragIndexRef.current;
    dragIndexRef.current = -1;
    setDraggingIndex(-1);
    commitMove(from, gap);
  }

  function onHandleKeyDown(i: number, e: KeyboardEvent) {
    human();
    if (e.key === "ArrowUp" && i > 0) {
      e.preventDefault();
      setOrder(function (prev) {
        const n = prev.slice();
        const t = n[i - 1]; n[i - 1] = n[i]; n[i] = t;
        return n;
      });
      focusNextRef.current = i - 1;
    } else if (e.key === "ArrowDown" && i < order.length - 1) {
      e.preventDefault();
      setOrder(function (prev) {
        const n = prev.slice();
        const t = n[i + 1]; n[i + 1] = n[i]; n[i] = t;
        return n;
      });
      focusNextRef.current = i + 1;
    }
  }

  // 화살표로 옮긴 뒤에도 같은 손잡이를 계속 조작할 수 있도록, 옮겨간 자리로 포커스를 따라가게 한다.
  useEffect(function () {
    if (focusNextRef.current < 0) return;
    const target = handleRefs.current[focusNextRef.current];
    focusNextRef.current = -1;
    if (target) target.focus({ preventScroll: true });
  }, [order]);

  useEffect(function () {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    function autoStep() {
      const list = listRef.current;
      const fromRow = rowRefs.current[0];
      if (!list || !fromRow) return;
      const listRect = list.getBoundingClientRect();
      const fromRect = fromRow.getBoundingClientRect();
      const targetY = listRect.bottom - 8;
      dragIndexRef.current = 0;
      setDraggingIndex(0);
      const steps = 16;
      let i = 0;
      const iv = window.setInterval(function () {
        i++;
        const y = fromRect.top + (targetY - fromRect.top) * (i / steps);
        const gap = gapIndexFor(y, 0);
        showLineAt(gap, 0);
        if (i >= steps) {
          window.clearInterval(iv);
          const gapFinal = gapIndexFor(targetY, 0);
          setLineTop(null);
          dragIndexRef.current = -1;
          setDraggingIndex(-1);
          commitMove(0, gapFinal);
        }
      }, 60);
    }
    autoStep();
    timerRef.current = window.setInterval(autoStep, 1500);
    return function () { window.clearInterval(timerRef.current); };
    // eslint-disable-next-line
  }, []);

  return (
    <main className={styles.stage}>
      <ul className={styles.list + (isDemo ? " " + styles.isDemo : "")} ref={listRef}>
        {order.map(function (text, i) {
          return (
            <li
              key={text}
              className={styles.row + (draggingIndex === i ? " " + styles.dragging : "")}
              ref={function (el: HTMLLIElement | null) { rowRefs.current[i] = el; }}
            >
              <button
                className={styles.handle}
                type="button"
                ref={function (el: HTMLButtonElement | null) { handleRefs.current[i] = el; }}
                aria-label={text + " 순서 이동 손잡이 — 방향키로도 이동할 수 있습니다"}
                onPointerDown={function (e: ReactPointerEvent<HTMLButtonElement>) { onHandlePointerDown(i, e); }}
                onPointerMove={onHandlePointerMove}
                onPointerUp={onHandlePointerUp}
                onKeyDown={function (e: KeyboardEvent) { onHandleKeyDown(i, e); }}
              >
                <svg viewBox="0 0 256 256" aria-hidden="true">
                  <g fill="currentColor">
                    <path d="M208 32v192a16 16 0 0 1-16 16H64a16 16 0 0 1-16-16V32a16 16 0 0 1 16-16h128a16 16 0 0 1 16 16" opacity=".2" />
                    <path d="M104 60a12 12 0 1 1-12-12a12 12 0 0 1 12 12m60 12a12 12 0 1 0-12-12a12 12 0 0 0 12 12m-72 44a12 12 0 1 0 12 12a12 12 0 0 0-12-12m72 0a12 12 0 1 0 12 12a12 12 0 0 0-12-12m-72 68a12 12 0 1 0 12 12a12 12 0 0 0-12-12m72 0a12 12 0 1 0 12 12a12 12 0 0 0-12-12" />
                  </g>
                </svg>
              </button>
              <span className={styles.rowText}>{text}</span>
            </li>
          );
        })}
        {lineTop !== null ? <div className={styles.insertLine} aria-hidden="true" style={{ top: lineTop + "px" }} /> : null}
      </ul>
      <p className={styles.liveNote} aria-live="polite">{liveNote}</p>
    </main>
  );
}
