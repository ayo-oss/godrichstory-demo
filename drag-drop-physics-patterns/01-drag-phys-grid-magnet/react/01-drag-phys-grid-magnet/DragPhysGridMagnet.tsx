import { useEffect, useRef } from "react";
import styles from "./DragPhysGridMagnet.module.scss";

type Box<T> = { current: T };
type Pt = { x: number; y: number };

export default function DragPhysGridMagnet() {
  const rootRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const iconRef = useRef<HTMLButtonElement>(null);
  const captionRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const grid = gridRef.current;
    const icon = iconRef.current;
    const caption = captionRef.current;
    if (!root || !grid || !icon || !caption) return;
    const cells = Array.prototype.slice.call(grid.querySelectorAll("." + styles.cell)) as HTMLDivElement[];

    const GRID_MAGNET_SNAP_PX = 24;
    const KEY_STEP_PX = 16;
    const SPRING_STIFFNESS = 180;
    const SPRING_DAMPING = 18;

    const pos: Pt = { x: 0, y: 0 };
    const vel: Pt = { x: 0, y: 0 };
    let settleTarget: Pt = { x: 0, y: 0 };
    let grabbed = false;
    let pointerStart: Pt | null = null;
    let startPos: Pt = { x: 0, y: 0 };

    function applyPos() {
      icon!.style.transform = "translate(" + pos.x.toFixed(1) + "px," + pos.y.toFixed(1) + "px)";
    }

    type NearestCell = { cell: HTMLDivElement | null; dist: number; offset: Pt };
    function nearestCell(): NearestCell {
      const r = icon!.getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      let best: HTMLDivElement | null = null;
      let bestD = Infinity;
      let bestOffset: Pt = { x: 0, y: 0 };
      cells.forEach(function (cell) {
        const cr = cell.getBoundingClientRect();
        const ccx = cr.left + cr.width / 2, ccy = cr.top + cr.height / 2;
        const d = Math.hypot(cx - ccx, cy - ccy);
        if (d < bestD) {
          bestD = d; best = cell;
          bestOffset = { x: pos.x + (ccx - cx), y: pos.y + (ccy - cy) };
        }
      });
      return { cell: best, dist: bestD, offset: bestOffset };
    }

    function updateMagnetHighlight(rawX: number, rawY: number) {
      const near = nearestCell();
      cells.forEach(function (c) { c.classList.remove(styles.isTarget); });
      if (near.dist < GRID_MAGNET_SNAP_PX && near.cell) {
        near.cell.classList.add(styles.isTarget);
        const pull = Math.max(0, 1 - near.dist / GRID_MAGNET_SNAP_PX) * 0.55;
        pos.x = rawX + (near.offset.x - rawX) * pull;
        pos.y = rawY + (near.offset.y - rawY) * pull;
      } else {
        pos.x = rawX; pos.y = rawY;
      }
      applyPos();
    }

    let raf = 0, lastTs: number | null = null;
    function settleTick(ts: number) {
      if (lastTs === null) lastTs = ts;
      const dt = Math.min((ts - lastTs) / 1000, 0.032);
      lastTs = ts;
      const fx = (settleTarget.x - pos.x) * SPRING_STIFFNESS - vel.x * SPRING_DAMPING;
      const fy = (settleTarget.y - pos.y) * SPRING_STIFFNESS - vel.y * SPRING_DAMPING;
      vel.x += fx * dt; vel.y += fy * dt;
      pos.x += vel.x * dt; pos.y += vel.y * dt;
      applyPos();
      const rest = Math.hypot(vel.x, vel.y) < 2 && Math.hypot(settleTarget.x - pos.x, settleTarget.y - pos.y) < 0.6;
      if (!rest) { raf = requestAnimationFrame(settleTick); return; }
      pos.x = settleTarget.x; pos.y = settleTarget.y; vel.x = 0; vel.y = 0;
      applyPos();
      lastTs = null;
    }

    function springTo(target: Pt) {
      cancelAnimationFrame(raf);
      settleTarget = target;
      lastTs = null;
      raf = requestAnimationFrame(settleTick);
    }

    function releaseDrag() {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const near = nearestCell();
      cells.forEach(function (c) { c.classList.remove(styles.isTarget); });
      const goal = near.dist < GRID_MAGNET_SNAP_PX ? near.offset : { x: 0, y: 0 };
      if (near.dist < GRID_MAGNET_SNAP_PX) {
        caption!.textContent = "칸에 붙었어요";
        root!.classList.add(styles.isSnapped);
      } else {
        caption!.textContent = "칸 가까이 놓으면 자석처럼 붙어요";
        root!.classList.remove(styles.isSnapped);
      }
      if (reduce) { pos.x = goal.x; pos.y = goal.y; applyPos(); } else { springTo(goal); }
    }

    function beginDrag(clientX: number, clientY: number) {
      cancelAnimationFrame(raf);
      pointerStart = { x: clientX, y: clientY };
      startPos = { x: pos.x, y: pos.y };
      root!.classList.add(styles.isDragging);
    }

    function moveDrag(clientX: number, clientY: number) {
      const rawX = startPos.x + (clientX - pointerStart!.x);
      const rawY = startPos.y + (clientY - pointerStart!.y);
      updateMagnetHighlight(rawX, rawY);
    }

    function endDrag() {
      root!.classList.remove(styles.isDragging);
      releaseDrag();
    }

    function onPointerDown(e: PointerEvent) {
      root!.classList.remove("is-demo");
      icon!.setPointerCapture(e.pointerId);
      beginDrag(e.clientX, e.clientY);
      e.preventDefault();
    }
    function onPointerMove(e: PointerEvent) {
      if (!pointerStart) return;
      moveDrag(e.clientX, e.clientY);
      e.preventDefault();
    }
    function onPointerUp(e: PointerEvent) {
      if (!pointerStart) return;
      pointerStart = null;
      endDrag();
      e.preventDefault();
    }
    icon.addEventListener("pointerdown", onPointerDown);
    icon.addEventListener("pointermove", onPointerMove);
    icon.addEventListener("pointerup", onPointerUp);

    function onKeyDown(e: KeyboardEvent) {
      root!.classList.remove("is-demo");
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        if (!grabbed) {
          grabbed = true;
          cancelAnimationFrame(raf);
          icon!.classList.add(styles.isGrabbed);
          caption!.textContent = "잡았어요. 화살표로 옮기고 Enter 로 놓으세요";
        } else {
          grabbed = false;
          icon!.classList.remove(styles.isGrabbed);
          releaseDrag();
        }
        return;
      }
      if (!grabbed) return;
      let dx = 0, dy = 0;
      if (e.key === "ArrowLeft") dx = -KEY_STEP_PX;
      else if (e.key === "ArrowRight") dx = KEY_STEP_PX;
      else if (e.key === "ArrowUp") dy = -KEY_STEP_PX;
      else if (e.key === "ArrowDown") dy = KEY_STEP_PX;
      else if (e.key === "Escape") {
        e.preventDefault();
        grabbed = false;
        icon!.classList.remove(styles.isGrabbed);
        springTo({ x: 0, y: 0 });
        caption!.textContent = "칸 가까이 놓으면 자석처럼 붙어요";
        return;
      } else { return; }
      e.preventDefault();
      updateMagnetHighlight(pos.x + dx, pos.y + dy);
    }
    icon.addEventListener("keydown", onKeyDown);

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let demoRaf = 0;
    if (reduce) {
      root.classList.remove("is-demo");
    } else {
      const iconRect0 = icon.getBoundingClientRect();
      const originX = iconRect0.left + iconRect0.width / 2;
      const originY = iconRect0.top + iconRect0.height / 2;
      const cellRect0 = cells[1].getBoundingClientRect();
      const goalX = cellRect0.left + cellRect0.width / 2;
      const goalY = cellRect0.top + cellRect0.height / 2;
      let demoStart: number | null = null;
      function demoTick(ts: number) {
        if (demoStart === null) demoStart = ts;
        const t = ts - demoStart;
        if (t < 200) {
          // 대기
        } else if (t < 900) {
          const p = Math.min(1, (t - 200) / 700);
          const ease = 1 - Math.pow(1 - p, 3);
          const cx = originX + (goalX - originX) * ease;
          const cy = originY + (goalY - originY) * ease;
          if (t < 220) beginDrag(originX, originY);
          moveDrag(cx, cy);
        } else if (t < 950) {
          // 대기
        } else if (t < 970) {
          endDrag();
        } else if (t < 1500) {
          // 대기
        } else if (t < 2200) {
          const p2 = Math.min(1, (t - 1500) / 600);
          const ease2 = 1 - Math.pow(1 - p2, 3);
          const cx2 = goalX + (originX - goalX) * ease2 * 0.7;
          const cy2 = goalY + (originY - goalY) * ease2 * 0.7;
          if (t < 1520) beginDrag(goalX, goalY);
          moveDrag(cx2, cy2);
        } else if (t < 2260) {
          endDrag();
        } else {
          demoStart = ts - 60;
        }
        demoRaf = requestAnimationFrame(demoTick);
      }
      demoRaf = requestAnimationFrame(demoTick);
    }

    return () => {
      icon.removeEventListener("pointerdown", onPointerDown);
      icon.removeEventListener("pointermove", onPointerMove);
      icon.removeEventListener("pointerup", onPointerUp);
      icon.removeEventListener("keydown", onKeyDown);
      cancelAnimationFrame(raf);
      cancelAnimationFrame(demoRaf);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={`${styles.gm} is-demo`} ref={rootRef}>
        <div className={styles.grid} ref={gridRef}>
          <div className={styles.cell}></div>
          <div className={styles.cell}></div>
          <div className={styles.cell}></div>
          <div className={styles.cell}></div>
          <div className={styles.cell}></div>
          <div className={styles.cell}></div>
        </div>
        <div className={styles.tray}>
          <button
            type="button"
            className={styles.icon}
            ref={iconRef}
            aria-label="드래그해서 격자 칸에 놓는 아이콘. Enter 로 잡고 화살표로 이동, Enter 로 다시 놓습니다"
          ></button>
        </div>
        <p className={styles.caption} ref={captionRef}>칸 가까이 놓으면 자석처럼 붙어요</p>
      </div>
    </main>
  );
}
