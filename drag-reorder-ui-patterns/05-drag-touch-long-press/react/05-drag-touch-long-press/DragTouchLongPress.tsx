// DragTouchLongPress — vanilla 판(run/336/demo/05-drag-touch-long-press/index.html)
// 의 React 포트. pointerdown 에서 setTimeout(HOLD_MS) 타이머를 걸고, 타이머가 살아있는 동안
// pointermove 의 이동량이 임계값(MOVE_PX)을 넘으면 clearTimeout 으로 취소해 스크롤·탭으로
// 넘긴다. 타이머가 끝까지 살아남아 activate() 가 불리면 그 행이 포인터를 따라가는 드래그로
// 바뀐다. 표시되는 250ms 는 HOLD_MS 상수와 같은 값이다.
import { useEffect, useRef } from "react";
import styles from "./DragTouchLongPress.module.scss";

export type DragTouchLongPressProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

const HINT = "250ms 를 버티고 이동 임계값을 넘지 않아야 드래그로 전환합니다";
const ROW_TXT = ["빨래", "설거지", "청소", "분리수거"];

type Box<T> = { current: T };

type PressState = { row: HTMLElement; startX: number; startY: number; pressStart: number; raf: number; timer: number };
type ActiveState = { row: HTMLElement; offsetInRow: number };

export default function DragTouchLongPress({
  duration = "220ms",
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#fff7e6"
}: DragTouchLongPressProps) {
  const listRef = useRef<HTMLUListElement | null>(null);
  const stateRef = useRef<HTMLElement | null>(null);
  const unitRef = useRef<HTMLSpanElement | null>(null);
  const rafRef = useRef(0) as Box<number>;

  useEffect(() => {
    const list = listRef.current;
    const stateEl = stateRef.current;
    const unitEl = unitRef.current;
    if (!list || !stateEl || !unitEl) return;

    const HOLD_MS = 250;
    const MOVE_PX = 8;

    let press: PressState | null = null;
    let active: ActiveState | null = null;

    function rowsExcept(row: HTMLElement): HTMLElement[] {
      return Array.prototype.slice.call(list!.children).filter((r: HTMLElement) => r !== row);
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
            s.style.transition = "transform 220ms cubic-bezier(.2,.8,.2,1)";
            s.style.transform = "translateY(0)";
          });
        }
      });
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

    function pressTick(): void {
      if (!press) return;
      const el = press.pressStart === null ? 0 : performance.now() - press.pressStart;
      stateEl!.textContent = "press " + Math.min(HOLD_MS, Math.round(el)) + "ms";
      press.raf = requestAnimationFrame(pressTick);
      rafRef.current = press.raf;
    }

    function startPress(row: HTMLElement, x: number, y: number): void {
      cancelPress();
      press = { row, startX: x, startY: y, pressStart: performance.now(), raf: 0, timer: 0 };
      press.timer = window.setTimeout(() => activate(row, y), HOLD_MS);
      pressTick();
    }

    function cancelPress(): void {
      if (!press) return;
      if (press.timer) clearTimeout(press.timer);
      if (press.raf) cancelAnimationFrame(press.raf);
      press = null;
    }

    function activate(row: HTMLElement, y: number): void {
      if (press && press.row === row) cancelPress();
      const r = row.getBoundingClientRect();
      row.classList.add(styles.rowDrag);
      stateEl!.textContent = "드래그";
      active = { row, offsetInRow: y - r.top };
    }

    function moveActive(clientY: number): void {
      if (!active) return;
      const listRect = list!.getBoundingClientRect();
      const ty = clientY - active.offsetInRow - listRect.top - active.row.offsetTop;
      active.row.style.transform = "translateY(" + ty.toFixed(1) + "px)";
      reflow(active.row, clientY);
    }

    function endActive(): void {
      if (!active) return;
      const row = active.row;
      active = null;
      row.classList.remove(styles.rowDrag);
      row.style.transition = "transform 220ms cubic-bezier(.2,.8,.2,1)";
      row.style.transform = "translateY(0)";
      setTimeout(() => {
        row.style.transition = "";
      }, 240);
      stateEl!.textContent = "press 0ms";
      unitEl!.textContent = "move 0px";
    }

    function onDown(e: PointerEvent): void {
      const row = (e.target as HTMLElement).closest("." + styles.row) as HTMLElement | null;
      if (!row) return;
      stop();
      row.setPointerCapture(e.pointerId);
      startPress(row, e.clientX, e.clientY);
    }
    function onMove(e: PointerEvent): void {
      if (active) {
        moveActive(e.clientY);
        return;
      }
      if (!press) return;
      const dx = e.clientX - press.startX;
      const dy = e.clientY - press.startY;
      const d = Math.sqrt(dx * dx + dy * dy);
      unitEl!.textContent = "move " + Math.round(d) + "px";
      if (d > MOVE_PX) cancelPress();
    }
    function onUp(): void {
      if (active) {
        endActive();
        return;
      }
      cancelPress();
      stateEl!.textContent = "press 0ms";
      unitEl!.textContent = "move 0px";
    }

    list.addEventListener("pointerdown", onDown as EventListener);
    list.addEventListener("pointermove", onMove as EventListener);
    list.addEventListener("pointerup", onUp as EventListener);
    list.addEventListener("pointercancel", onUp as EventListener);

    let playing = true;
    function stop(): void {
      playing = false;
    }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const timeouts: number[] = [];
    let intervalId = 0;

    function loopOnce(): void {
      const row = list!.children[0] as HTMLElement;
      const r = row.getBoundingClientRect();
      startPress(row, r.left + r.width / 2, r.top + r.height / 2);
      timeouts.push(
        window.setTimeout(() => {
          if (!active) return;
          const r3Row = list!.children[2] as HTMLElement | undefined;
          const r3 = r3Row ? r3Row.getBoundingClientRect() : r;
          moveActive(r3.top + r3.height / 2 + 4);
        }, HOLD_MS + 120)
      );
      timeouts.push(window.setTimeout(onUp, HOLD_MS + 420));
    }

    if (reduce) {
      const first = list.children[0] as HTMLElement;
      activate(first, first.getBoundingClientRect().top);
      endActive();
    } else {
      loopOnce();
      intervalId = window.setInterval(() => {
        if (playing) loopOnce();
      }, 1700);
    }

    return () => {
      cancelAnimationFrame(rafRef.current);
      timeouts.forEach((t) => clearTimeout(t));
      if (intervalId) clearInterval(intervalId);
      list.removeEventListener("pointerdown", onDown as EventListener);
      list.removeEventListener("pointermove", onMove as EventListener);
      list.removeEventListener("pointerup", onUp as EventListener);
      list.removeEventListener("pointercancel", onUp as EventListener);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.lp}>
        <p className={styles.hint}>{HINT}</p>
        <ul className={styles.list} ref={listRef}>
          {ROW_TXT.map((txt, i) => (
            <li key={i} className={styles.row}>
              <span className={styles.txt}>{txt}</span>
            </li>
          ))}
        </ul>
        <p className={styles.meta}>
          <b className={styles.state} ref={stateRef} style={{ color }}>press 0ms</b>
          <span className={styles.unit} ref={unitRef}>move 0px</span>
        </p>
      </div>
    </main>
  );
}
