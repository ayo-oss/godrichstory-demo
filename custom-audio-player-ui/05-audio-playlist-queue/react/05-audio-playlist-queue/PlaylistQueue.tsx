import { useEffect, useRef } from "react";
import styles from "./PlaylistQueue.module.scss";

const TRACK_NAMES = ["Track 01", "Track 02", "Track 03", "Track 04", "Track 05"];

export default function PlaylistQueue() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);
  const rowRefs = useRef<(HTMLLIElement | null)[]>([]);

  useEffect(() => {
    const root = rootRef.current;
    const list = listRef.current;
    const rows = (rowRefs.current || []).filter((r): r is HTMLLIElement => !!r);
    if (!root || !list || rows.length !== TRACK_NAMES.length) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let isDemo = true;

    const ROW_H = 24; // 슬롯 간격(행 높이 + 사이 간격)
    const SETTLE_RATE = 0.22; // 목표 위치로 매 프레임 다가가는 비율 — 관성 lerp 한 겹
    const order = rows.map((_, i) => i); // order[슬롯] = 행 인덱스
    function slotOf(rowIndex: number) { return order.indexOf(rowIndex); }
    const y = rows.map((_, i) => slotOf(i) * ROW_H); // 각 행의 현재(보간 중) y값
    list.style.height = rows.length * ROW_H + "px";

    const DEMO_ROW = 0;
    function human() {
      if (isDemo) {
        root!.classList.remove(styles["is-demo"]);
        isDemo = false;
        rows[DEMO_ROW].classList.remove(styles["is-dragging"]);
      }
    }

    let dragIndex = -1, startClientY = 0, startSlotY = 0, dragY = 0;

    function onPointerDown(e: PointerEvent, i: number) {
      human();
      dragIndex = i;
      startClientY = e.clientY;
      startSlotY = slotOf(i) * ROW_H;
      dragY = startSlotY;
      rows[i].classList.add(styles["is-dragging"]);
      rows[i].setPointerCapture(e.pointerId);
    }
    function onPointerMove(e: PointerEvent) {
      if (dragIndex < 0) return;
      dragY = startSlotY + (e.clientY - startClientY);
      const toSlot = Math.max(0, Math.min(rows.length - 1, Math.round(dragY / ROW_H)));
      const fromSlot = slotOf(dragIndex);
      if (toSlot !== fromSlot) {
        order.splice(fromSlot, 1);
        order.splice(toSlot, 0, dragIndex);
      }
    }
    function onPointerUp(e: PointerEvent) {
      if (dragIndex < 0) return;
      rows[dragIndex].classList.remove(styles["is-dragging"]);
      try { rows[dragIndex].releasePointerCapture(e.pointerId); } catch { /* noop */ }
      dragIndex = -1;
    }

    let grabbedIndex = -1;
    function onRowKeydown(e: KeyboardEvent, i: number) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault(); human();
        if (grabbedIndex === i) {
          grabbedIndex = -1; rows[i].classList.remove(styles["is-dragging"]);
        } else {
          if (grabbedIndex >= 0) rows[grabbedIndex].classList.remove(styles["is-dragging"]);
          grabbedIndex = i; rows[i].classList.add(styles["is-dragging"]);
        }
      } else if ((e.key === "ArrowUp" || e.key === "ArrowDown") && grabbedIndex === i) {
        e.preventDefault(); human();
        const slot = slotOf(i);
        const next = Math.max(0, Math.min(rows.length - 1, slot + (e.key === "ArrowDown" ? 1 : -1)));
        if (next !== slot) { order.splice(slot, 1); order.splice(next, 0, i); }
      }
    }

    const pointerDownHandlers = rows.map((_, i) => (e: PointerEvent) => onPointerDown(e, i));
    const keydownHandlers = rows.map((_, i) => (e: KeyboardEvent) => onRowKeydown(e, i));
    rows.forEach((row, i) => {
      row.addEventListener("pointerdown", pointerDownHandlers[i] as EventListener);
      row.addEventListener("keydown", keydownHandlers[i] as EventListener);
    });
    list.addEventListener("pointermove", onPointerMove as EventListener);
    list.addEventListener("pointerup", onPointerUp as EventListener);

    function triangle(frac: number) { return frac < 0.5 ? frac * 2 : 2 - frac * 2; }
    let driveStart = 0;

    let raf = 0;
    function frame(now: number) {
      if (isDemo) {
        if (!driveStart) driveStart = now;
        const DRIVE_PERIOD_MS = 2000; // 렌더 캐처 창(설정 초=2.0)과 같은 주기 — 시연 전용
        const frac = ((now - driveStart) % DRIVE_PERIOD_MS) / DRIVE_PERIOD_MS;
        dragY = triangle(frac) * (rows.length - 1) * ROW_H;
        const toSlot = Math.max(0, Math.min(rows.length - 1, Math.round(dragY / ROW_H)));
        const fromSlot = slotOf(DEMO_ROW);
        if (toSlot !== fromSlot) { order.splice(fromSlot, 1); order.splice(toSlot, 0, DEMO_ROW); }
      }
      const activeDrag = isDemo ? DEMO_ROW : dragIndex;
      rows.forEach((row, i) => {
        if (i === activeDrag) {
          y[i] = dragY; // 잡은 항목은 lerp 없이 포인터를 그대로 따라간다
        } else {
          const target = slotOf(i) * ROW_H;
          y[i] += (target - y[i]) * SETTLE_RATE; // 나머지 항목은 목표 자리로 관성 있게 다가간다
        }
        row.style.transform = "translateY(" + y[i].toFixed(2) + "px)";
      });
      raf = requestAnimationFrame(frame);
    }

    if (reduce) {
      root.classList.add(styles["is-still"]);
      rows.forEach((row, i) => { row.style.transform = "translateY(" + slotOf(i) * ROW_H + "px)"; });
    } else {
      rows[DEMO_ROW].classList.add(styles["is-dragging"]);
      raf = requestAnimationFrame(frame);
    }

    return () => {
      cancelAnimationFrame(raf);
      rows.forEach((row, i) => {
        row.removeEventListener("pointerdown", pointerDownHandlers[i] as EventListener);
        row.removeEventListener("keydown", keydownHandlers[i] as EventListener);
      });
      list.removeEventListener("pointermove", onPointerMove as EventListener);
      list.removeEventListener("pointerup", onPointerUp as EventListener);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.pl + " " + styles["is-demo"]} ref={rootRef}>
        <p className={styles.hint}><span>항목을 끌어놓거나 화살표 키를 누르면 순서 값이 다시 매겨집니다</span></p>
        <ul className={styles.list} ref={listRef} aria-label="대기열, 끌어서 순서 바꾸기">
          {TRACK_NAMES.map((name, i) => (
            <li
              key={name}
              className={styles.row}
              ref={(el: HTMLLIElement | null) => { if (rowRefs.current) rowRefs.current[i] = el; }}
              data-i={i}
              tabIndex={0}
              aria-label={`${name}, 끌어서 순서 바꾸기`}
            >
              <svg className={styles.handle} aria-hidden="true"><use href="#ico-grip" /></svg>
              <span className={styles.label}>{name}</span>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
