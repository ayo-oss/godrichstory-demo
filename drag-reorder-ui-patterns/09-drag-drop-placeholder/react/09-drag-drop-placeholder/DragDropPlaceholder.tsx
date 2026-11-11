// DragDropPlaceholder — vanilla 판(run/336/demo/09-drag-drop-placeholder/index.html)
// 의 React 포트. 든 행은 목록에서 빠져나와 절대 위치로 뜨고, 그 자리엔 빈 칸(placeholder)
// 이 FLIP 으로 자리를 옮겨 다닌다. 놓으면 행이 placeholder 자리로 되돌아가고 placeholder 는 사라진다.
import { useEffect, useRef } from "react";
import styles from "./DragDropPlaceholder.module.scss";

export type DragDropPlaceholderProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

const HINT = "든 행이 빠진 자리를 빈 칸이 대신 옮겨 다니다가 놓으면 그 자리로 들어갑니다";
const ROW_TXT = ["배송 준비", "배송 중", "고객 인수", "티켓 발급"];

type Box<T> = { current: T };
type DragState = { row: HTMLElement; offsetInRow: number; listRect: DOMRect };

export default function DragDropPlaceholder({
  duration = "200ms",
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#fff7e6"
}: DragDropPlaceholderProps) {
  const listRef = useRef<HTMLUListElement | null>(null);
  const stateRef = useRef<HTMLElement | null>(null);
  const rafRef = useRef(0) as Box<number>;

  useEffect(() => {
    const list = listRef.current;
    const stateEl = stateRef.current;
    if (!list || !stateEl) return;

    const placeholder = document.createElement("li");
    placeholder.className = styles.placeholder;

    let drag: DragState | null = null;

    function staticRows(): HTMLElement[] {
      return Array.prototype.slice
        .call(list!.children)
        .filter((r: HTMLElement) => r !== placeholder && r !== (drag && drag.row));
    }

    function flipMovePlaceholder(target: HTMLElement | null): void {
      const rows = staticRows();
      const first = rows.map((s) => s.getBoundingClientRect());
      list!.insertBefore(placeholder, target);
      rows.forEach((s, i) => {
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

    function reflow(pointerY: number): void {
      const rows = staticRows();
      let target: HTMLElement | null = null;
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i].getBoundingClientRect();
        if (pointerY < r.top + r.height / 2) {
          target = rows[i];
          break;
        }
      }
      flipMovePlaceholder(target);
      const idx = Array.prototype.indexOf.call(list!.children, placeholder);
      stateEl!.textContent = "slot " + (idx + 1);
    }

    function beginDrag(row: HTMLElement, clientY: number): void {
      const r = row.getBoundingClientRect();
      const listRect = list!.getBoundingClientRect();
      placeholder.style.setProperty("--h", r.height + "px");
      list!.insertBefore(placeholder, row);
      row.classList.add(styles.rowDrag);
      row.style.setProperty("--rowTop", (r.top - listRect.top) + "px");
      row.style.setProperty("--rowW", r.width + "px");
      row.style.setProperty("--ty", "0px");
      drag = { row, offsetInRow: clientY - r.top, listRect };
      const idx = Array.prototype.indexOf.call(list!.children, placeholder);
      stateEl!.textContent = "slot " + (idx + 1);
    }

    function moveDrag(clientY: number): void {
      if (!drag) return;
      const rowTop = parseFloat(drag.row.style.getPropertyValue("--rowTop"));
      const ty = clientY - drag.offsetInRow - drag.listRect.top - rowTop;
      drag.row.style.setProperty("--ty", ty.toFixed(1) + "px");
      reflow(clientY);
    }

    function endDrag(): void {
      if (!drag) return;
      const row = drag.row;
      drag = null;
      list!.insertBefore(row, placeholder);
      placeholder.remove();
      row.classList.remove(styles.rowDrag);
      row.style.transition = "transform " + duration + " " + easing;
      row.style.setProperty("--ty", "0px");
      setTimeout(() => {
        row.style.transition = "";
        row.style.removeProperty("--rowTop");
        row.style.removeProperty("--rowW");
      }, 210);
    }

    function onDown(e: PointerEvent): void {
      const row = (e.target as HTMLElement).closest("." + styles.row) as HTMLElement | null;
      if (!row) return;
      stop();
      row.setPointerCapture(e.pointerId);
      beginDrag(row, e.clientY);
    }
    function onMove(e: PointerEvent): void {
      moveDrag(e.clientY);
    }
    function onUp(): void {
      endDrag();
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
      beginDrag(row, r.top + r.height / 2);
      timeouts.push(
        window.setTimeout(() => {
          if (drag) {
            const t = list!.children[3] as HTMLElement;
            const tr = t.getBoundingClientRect();
            moveDrag(tr.top + tr.height / 2 + 6);
          }
        }, 220)
      );
      timeouts.push(
        window.setTimeout(() => {
          if (drag) {
            const t = list!.children[1] as HTMLElement;
            const tr = t.getBoundingClientRect();
            moveDrag(tr.top + tr.height / 2 - 4);
          }
        }, 520)
      );
      timeouts.push(window.setTimeout(endDrag, 860));
    }

    if (reduce) {
      // 정지 상태 그대로 — 연출 없음
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
      if (placeholder.parentNode) placeholder.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.dd}>
        <p className={styles.hint}>{HINT}</p>
        <ul className={styles.list} ref={listRef}>
          {ROW_TXT.map((txt, i) => (
            <li key={i} className={styles.row}>
              <span>{txt}</span>
            </li>
          ))}
        </ul>
        <p className={styles.meta}>
          <b className={styles.state} ref={stateRef} style={{ color }}>slot 1</b>
        </p>
      </div>
    </main>
  );
}
