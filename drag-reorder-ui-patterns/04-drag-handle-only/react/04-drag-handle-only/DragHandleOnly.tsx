// DragHandleOnly — vanilla 판(run/336/demo/04-drag-handle-only/index.html)
// 의 React 포트. pointerdown 이 손잡이(.grip) 위에서만 setPointerCapture 를 걸어 행을 든다.
// 든 행은 목표 y 를 그대로 따라가지 않고, rAF 마다 현재 위치를 목표로 lerp(관성)시켜
// --ty 커스텀 프로퍼티에 담아 transform: translateY(var(--ty)) 로 그린다. 이웃 행은 든 행의
// 중점이 자기 중점을 넘는 순간 인덱스를 바꾸고 FLIP 되돌림으로 자리를 잡는다.
import { useEffect, useRef } from "react";
import styles from "./DragHandleOnly.module.scss";

export type DragHandleOnlyProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

const HINT = "작은 손잡이에만 포인터캡처를 걸어 행의 버튼·링크는 그대로 살아 있습니다";

type RowDef = { id: number; label: string; act: string };
const ROW_DEFS: RowDef[] = [
  { id: 0, label: "알림", act: "끔" },
  { id: 1, label: "디스플레이", act: "켬" },
  { id: 2, label: "계정", act: "켬" },
  { id: 3, label: "보안", act: "끔" }
];

const GRIP_PATH_BG =
  "M208 32v192a16 16 0 0 1-16 16H64a16 16 0 0 1-16-16V32a16 16 0 0 1 16-16h128a16 16 0 0 1 16 16";
const GRIP_PATH_DOTS =
  "M104 60a12 12 0 1 1-12-12a12 12 0 0 1 12 12m60 12a12 12 0 1 0-12-12a12 12 0 0 0 12 12m-72 44a12 12 0 1 0 12 12a12 12 0 0 0-12-12m72 0a12 12 0 1 0 12 12a12 12 0 0 0-12-12m-72 68a12 12 0 1 0 12 12a12 12 0 0 0-12-12m72 0a12 12 0 1 0 12 12a12 12 0 0 0-12-12";

type Box<T> = { current: T };

type DragState = { row: HTMLElement; offsetInRow: number; pos: number; target: number; raf: number };

export default function DragHandleOnly({
  duration = "240ms",
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#0a4fe8"
}: DragHandleOnlyProps) {
  const listRef = useRef<HTMLUListElement | null>(null);
  const stateRef = useRef<HTMLElement | null>(null);
  const rafRef = useRef(0) as Box<number>;

  useEffect(() => {
    const list = listRef.current;
    const stateEl = stateRef.current;
    if (!list || !stateEl) return;

    const LERP = 0.22;
    const ROWS: HTMLElement[] = Array.prototype.slice.call(list.children);

    let drag: DragState | null = null;

    function rowsExcept(row: HTMLElement): HTMLElement[] {
      return Array.prototype.slice.call(list!.children).filter((r: HTMLElement) => r !== row);
    }

    function reflow(row: HTMLElement, pointerY: number): void {
      const siblings = rowsExcept(row);
      let target: HTMLElement | null = null;
      for (let i = 0; i < siblings.length; i++) {
        const r = siblings[i].getBoundingClientRect();
        if (pointerY < r.top + r.height / 2) {
          target = siblings[i];
          break;
        }
      }
      if (target === row.nextElementSibling) return;
      if (target === null && row === list!.lastElementChild) return;
      flipInsert(row, target);
    }

    function flipInsert(row: HTMLElement, target: HTMLElement | null): void {
      const siblings = rowsExcept(row);
      const first = siblings.map((s) => s.getBoundingClientRect());
      list!.insertBefore(row, target);
      siblings.forEach((s, i) => {
        const r = s.getBoundingClientRect();
        const dy = first[i].top - r.top;
        if (dy !== 0) {
          s.style.transition = "none";
          s.style.transform = "translateY(" + dy + "px)";
          requestAnimationFrame(() => {
            s.style.transition = "transform " + duration + " " + easing;
            s.style.transform = "translateY(0)";
          });
        }
      });
    }

    function beginDrag(row: HTMLElement, clientY: number): void {
      const r = row.getBoundingClientRect();
      row.classList.add(styles.rowDrag);
      drag = { row, offsetInRow: clientY - r.top, pos: 0, target: 0, raf: 0 };
      tick();
    }

    function moveDrag(clientY: number): void {
      if (!drag) return;
      const listRect = list!.getBoundingClientRect();
      drag.target = clientY - drag.offsetInRow - listRect.top - drag.row.offsetTop;
      reflow(drag.row, clientY);
    }

    function tick(): void {
      if (!drag) return;
      drag.pos += (drag.target - drag.pos) * LERP;
      drag.row.style.setProperty("--ty", drag.pos.toFixed(2) + "px");
      drag.raf = requestAnimationFrame(tick);
      rafRef.current = drag.raf;
    }

    function endDrag(): void {
      if (!drag) return;
      const row = drag.row;
      if (drag.raf) cancelAnimationFrame(drag.raf);
      row.classList.remove(styles.rowDrag);
      row.style.transition = "transform 220ms cubic-bezier(.2,.8,.2,1)";
      row.style.setProperty("--ty", "0px");
      setTimeout(() => {
        row.style.transition = "";
      }, 240);
      drag = null;
    }

    function onGripDown(e: PointerEvent): void {
      const grip = (e.target as HTMLElement).closest("." + styles.grip) as HTMLElement | null;
      if (!grip) return;
      stop();
      const row = grip.closest("." + styles.row) as HTMLElement | null;
      if (!row) return;
      grip.setPointerCapture(e.pointerId);
      beginDrag(row, e.clientY);
    }
    function onGripMove(e: PointerEvent): void {
      moveDrag(e.clientY);
    }
    function onGripUp(): void {
      endDrag();
    }

    list.addEventListener("pointerdown", onGripDown as EventListener);
    list.addEventListener("pointermove", onGripMove as EventListener);
    list.addEventListener("pointerup", onGripUp as EventListener);
    list.addEventListener("pointercancel", onGripUp as EventListener);

    function onClick(e: MouseEvent): void {
      const btn = (e.target as HTMLElement).closest("." + styles.act) as HTMLButtonElement | null;
      if (!btn) return;
      stop();
      btn.textContent = btn.textContent === "켬" ? "끔" : "켬";
    }
    list.addEventListener("click", onClick as EventListener);

    let playing = true;
    function stop(): void {
      playing = false;
    }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function scenario(): void {
      const row0 = ROWS[0];
      const r0 = row0.getBoundingClientRect();
      beginDrag(row0, r0.top + r0.height / 2);
      stateEl!.textContent = "캡처됨";
      const r2 = ROWS[2].getBoundingClientRect();
      moveDrag(r2.top + r2.height / 2 + 6);
      setTimeout(() => {
        if (!drag) return;
        const r1 = ROWS[1].getBoundingClientRect();
        moveDrag(r1.top + r1.height / 2 - 4);
      }, 260);
      setTimeout(() => {
        if (!drag) return;
        const r3 = ROWS[3] ? ROWS[3].getBoundingClientRect() : r0;
        moveDrag(r3.top + r3.height / 2 + 4);
      }, 560);
    }
    function release(): void {
      endDrag();
      stateEl!.textContent = "캡처됨";
    }

    const timeouts: number[] = [];
    let intervalId = 0;

    if (reduce) {
      scenario();
      release();
    } else {
      function loopOnce(): void {
        scenario();
        timeouts.push(window.setTimeout(release, 820));
      }
      loopOnce();
      intervalId = window.setInterval(() => {
        if (playing) loopOnce();
      }, 1700);
    }

    return () => {
      cancelAnimationFrame(rafRef.current);
      timeouts.forEach((t) => clearTimeout(t));
      if (intervalId) clearInterval(intervalId);
      list.removeEventListener("pointerdown", onGripDown as EventListener);
      list.removeEventListener("pointermove", onGripMove as EventListener);
      list.removeEventListener("pointerup", onGripUp as EventListener);
      list.removeEventListener("pointercancel", onGripUp as EventListener);
      list.removeEventListener("click", onClick as EventListener);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.ho}>
        <p className={styles.hint}>{HINT}</p>
        <ul className={styles.list} ref={listRef}>
          {ROW_DEFS.map((row) => (
            <li key={row.id} className={styles.row}>
              <span className={styles.grip} tabIndex={-1} aria-hidden="true">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 256 256">
                  <g fill="currentColor">
                    <path d={GRIP_PATH_BG} opacity=".2" />
                    <path d={GRIP_PATH_DOTS} />
                  </g>
                </svg>
              </span>
              <span className={styles.txt}>{row.label}</span>
              <button type="button" className={styles.act}>{row.act}</button>
            </li>
          ))}
        </ul>
        <p className={styles.meta}>
          <b className={styles.state} ref={stateRef} style={{ color }}>캡처됨</b>
          <span className={styles.unit}>끔</span>
        </p>
      </div>
    </main>
  );
}
