import { useEffect, useRef } from "react";
import styles from "./DragPhysElasticTether.module.scss";

type Box<T> = { current: T };
type Pt = { x: number; y: number };

export default function DragPhysElasticTether() {
  const rootRef = useRef<HTMLDivElement>(null);
  const originRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<HTMLDivElement>(null);
  const iconRef = useRef<HTMLButtonElement>(null);
  const captionRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const origin = originRef.current;
    const line = lineRef.current;
    const icon = iconRef.current;
    const caption = captionRef.current;
    if (!root || !origin || !line || !icon || !caption) return;

    const TETHER_SPRING_STIFFNESS = 140;
    const TETHER_SPRING_DAMPING = 12;
    const TETHER_THICKNESS_BASE_PX = 5;
    const KEY_STEP_PX = 18;

    const pos: Pt = { x: 0, y: 0 };
    const vel: Pt = { x: 0, y: 0 };
    let grabbed = false;
    let pointerStart: Pt | null = null;
    let startPos: Pt = { x: 0, y: 0 };
    let raf = 0, lastTs: number | null = null;

    function applyIcon() {
      icon!.style.transform = "translate(" + pos.x.toFixed(1) + "px," + pos.y.toFixed(1) + "px)";
    }

    function drawTether() {
      const or = origin!.getBoundingClientRect();
      const ir = icon!.getBoundingClientRect();
      const ox = or.left + or.width / 2, oy = or.top + or.height / 2;
      const ix = ir.left + ir.width / 2, iy = ir.top + ir.height / 2;
      const dx = ix - ox, dy = iy - oy;
      const length = Math.hypot(dx, dy);
      const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
      const thickness = Math.max(1.5, TETHER_THICKNESS_BASE_PX - length * 0.012);
      const boardRect = root!.getBoundingClientRect();
      line!.style.left = ox - boardRect.left + "px";
      line!.style.top = oy - boardRect.top + "px";
      line!.style.width = length + "px";
      line!.style.height = thickness + "px";
      line!.style.transform = "rotate(" + angle + "deg)";
      line!.style.opacity = length < 2 ? "0" : "1";
    }

    function settleTick(ts: number) {
      if (lastTs === null) lastTs = ts;
      const dt = Math.min((ts - lastTs) / 1000, 0.032);
      lastTs = ts;
      const fx = (0 - pos.x) * TETHER_SPRING_STIFFNESS - vel.x * TETHER_SPRING_DAMPING;
      const fy = (0 - pos.y) * TETHER_SPRING_STIFFNESS - vel.y * TETHER_SPRING_DAMPING;
      vel.x += fx * dt; vel.y += fy * dt;
      pos.x += vel.x * dt; pos.y += vel.y * dt;
      applyIcon();
      drawTether();
      const rest = Math.hypot(vel.x, vel.y) < 2 && Math.hypot(pos.x, pos.y) < 0.6;
      if (!rest) { raf = requestAnimationFrame(settleTick); return; }
      pos.x = 0; pos.y = 0; vel.x = 0; vel.y = 0;
      applyIcon(); drawTether();
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
      caption!.textContent = "늘어나는 줄 길이·굵기가 실시간으로 계산돼요";
    }

    function moveDrag(clientX: number, clientY: number) {
      pos.x = startPos.x + (clientX - pointerStart!.x);
      pos.y = startPos.y + (clientY - pointerStart!.y);
      applyIcon();
      drawTether();
    }

    function endDrag() {
      root!.classList.remove(styles.isDragging);
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      caption!.textContent = "멀리 끌면 줄이 늘어나요. 놓으면 되돌아가요";
      if (reduce) { pos.x = 0; pos.y = 0; applyIcon(); drawTether(); } else { springHome(); }
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
          caption!.textContent = "잡았어요. 화살표로 늘이고 Enter 로 놓으세요";
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
      applyIcon();
      drawTether();
    }
    icon.addEventListener("keydown", onKeyDown);

    drawTether();

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let demoRaf = 0;
    if (reduce) {
      root.classList.remove("is-demo");
    } else {
      const originRect0 = origin.getBoundingClientRect();
      const ox0 = originRect0.left + originRect0.width / 2;
      const oy0 = originRect0.top + originRect0.height / 2;
      const farX = ox0 + 92, farY = oy0 - 46;
      let demoStart: number | null = null;
      function demoTick(ts: number) {
        if (demoStart === null) demoStart = ts;
        const t = ts - demoStart;
        if (t < 200) {
          // 대기
        } else if (t < 950) {
          const p = Math.min(1, (t - 200) / 750);
          const ease = 1 - Math.pow(1 - p, 2);
          const cx = ox0 + (farX - ox0) * ease;
          const cy = oy0 + (farY - oy0) * ease;
          if (t < 220) beginDrag(ox0, oy0);
          moveDrag(cx, cy);
        } else if (t < 1150) {
          // 최대 늘어남 유지
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
      <div className={`${styles.et} is-demo`} ref={rootRef}>
        <div className={styles.origin} ref={originRef}></div>
        <div className={styles.line} ref={lineRef}></div>
        <button
          type="button"
          className={styles.icon}
          ref={iconRef}
          aria-label="탄성 테더로 당겨지는 아이콘. Enter 로 잡고 화살표로 늘이고, Enter 로 놓으면 되돌아갑니다"
        ></button>
        <p className={styles.caption} ref={captionRef}>멀리 끌면 줄이 늘어나요. 놓으면 되돌아가요</p>
      </div>
    </main>
  );
}
