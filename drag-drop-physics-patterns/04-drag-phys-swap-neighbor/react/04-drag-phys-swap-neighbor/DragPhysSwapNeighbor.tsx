import { useEffect, useRef } from "react";
import styles from "./DragPhysSwapNeighbor.module.scss";

type Box<T> = { current: T };

export default function DragPhysSwapNeighbor() {
  const rootRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const dragChipRef = useRef<HTMLButtonElement>(null);
  const chipBRef = useRef<HTMLDivElement>(null);
  const chipCRef = useRef<HTMLDivElement>(null);
  const captionRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const track = trackRef.current;
    const dragChip = dragChipRef.current;
    const caption = captionRef.current;
    if (!root || !track || !dragChip || !chipBRef.current || !chipCRef.current || !caption) return;

    const chips: HTMLElement[] = [dragChip, chipBRef.current, chipCRef.current];
    const DRAGGED_ID = 0;

    const SWAP_FLIP_STIFFNESS = 210;
    const SWAP_FLIP_DAMPING = 22;
    const KEY_STEP_SLOTS = 1;

    let order = [0, 1, 2];
    let STEP = 0;
    const state: Record<number, { x: number; v: number; target: number }> = {
      0: { x: 0, v: 0, target: 0 },
      1: { x: 0, v: 0, target: 0 },
      2: { x: 0, v: 0, target: 0 },
    };

    function measureStep() {
      const r0 = chips[0].getBoundingClientRect();
      const r1 = chips[1].getBoundingClientRect();
      return r1.left - r0.left;
    }

    function slotOf(id: number) { return order.indexOf(id); }

    function retarget() {
      chips.forEach(function (c, id) {
        state[id].target = (slotOf(id) - id) * STEP;
      });
    }

    function moveInOrder(fromSlot: number, toSlot: number) {
      const id = order[fromSlot];
      order.splice(fromSlot, 1);
      order.splice(toSlot, 0, id);
    }

    function applyChip(id: number, x: number) {
      chips[id].style.transform = "translateX(" + x.toFixed(1) + "px)";
    }

    let raf = 0, lastTs: number | null = null;
    let dragging = false;
    function settleTick(ts: number) {
      if (lastTs === null) lastTs = ts;
      const dt = Math.min((ts - lastTs) / 1000, 0.032);
      lastTs = ts;
      let moving = false;
      chips.forEach(function (c, id) {
        if (id === DRAGGED_ID && dragging) return;
        const s = state[id];
        const f = (s.target - s.x) * SWAP_FLIP_STIFFNESS - s.v * SWAP_FLIP_DAMPING;
        s.v += f * dt;
        s.x += s.v * dt;
        applyChip(id, s.x);
        if (Math.abs(s.v) > 1 || Math.abs(s.target - s.x) > 0.5) moving = true;
        else { s.x = s.target; s.v = 0; applyChip(id, s.x); }
      });
      if (moving) { raf = requestAnimationFrame(settleTick); } else { lastTs = null; raf = 0; }
    }

    function kickSpring() {
      if (!raf) { lastTs = null; raf = requestAnimationFrame(settleTick); }
    }

    let pointerStartX: number | null = null;
    let dragStartX = 0;
    let startSlot = 0;
    let grabbed = false;

    function beginDrag(clientX: number) {
      cancelAnimationFrame(raf); raf = 0; lastTs = null;
      dragging = true;
      pointerStartX = clientX;
      dragStartX = state[DRAGGED_ID].x;
      startSlot = slotOf(DRAGGED_ID);
      root!.classList.add(styles.isDragging);
    }

    function moveDrag(clientX: number) {
      if (!STEP) STEP = measureStep();
      const deltaX = clientX - pointerStartX!;
      const rawX = dragStartX + deltaX;
      applyChip(DRAGGED_ID, rawX);
      const chipRect = dragChip!.getBoundingClientRect();
      const trackRect = track!.getBoundingClientRect();
      const centerX = chipRect.left + chipRect.width / 2 - trackRect.left;
      const targetSlot = Math.max(0, Math.min(chips.length - 1, Math.round((centerX - STEP / 2) / STEP)));
      while (targetSlot !== slotOf(DRAGGED_ID)) {
        const from = slotOf(DRAGGED_ID);
        const step = targetSlot > from ? 1 : -1;
        const to = from + step;
        moveInOrder(from, to);
        retarget();
        kickSpring();
        caption!.textContent = "자리가 바뀌었어요";
      }
      state[DRAGGED_ID].x = rawX;
    }

    function endDrag() {
      dragging = false;
      root!.classList.remove(styles.isDragging);
      caption!.textContent = "중점을 넘으면 이웃과 자리를 바꿔요";
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      retarget();
      if (reduce) {
        chips.forEach(function (c, id) {
          state[id].x = state[id].target; state[id].v = 0;
          applyChip(id, state[id].x);
        });
      } else {
        kickSpring();
      }
    }

    function onPointerDown(e: PointerEvent) {
      root!.classList.remove("is-demo");
      dragChip!.setPointerCapture(e.pointerId);
      beginDrag(e.clientX);
      e.preventDefault();
    }
    function onPointerMove(e: PointerEvent) {
      if (!dragging) return;
      moveDrag(e.clientX);
      e.preventDefault();
    }
    function onPointerUp(e: PointerEvent) {
      if (!dragging) return;
      endDrag();
      e.preventDefault();
    }
    dragChip.addEventListener("pointerdown", onPointerDown);
    dragChip.addEventListener("pointermove", onPointerMove);
    dragChip.addEventListener("pointerup", onPointerUp);

    function onKeyDown(e: KeyboardEvent) {
      root!.classList.remove("is-demo");
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        grabbed = !grabbed;
        dragChip!.classList.toggle(styles.isGrabbed, grabbed);
        caption!.textContent = grabbed ? "잡았어요. 화살표로 자리를 바꾸세요" : "중점을 넘으면 이웃과 자리를 바꿔요";
        return;
      }
      if (!grabbed) return;
      let dir = 0;
      if (e.key === "ArrowLeft") dir = -1;
      else if (e.key === "ArrowRight") dir = 1;
      else if (e.key === "Escape") {
        e.preventDefault();
        grabbed = false;
        dragChip!.classList.remove(styles.isGrabbed);
        caption!.textContent = "중점을 넘으면 이웃과 자리를 바꿔요";
        return;
      } else { return; }
      e.preventDefault();
      const from = slotOf(DRAGGED_ID);
      const to = Math.max(0, Math.min(chips.length - 1, from + dir * KEY_STEP_SLOTS));
      if (to !== from) {
        moveInOrder(from, to);
        retarget();
        kickSpring();
        caption!.textContent = "자리가 바뀌었어요";
      }
    }
    dragChip.addEventListener("keydown", onKeyDown);

    if (!STEP) STEP = 96;
    retarget();

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let demoRaf = 0;
    if (reduce) {
      root.classList.remove("is-demo");
    } else {
      let demoStart: number | null = null;
      function demoTick(ts: number) {
        if (demoStart === null) { demoStart = ts; STEP = measureStep(); }
        const t = ts - demoStart;
        if (t < 200) {
          // 대기
        } else if (t < 1000) {
          const p = Math.min(1, (t - 200) / 800);
          const ease = 1 - Math.pow(1 - p, 2);
          const travel = STEP * 2 * ease;
          if (t < 220) beginDrag(0);
          moveDrag(travel);
        } else if (t < 1300) {
          // 결과 관찰
        } else if (t < 1330) {
          endDrag();
        } else {
          if (t > 1900) demoStart = ts - 60;
        }
        demoRaf = requestAnimationFrame(demoTick);
      }
      demoRaf = requestAnimationFrame(demoTick);
    }

    return () => {
      dragChip!.removeEventListener("pointerdown", onPointerDown);
      dragChip!.removeEventListener("pointermove", onPointerMove);
      dragChip!.removeEventListener("pointerup", onPointerUp);
      dragChip!.removeEventListener("keydown", onKeyDown);
      cancelAnimationFrame(raf);
      cancelAnimationFrame(demoRaf);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={`${styles.sw} is-demo`} ref={rootRef}>
        <div className={styles.track} ref={trackRef}>
          <button
            type="button"
            className={`${styles.chip} ${styles.chipDrag}`}
            ref={dragChipRef}
            aria-label="드래그해서 순서를 바꾸는 칩. Enter 로 잡고 화살표로 옆 칸과 자리를 바꿉니다"
          >A</button>
          <div className={`${styles.chip} ${styles.chipStatic}`} ref={chipBRef}>B</div>
          <div className={`${styles.chip} ${styles.chipStatic}`} ref={chipCRef}>C</div>
        </div>
        <p className={styles.caption} ref={captionRef}>중점을 넘으면 이웃과 자리를 바꿔요</p>
      </div>
    </main>
  );
}
