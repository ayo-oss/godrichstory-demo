import { useEffect, useRef } from "react";
import styles from "./DragPhysBoundaryRubber.module.scss";

type Box<T> = { current: T };
type Pt = { x: number; y: number };

export default function DragPhysBoundaryRubber() {
  const rootRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const iconRef = useRef<HTMLButtonElement>(null);
  const captionRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const box = boxRef.current;
    const icon = iconRef.current;
    const caption = captionRef.current;
    if (!root || !box || !icon || !caption) return;

    const BOUNDARY_RUBBER_MAX_PX = 40;
    const BOUNDARY_SPRING_STIFFNESS = 200;
    const BOUNDARY_SPRING_DAMPING = 20;
    const KEY_STEP_PX = 16;

    const pos: Pt = { x: 0, y: 0 };
    const vel: Pt = { x: 0, y: 0 };
    let grabbed = false;
    let pointerStart: Pt | null = null;
    let startPos: Pt = { x: 0, y: 0 };
    let raf = 0, lastTs: number | null = null;

    function bounds() {
      const br = box!.getBoundingClientRect();
      const ir = icon!.getBoundingClientRect();
      const halfW = ir.width / 2, halfH = ir.height / 2;
      return {
        minX: br.left + halfW, maxX: br.right - halfW,
        minY: br.top + halfH, maxY: br.bottom - halfH,
      };
    }

    function overflowOf(clientX: number, clientY: number) {
      const b = bounds();
      let ox = 0, oy = 0;
      if (clientX < b.minX) ox = clientX - b.minX;
      else if (clientX > b.maxX) ox = clientX - b.maxX;
      if (clientY < b.minY) oy = clientY - b.minY;
      else if (clientY > b.maxY) oy = clientY - b.maxY;
      return { x: ox, y: oy };
    }

    function applyVisual(clampedX: number, clampedY: number, overflow: Pt) {
      const ratioX = Math.min(1, Math.abs(overflow.x) / BOUNDARY_RUBBER_MAX_PX);
      const ratioY = Math.min(1, Math.abs(overflow.y) / BOUNDARY_RUBBER_MAX_PX);
      const ratio = Math.max(ratioX, ratioY);
      const scaleStretch = 1 + ratio * 0.28;
      const scaleSquash = 1 - ratio * 0.22;
      const skewX = overflow.x !== 0 ? (overflow.x > 0 ? 1 : -1) * ratioX * 6 : 0;
      const skewY = overflow.y !== 0 ? (overflow.y > 0 ? 1 : -1) * ratioY * 6 : 0;
      const sx = ratioX >= ratioY ? scaleStretch : scaleSquash;
      const sy = ratioY >= ratioX ? scaleStretch : scaleSquash;
      icon!.style.transform =
        "translate(" + clampedX.toFixed(1) + "px," + clampedY.toFixed(1) + "px) scale(" +
        sx.toFixed(3) + "," + sy.toFixed(3) + ") skew(" + skewX.toFixed(2) + "deg," + skewY.toFixed(2) + "deg)";
      root!.classList.toggle(styles.isStretch, ratio > 0.02);
    }

    function settleTick(ts: number) {
      if (lastTs === null) lastTs = ts;
      const dt = Math.min((ts - lastTs) / 1000, 0.032);
      lastTs = ts;
      const fx = (0 - pos.x) * BOUNDARY_SPRING_STIFFNESS - vel.x * BOUNDARY_SPRING_DAMPING;
      const fy = (0 - pos.y) * BOUNDARY_SPRING_STIFFNESS - vel.y * BOUNDARY_SPRING_DAMPING;
      vel.x += fx * dt; vel.y += fy * dt;
      pos.x += vel.x * dt; pos.y += vel.y * dt;
      applyVisual(pos.x, pos.y, { x: 0, y: 0 });
      const rest = Math.hypot(vel.x, vel.y) < 2 && Math.hypot(pos.x, pos.y) < 0.6;
      if (!rest) { raf = requestAnimationFrame(settleTick); return; }
      pos.x = 0; pos.y = 0; vel.x = 0; vel.y = 0;
      applyVisual(0, 0, { x: 0, y: 0 });
      lastTs = null;
    }

    function springHome() {
      cancelAnimationFrame(raf);
      lastTs = null;
      raf = requestAnimationFrame(settleTick);
    }

    function beginDrag(clientX: number, clientY: number) {
      cancelAnimationFrame(raf);
      vel.x = 0; vel.y = 0;
      pointerStart = { x: clientX, y: clientY };
      startPos = { x: pos.x, y: pos.y };
      root!.classList.add(styles.isDragging);
    }

    function moveDrag(clientX: number, clientY: number) {
      const rawX = startPos.x + (clientX - pointerStart!.x);
      const rawY = startPos.y + (clientY - pointerStart!.y);
      const iconRect = icon!.getBoundingClientRect();
      const curCx = iconRect.left + iconRect.width / 2;
      const curCy = iconRect.top + iconRect.height / 2;
      const wantCx = curCx - (pos.x - rawX);
      const wantCy = curCy - (pos.y - rawY);
      const overflow = overflowOf(wantCx, wantCy);
      const clampedOverX = Math.max(-BOUNDARY_RUBBER_MAX_PX, Math.min(BOUNDARY_RUBBER_MAX_PX, overflow.x));
      const clampedOverY = Math.max(-BOUNDARY_RUBBER_MAX_PX, Math.min(BOUNDARY_RUBBER_MAX_PX, overflow.y));
      const clampX = rawX - (overflow.x - clampedOverX);
      const clampY = rawY - (overflow.y - clampedOverY);
      pos.x = clampX; pos.y = clampY;
      applyVisual(pos.x, pos.y, { x: clampedOverX, y: clampedOverY });
      if (Math.abs(clampedOverX) > 2 || Math.abs(clampedOverY) > 2) {
        caption!.textContent = "더 밀면 늘어남이 커져요 (한도 있음)";
      } else {
        caption!.textContent = "경계 밖으로 밀면 고무처럼 눌려요";
      }
    }

    function endDrag() {
      root!.classList.remove(styles.isDragging);
      root!.classList.remove(styles.isStretch);
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      caption!.textContent = "경계 밖으로 밀면 고무처럼 눌려요";
      if (reduce) { pos.x = 0; pos.y = 0; applyVisual(0, 0, { x: 0, y: 0 }); } else { springHome(); }
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
          caption!.textContent = "잡았어요. 화살표로 밀고 Enter 로 놓으세요";
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
      const iconRect = icon!.getBoundingClientRect();
      const wantCx = iconRect.left + iconRect.width / 2 + dx;
      const wantCy = iconRect.top + iconRect.height / 2 + dy;
      const overflow = overflowOf(wantCx, wantCy);
      const clampedOverX = Math.max(-BOUNDARY_RUBBER_MAX_PX, Math.min(BOUNDARY_RUBBER_MAX_PX, overflow.x));
      const clampedOverY = Math.max(-BOUNDARY_RUBBER_MAX_PX, Math.min(BOUNDARY_RUBBER_MAX_PX, overflow.y));
      pos.x += dx - (overflow.x - clampedOverX);
      pos.y += dy - (overflow.y - clampedOverY);
      applyVisual(pos.x, pos.y, { x: clampedOverX, y: clampedOverY });
    }
    icon.addEventListener("keydown", onKeyDown);

    applyVisual(0, 0, { x: 0, y: 0 });

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let demoRaf = 0;
    if (reduce) {
      root.classList.remove("is-demo");
    } else {
      const iconRect0 = icon.getBoundingClientRect();
      const ox0 = iconRect0.left + iconRect0.width / 2;
      const oy0 = iconRect0.top + iconRect0.height / 2;
      const pushX = ox0 + 130, pushY = oy0;
      let demoStart: number | null = null;
      function demoTick(ts: number) {
        if (demoStart === null) demoStart = ts;
        const t = ts - demoStart;
        if (t < 200) {
          // 대기
        } else if (t < 900) {
          const p = Math.min(1, (t - 200) / 700);
          const ease = 1 - Math.pow(1 - p, 2);
          const cx = ox0 + (pushX - ox0) * ease;
          if (t < 220) beginDrag(ox0, oy0);
          moveDrag(cx, pushY);
        } else if (t < 1150) {
          // 눌린 모양 관찰
        } else if (t < 1180) {
          endDrag();
        } else {
          if (t > 1900) demoStart = ts - 60;
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
      <div className={`${styles.br} is-demo`} ref={rootRef}>
        <div className={styles.box} ref={boxRef}>
          <button
            type="button"
            className={styles.icon}
            ref={iconRef}
            aria-label="경계 안에서만 움직이는 아이콘. 경계를 넘으면 고무처럼 늘어납니다. Enter 로 잡고 화살표로 이동, Enter 로 놓습니다"
          ></button>
        </div>
        <p className={styles.caption} ref={captionRef}>경계 밖으로 밀면 고무처럼 눌려요</p>
      </div>
    </main>
  );
}
