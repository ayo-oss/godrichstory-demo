import { useEffect, useRef } from "react";
import styles from "./DownloadManagerQueueReorder.module.scss";

type Box<T> = { current: T };

export default function DownloadManagerQueueReorder() {
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement | null>;

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const items = [0, 1, 2, 3].map((i) => root.querySelector(`.${styles["item" + i]}`) as HTMLElement | null);
    if (items.some((el) => !el)) return;

    // 상수: 항목 높이(px, gap 포함) · 순서→위치 보간 속도(1프레임당 남은 거리의 비율)
    const ROW_H = 40;
    const LERP = 0.18;
    const AUTO_SWAP_MS = 900;

    const order = [0, 1, 2, 3];
    const y = [0, 1, 2, 3].map((i) => i * ROW_H);
    let dragging = -1;
    let dragStartY = 0, dragStartTop = 0;
    let stopped = false;
    let rafId = 0;
    let autoTimer = 0;

    function targetY(itemIdx: number) {
      const slot = order.indexOf(itemIdx);
      return slot * ROW_H;
    }

    // 계산 겹: 순서 값이 바뀌면 목표 위치로 즉시 점프하지 않고 매 프레임 남은 거리의 LERP 비율만큼 다가간다
    function tickLerp() {
      if (stopped) return;
      for (let i = 0; i < items.length; i++) {
        if (i === dragging) continue;
        const t = targetY(i);
        y[i] += (t - y[i]) * LERP;
        items[i]!.style.transform = "translateY(" + y[i].toFixed(2) + "px)";
      }
      rafId = requestAnimationFrame(tickLerp);
    }
    rafId = requestAnimationFrame(tickLerp);

    function swap(a: number, b: number) {
      const sa = order.indexOf(a), sb = order.indexOf(b);
      order[sa] = b; order[sb] = a;
    }

    const autoSeq = [[0, 2], [1, 3], [0, 1], [2, 3], [0, 3]];
    let autoI = 0;
    function autoStep() {
      if (stopped) return;
      if (root!.classList.contains(styles["is-demo"])) {
        const pair = autoSeq[autoI % autoSeq.length];
        swap(pair[0], pair[1]);
        autoI++;
      }
      autoTimer = window.setTimeout(autoStep, AUTO_SWAP_MS);
    }
    autoTimer = window.setTimeout(autoStep, AUTO_SWAP_MS);

    const cleanups: Array<() => void> = [];
    items.forEach((el, idx) => {
      function onDown(e: PointerEvent) {
        root!.classList.remove(styles["is-demo"]);
        dragging = idx;
        dragStartY = e.clientY;
        dragStartTop = y[idx];
        el!.setPointerCapture(e.pointerId);
        el!.classList.add(styles["item--drag"]);
      }
      function onMove(e: PointerEvent) {
        if (dragging !== idx) return;
        const ny = dragStartTop + (e.clientY - dragStartY);
        y[idx] = ny;
        el!.style.transform = "translateY(" + ny.toFixed(2) + "px)";
        const slot = Math.max(0, Math.min(items.length - 1, Math.round(ny / ROW_H)));
        const curSlot = order.indexOf(idx);
        if (slot !== curSlot) {
          const other = order[slot];
          order[curSlot] = other;
          order[slot] = idx;
        }
      }
      function onEnd() {
        if (dragging !== idx) return;
        dragging = -1;
        el!.classList.remove(styles["item--drag"]);
      }
      el!.addEventListener("pointerdown", onDown);
      el!.addEventListener("pointermove", onMove);
      el!.addEventListener("pointerup", onEnd);
      el!.addEventListener("pointercancel", onEnd);
      cleanups.push(() => {
        el!.removeEventListener("pointerdown", onDown);
        el!.removeEventListener("pointermove", onMove);
        el!.removeEventListener("pointerup", onEnd);
        el!.removeEventListener("pointercancel", onEnd);
      });
    });

    return () => {
      stopped = true;
      cancelAnimationFrame(rafId);
      window.clearTimeout(autoTimer);
      cleanups.forEach((fn) => fn());
    };
  }, []);

  return (
    <div ref={rootRef} className={`${styles.stage} ${styles.dqr} ${styles["is-demo"]}`}>
      <div className={`${styles.item} ${styles.item0}`}>대기 A</div>
      <div className={`${styles.item} ${styles.item1}`}>대기 B</div>
      <div className={`${styles.item} ${styles.item2}`}>대기 C</div>
      <div className={`${styles.item} ${styles.item3}`}>대기 D</div>
    </div>
  );
}
