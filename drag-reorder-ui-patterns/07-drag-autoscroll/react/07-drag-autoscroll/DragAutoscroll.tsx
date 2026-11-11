// DragAutoscroll — vanilla 판(run/336/demo/07-drag-autoscroll/index.html)
// 의 React 포트. 든 행을 옮기는 동안 포인터 y 를 스크롤 상자(view) rect 와 비교해
// 위/아래 40px 밴드 안이면 가장자리까지 남은 거리를 0..1 로 정규화하고, 그 값에 최대
// 속도(초당 480px)를 곱해 매 rAF 프레임 scrollBy 로 스크롤한다. 밴드 밖이면 속도 0 — 정지.
import { useEffect, useRef } from "react";
import styles from "./DragAutoscroll.module.scss";

export type DragAutoscrollProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

const HINT = "가장자리까지 남은 거리를 정규화해 매 프레임 스크롤 속도에 곱합니다";
const ROW_TXT = ["배송 준비", "배송 중", "고객 인수", "티켓 발급", "문의 확정", "포인트 적립", "쿠폰 지급", "리뷰 요청", "환불 처리"];

type Box<T> = { current: T };
type DragState = { row: HTMLElement; offsetInRow: number; pointerY: number };

export default function DragAutoscroll({
  duration = "220ms",
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#17141a"
}: DragAutoscrollProps) {
  const viewRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);
  const stateRef = useRef<HTMLElement | null>(null);
  const rafRef = useRef(0) as Box<number>;

  useEffect(() => {
    const view = viewRef.current;
    const list = listRef.current;
    const stateEl = stateRef.current;
    if (!view || !list || !stateEl) return;

    const EDGE_PX = 40;
    const MAX_SPEED = 480; // px per second — 문구 "초당 480px" 과 같은 값

    let drag: DragState | null = null;
    let lastT = 0;
    let raf = 0;

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

    function edgeFactor(pointerY: number, viewRect: DOMRect): number {
      const topDist = pointerY - viewRect.top;
      const botDist = viewRect.bottom - pointerY;
      if (topDist >= 0 && topDist < EDGE_PX) return -(1 - topDist / EDGE_PX);
      if (botDist >= 0 && botDist < EDGE_PX) return 1 - botDist / EDGE_PX;
      return 0;
    }

    function tick(now: number): void {
      if (!drag) {
        raf = 0;
        stateEl!.textContent = "speed 0px/s";
        return;
      }
      const dt = lastT ? (now - lastT) / 1000 : 0;
      lastT = now;
      const viewRect = view!.getBoundingClientRect();
      const f = edgeFactor(drag.pointerY, viewRect);
      const speed = f * MAX_SPEED;
      if (speed !== 0 && dt > 0) view!.scrollBy(0, speed * dt);
      stateEl!.textContent = "speed " + Math.round(Math.abs(speed)) + "px/s";
      raf = requestAnimationFrame(tick);
      rafRef.current = raf;
    }

    function moveDrag(clientY: number): void {
      if (!drag) return;
      drag.pointerY = clientY;
      const listRect = list!.getBoundingClientRect();
      const ty = clientY - drag.offsetInRow - listRect.top - drag.row.offsetTop;
      drag.row.style.transform = "translateY(" + ty.toFixed(1) + "px)";
      reflow(drag.row, clientY);
    }

    function beginDrag(row: HTMLElement, clientY: number): void {
      const r = row.getBoundingClientRect();
      row.classList.add(styles.rowDrag);
      drag = { row, offsetInRow: clientY - r.top, pointerY: clientY };
      lastT = 0;
      if (!raf) {
        raf = requestAnimationFrame(tick);
        rafRef.current = raf;
      }
    }

    function endDrag(): void {
      if (!drag) return;
      const row = drag.row;
      drag = null;
      row.classList.remove(styles.rowDrag);
      row.style.transition = "transform 220ms cubic-bezier(.2,.8,.2,1)";
      row.style.transform = "translateY(0)";
      setTimeout(() => {
        row.style.transition = "";
      }, 240);
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
      const vr = view!.getBoundingClientRect();
      const row = list!.children[3] as HTMLElement;
      beginDrag(row, vr.top + vr.height / 2);
      moveDrag(vr.bottom - 6);
      timeouts.push(
        window.setTimeout(() => {
          if (drag) moveDrag(vr.top + 6);
        }, 520)
      );
      timeouts.push(window.setTimeout(endDrag, 980));
    }

    if (reduce) {
      view.scrollTop = 40;
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
      <div className={styles.as}>
        <p className={styles.hint}>{HINT}</p>
        <div className={styles.view} ref={viewRef}>
          <ul className={styles.list} ref={listRef}>
            {ROW_TXT.map((txt, i) => (
              <li key={i} className={styles.row}>
                <span>{txt}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className={styles.meta}>
          <b className={styles.state} ref={stateRef} style={{ color }}>speed 0px/s</b>
          <span className={styles.unit}>초당 480px</span>
        </p>
      </div>
    </main>
  );
}
