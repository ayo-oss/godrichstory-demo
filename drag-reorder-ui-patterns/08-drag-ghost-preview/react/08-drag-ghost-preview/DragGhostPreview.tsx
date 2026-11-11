// DragGhostPreview — vanilla 판(run/336/demo/08-drag-ghost-preview/index.html)
// 의 React 포트. pointermove 의 프레임 간 x 이동량(dx)을 기울기 목표값으로 바꾸고,
// 매 rAF 마다 현재 각도를 목표로 lerp 시켜 든 카드에 transform: rotate 로 남긴다.
// 이동을 멈추거나 놓으면 목표가 0으로 떨어져 흔들림이 자연히 가라앉는다.
import { useEffect, useRef } from "react";
import styles from "./DragGhostPreview.module.scss";

export type DragGhostPreviewProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

const HINT = "프레임 사이 x 이동량을 각도로 환산해 잔상이 기울어집니다";
const ROW_TXT = ["메시지", "사진", "메모", "음악"];

type Box<T> = { current: T };
type DragState = { row: HTMLElement; offsetInRow: number; lastX: number; angle: number; target: number; raf: number };

export default function DragGhostPreview({
  duration = "220ms",
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#0a4fe8"
}: DragGhostPreviewProps) {
  const listRef = useRef<HTMLUListElement | null>(null);
  const stateRef = useRef<HTMLElement | null>(null);
  const rafRef = useRef(0) as Box<number>;

  useEffect(() => {
    const list = listRef.current;
    const stateEl = stateRef.current;
    if (!list || !stateEl) return;

    const LERP = 0.25;
    const K = 2.4; // dx(px/frame) → 각도(deg) 배율
    const MAX_ANGLE = 18;

    let drag: DragState | null = null;

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
            s.style.transition = "transform " + duration + " " + easing;
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

    function tick(): void {
      if (!drag) return;
      drag.angle += (drag.target - drag.angle) * LERP;
      drag.row.style.setProperty("--rot", drag.angle.toFixed(2) + "deg");
      stateEl!.textContent = "angle " + Math.round(drag.angle) + "°";
      drag.target *= 0.82; // 매 프레임 목표를 줄여 이동이 멈추면 0으로 가라앉는다
      drag.raf = requestAnimationFrame(tick);
      rafRef.current = drag.raf;
    }

    function beginDrag(row: HTMLElement, clientX: number, clientY: number): void {
      const r = row.getBoundingClientRect();
      row.classList.add(styles.rowDrag);
      drag = { row, offsetInRow: clientY - r.top, lastX: clientX, angle: 0, target: 0, raf: 0 };
      drag.raf = requestAnimationFrame(tick);
      rafRef.current = drag.raf;
    }

    function moveDrag(clientX: number, clientY: number): void {
      if (!drag) return;
      const listRect = list!.getBoundingClientRect();
      const ty = clientY - drag.offsetInRow - listRect.top - drag.row.offsetTop;
      drag.row.style.setProperty("--ty", ty.toFixed(1) + "px");
      const dx = clientX - drag.lastX;
      drag.lastX = clientX;
      let t = dx * K;
      if (t > MAX_ANGLE) t = MAX_ANGLE;
      if (t < -MAX_ANGLE) t = -MAX_ANGLE;
      drag.target = t;
      reflow(drag.row, clientY);
    }

    function endDrag(): void {
      if (!drag) return;
      const row = drag.row;
      if (drag.raf) cancelAnimationFrame(drag.raf);
      drag = null;
      row.classList.remove(styles.rowDrag);
      row.style.transition = "transform 220ms cubic-bezier(.2,.8,.2,1)";
      row.style.setProperty("--ty", "0px");
      row.style.setProperty("--rot", "0deg");
      setTimeout(() => {
        row.style.transition = "";
      }, 240);
      stateEl!.textContent = "angle 0°";
    }

    function onDown(e: PointerEvent): void {
      const row = (e.target as HTMLElement).closest("." + styles.row) as HTMLElement | null;
      if (!row) return;
      stop();
      row.setPointerCapture(e.pointerId);
      beginDrag(row, e.clientX, e.clientY);
    }
    function onMove(e: PointerEvent): void {
      moveDrag(e.clientX, e.clientY);
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
      const row = list!.children[1] as HTMLElement;
      const r = row.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      beginDrag(row, cx, cy);
      moveDrag(cx + 46, cy + 4);
      timeouts.push(
        window.setTimeout(() => {
          if (drag) moveDrag(cx - 40, cy + 34);
        }, 180)
      );
      timeouts.push(
        window.setTimeout(() => {
          if (drag) moveDrag(cx + 30, cy + 60);
        }, 360)
      );
      timeouts.push(
        window.setTimeout(() => {
          if (drag) moveDrag(cx, cy + 84);
        }, 540)
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
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.gp}>
        <p className={styles.hint}>{HINT}</p>
        <ul className={styles.list} ref={listRef}>
          {ROW_TXT.map((txt, i) => (
            <li key={i} className={styles.row}>
              <span>{txt}</span>
            </li>
          ))}
        </ul>
        <p className={styles.meta}>
          <b className={styles.state} ref={stateRef} style={{ color }}>angle 0°</b>
        </p>
      </div>
    </main>
  );
}
