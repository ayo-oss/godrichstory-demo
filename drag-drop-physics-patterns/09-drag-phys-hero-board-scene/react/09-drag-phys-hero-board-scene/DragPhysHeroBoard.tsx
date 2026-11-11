import { useEffect, useRef } from "react";
import styles from "./DragPhysHeroBoard.module.scss";

type Box<T> = { current: T };
type Pt = { x: number; y: number };

export default function DragPhysHeroBoard() {
  const rootRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const cellARef = useRef<HTMLDivElement>(null);
  const cellBRef = useRef<HTMLDivElement>(null);
  const iconRef = useRef<HTMLButtonElement>(null);
  const captionRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const board = boardRef.current;
    const icon = iconRef.current;
    const caption = captionRef.current;
    const cells = [cellARef.current, cellBRef.current].filter(Boolean) as HTMLDivElement[];
    if (!root || !board || !icon || !caption || cells.length !== 2) return;

    const HERO_GRID_MAGNET_SNAP_PX = 26;
    const HERO_BOUNDARY_RUBBER_MAX_PX = 36;
    const HERO_FLING_DECAY_RATE = 0.93;
    const HERO_SPRING_STIFFNESS = 190;
    const HERO_SPRING_DAMPING = 19;
    const KEY_STEP_PX = 16;

    const pos: Pt = { x: 0, y: 0 };
    const vel: Pt = { x: 0, y: 0 };
    let origin: Pt | null = null;
    let pointerStart: Pt | null = null;
    let startPos: Pt | null = null;
    let lastSample: { x: number; y: number; t: number } | null = null;
    let dragging = false;
    let grabbed = false;
    let raf = 0;
    let lastTs: number | null = null;

    function iconOrigin(): Pt {
      if (origin) return origin;
      const r = icon!.getBoundingClientRect();
      origin = { x: r.left + r.width / 2 - pos.x, y: r.top + r.height / 2 - pos.y };
      return origin;
    }

    function boardBounds() {
      const br = board!.getBoundingClientRect();
      const ir = icon!.getBoundingClientRect();
      const halfW = ir.width / 2, halfH = ir.height / 2;
      return { minX: br.left + halfW, maxX: br.right - halfW, minY: br.top + halfH, maxY: br.bottom - halfH };
    }

    type NearestCell = { cell: HTMLDivElement; x: number; y: number; dist: number };
    function nearestCell(cx: number, cy: number): NearestCell | null {
      let best: NearestCell | null = null;
      let bestD = Infinity;
      cells.forEach(function (cell) {
        const cr = cell.getBoundingClientRect();
        const ccx = cr.left + cr.width / 2, ccy = cr.top + cr.height / 2;
        const d = Math.hypot(cx - ccx, cy - ccy);
        if (d < bestD) { bestD = d; best = { cell: cell, x: ccx, y: ccy, dist: d }; }
      });
      return best;
    }

    function applyIcon(scaleX?: number, scaleY?: number) {
      const sx = scaleX === undefined ? 1 : scaleX;
      const sy = scaleY === undefined ? 1 : scaleY;
      icon!.style.transform = "translate(" + pos.x.toFixed(1) + "px," + pos.y.toFixed(1) + "px) scale(" + sx.toFixed(3) + "," + sy.toFixed(3) + ")";
    }

    function beginDrag(clientX: number, clientY: number) {
      cancelAnimationFrame(raf);
      dragging = true;
      vel.x = 0; vel.y = 0;
      pointerStart = { x: clientX, y: clientY };
      startPos = { x: pos.x, y: pos.y };
      lastSample = { x: clientX, y: clientY, t: performance.now() };
      root!.classList.add(styles.isDragging);
      cells.forEach(function (c) { c.classList.remove(styles.isTarget); });
    }

    function moveDrag(clientX: number, clientY: number) {
      const rawX = startPos!.x + (clientX - pointerStart!.x);
      const rawY = startPos!.y + (clientY - pointerStart!.y);
      const o = iconOrigin();
      const cx = o.x + rawX, cy = o.y + rawY;

      const near = nearestCell(cx, cy);
      cells.forEach(function (c) { c.classList.remove(styles.isTarget); });

      if (near && near.dist < HERO_GRID_MAGNET_SNAP_PX) {
        near.cell.classList.add(styles.isTarget);
        const pull = Math.max(0, 1 - near.dist / HERO_GRID_MAGNET_SNAP_PX) * 0.6;
        pos.x = rawX + ((near.x - o.x) - rawX) * pull;
        pos.y = rawY + ((near.y - o.y) - rawY) * pull;
        applyIcon(1, 1);
        caption!.textContent = "자석 칸에 붙어요";
      } else {
        const b = boardBounds();
        let overX = 0, overY = 0;
        if (cx < b.minX) overX = cx - b.minX; else if (cx > b.maxX) overX = cx - b.maxX;
        if (cy < b.minY) overY = cy - b.minY; else if (cy > b.maxY) overY = cy - b.maxY;
        if (overX !== 0 || overY !== 0) {
          const clampedX = Math.max(-HERO_BOUNDARY_RUBBER_MAX_PX, Math.min(HERO_BOUNDARY_RUBBER_MAX_PX, overX));
          const clampedY = Math.max(-HERO_BOUNDARY_RUBBER_MAX_PX, Math.min(HERO_BOUNDARY_RUBBER_MAX_PX, overY));
          pos.x = rawX - (overX - clampedX);
          pos.y = rawY - (overY - clampedY);
          const ratio = Math.max(Math.abs(clampedX), Math.abs(clampedY)) / HERO_BOUNDARY_RUBBER_MAX_PX;
          applyIcon(1 + ratio * 0.22, 1 - ratio * 0.18);
          caption!.textContent = "경계에서 고무처럼 눌려요";
        } else {
          pos.x = rawX; pos.y = rawY;
          applyIcon(1, 1);
          caption!.textContent = "놓으면 속도대로 던져져요";
        }
      }
      const now = performance.now();
      const dt = Math.max((now - lastSample!.t) / 1000, 0.001);
      vel.x = (clientX - lastSample!.x) / dt;
      vel.y = (clientY - lastSample!.y) / dt;
      lastSample = { x: clientX, y: clientY, t: now };
    }

    function settleSpring(target: Pt) {
      lastTs = null;
      function tick(ts: number) {
        if (lastTs === null) lastTs = ts;
        const dt = Math.min((ts - lastTs) / 1000, 0.032);
        lastTs = ts;
        const fx = (target.x - pos.x) * HERO_SPRING_STIFFNESS - vel.x * HERO_SPRING_DAMPING;
        const fy = (target.y - pos.y) * HERO_SPRING_STIFFNESS - vel.y * HERO_SPRING_DAMPING;
        vel.x += fx * dt; vel.y += fy * dt;
        pos.x += vel.x * dt; pos.y += vel.y * dt;
        applyIcon(1, 1);
        const rest = Math.hypot(vel.x, vel.y) < 2 && Math.hypot(target.x - pos.x, target.y - pos.y) < 0.6;
        if (!rest) { raf = requestAnimationFrame(tick); return; }
        pos.x = target.x; pos.y = target.y; vel.x = 0; vel.y = 0;
        applyIcon(1, 1);
      }
      raf = requestAnimationFrame(tick);
    }

    function flingSettle() {
      lastTs = null;
      function tick(ts: number) {
        if (lastTs === null) lastTs = ts;
        const dt = Math.min((ts - lastTs) / 1000, 0.032);
        lastTs = ts;
        pos.x += vel.x * dt; pos.y += vel.y * dt;
        const o = iconOrigin();
        const b = boardBounds();
        const cx = o.x + pos.x, cy = o.y + pos.y;
        if (cx < b.minX) { pos.x += b.minX - cx; vel.x = Math.abs(vel.x); }
        else if (cx > b.maxX) { pos.x -= cx - b.maxX; vel.x = -Math.abs(vel.x); }
        if (cy < b.minY) { pos.y += b.minY - cy; vel.y = Math.abs(vel.y); }
        else if (cy > b.maxY) { pos.y -= cy - b.maxY; vel.y = -Math.abs(vel.y); }
        vel.x *= Math.pow(HERO_FLING_DECAY_RATE, dt * 60);
        vel.y *= Math.pow(HERO_FLING_DECAY_RATE, dt * 60);
        applyIcon(1, 1);
        const speed = Math.hypot(vel.x, vel.y);
        if (speed > 4) { raf = requestAnimationFrame(tick); return; }
        vel.x = 0; vel.y = 0;
      }
      raf = requestAnimationFrame(tick);
    }

    function endDrag() {
      dragging = false;
      root!.classList.remove(styles.isDragging);
      const o = iconOrigin();
      const cx = o.x + pos.x, cy = o.y + pos.y;
      const near = nearestCell(cx, cy);
      cells.forEach(function (c) { c.classList.remove(styles.isTarget); });
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (near && near.dist < HERO_GRID_MAGNET_SNAP_PX) {
        caption!.textContent = "자석 칸에 붙었어요";
        const target = { x: near.x - o.x, y: near.y - o.y };
        if (reduce) { pos.x = target.x; pos.y = target.y; applyIcon(1, 1); }
        else { cancelAnimationFrame(raf); settleSpring(target); }
        return;
      }
      const b = boardBounds();
      let overX = 0, overY = 0;
      if (cx < b.minX) overX = cx - b.minX; else if (cx > b.maxX) overX = cx - b.maxX;
      if (cy < b.minY) overY = cy - b.minY; else if (cy > b.maxY) overY = cy - b.maxY;
      if (overX !== 0 || overY !== 0) {
        caption!.textContent = "경계 밖이라 안으로 되돌아가요";
        const clampX = Math.max(b.minX, Math.min(b.maxX, cx)) - o.x;
        const clampY = Math.max(b.minY, Math.min(b.maxY, cy)) - o.y;
        if (reduce) { pos.x = clampX; pos.y = clampY; applyIcon(1, 1); }
        else { cancelAnimationFrame(raf); settleSpring({ x: clampX, y: clampY }); }
        return;
      }
      caption!.textContent = "자석 칸 · 고무 경계 · 던지기 관성을 한 판에서 써보세요";
      if (reduce || Math.hypot(vel.x, vel.y) < 30) { vel.x = 0; vel.y = 0; }
      else { cancelAnimationFrame(raf); flingSettle(); }
    }

    function onPointerDown(e: PointerEvent) {
      root!.classList.remove("is-demo");
      icon!.setPointerCapture(e.pointerId);
      beginDrag(e.clientX, e.clientY);
      e.preventDefault();
    }
    function onPointerMove(e: PointerEvent) {
      if (!dragging) return;
      moveDrag(e.clientX, e.clientY);
      e.preventDefault();
    }
    function onPointerUp(e: PointerEvent) {
      if (!dragging) return;
      endDrag();
      e.preventDefault();
    }
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
          endDrag();
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
        endDrag();
        return;
      } else { return; }
      e.preventDefault();
      pos.x += dx; pos.y += dy;
      applyIcon(1, 1);
    }

    icon.addEventListener("pointerdown", onPointerDown);
    icon.addEventListener("pointermove", onPointerMove);
    icon.addEventListener("pointerup", onPointerUp);
    icon.addEventListener("keydown", onKeyDown);

    applyIcon(1, 1);

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let demoRaf = 0;
    if (reduce) {
      root.classList.remove("is-demo");
    } else {
      const iconRect0 = icon.getBoundingClientRect();
      const ox0 = iconRect0.left + iconRect0.width / 2;
      const oy0 = iconRect0.top + iconRect0.height / 2;
      const cellRect0 = cells[0].getBoundingClientRect();
      const gx0 = cellRect0.left + cellRect0.width / 2;
      const gy0 = cellRect0.top + cellRect0.height / 2;
      let demoStart: number | null = null;
      function demoTick(ts: number) {
        if (demoStart === null) demoStart = ts;
        const t = ts - demoStart;
        if (t < 200) {
          // 대기
        } else if (t < 800) {
          const p = Math.min(1, (t - 200) / 600);
          const ease = 1 - Math.pow(1 - p, 2);
          const cx = ox0 + (gx0 - ox0) * ease;
          const cy = oy0 + (gy0 - oy0) * ease;
          if (t < 220) beginDrag(ox0, oy0);
          moveDrag(cx, cy);
        } else if (t < 950) {
          // 대기
        } else if (t < 980) {
          endDrag();
        } else if (t < 1400) {
          // 정착 관찰
        } else if (t < 1420) {
          beginDrag(gx0, gy0);
        } else if (t < 1650) {
          const p2 = (t - 1420) / 230;
          moveDrag(gx0 + p2 * 70, gy0 - p2 * 20);
        } else if (t < 1680) {
          endDrag();
        } else {
          if (t > 2200) demoStart = ts - 60;
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
      <div className={`${styles.hb} is-demo`} ref={rootRef}>
        <div className={styles.board} ref={boardRef}>
          <div className={styles.cell} ref={cellARef} style={{ left: "10%", top: "12%" }}></div>
          <div className={styles.cell} ref={cellBRef} style={{ right: "10%", bottom: "12%" }}></div>
          <button
            type="button"
            className={styles.icon}
            ref={iconRef}
            aria-label="자석 칸에 붙거나, 경계에서 눌리거나, 던지면 튕기며 날아가는 아이콘. Enter 로 잡고 화살표로 이동, Enter 로 놓습니다"
          ></button>
        </div>
        <p className={styles.caption} ref={captionRef}>자석 칸 · 고무 경계 · 던지기 관성을 한 판에서 써보세요</p>
      </div>
    </main>
  );
}
