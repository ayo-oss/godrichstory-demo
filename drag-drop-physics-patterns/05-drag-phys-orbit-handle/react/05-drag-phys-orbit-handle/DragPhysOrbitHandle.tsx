import { useEffect, useRef } from "react";
import styles from "./DragPhysOrbitHandle.module.scss";

type Box<T> = { current: T };

export default function DragPhysOrbitHandle() {
  const rootRef = useRef<HTMLDivElement>(null);
  const hubRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLButtonElement>(null);
  const captionRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const hub = hubRef.current;
    const handle = handleRef.current;
    const caption = captionRef.current;
    if (!root || !hub || !handle || !caption) return;

    const ORBIT_RADIUS_PX = 74;
    const ORBIT_KEY_STEP_DEG = 12;
    const ORBIT_DECAY_RATE = 0.94;

    let angle = (-90 * Math.PI) / 180;
    let angularVel = 0;
    let grabbed = false;
    let dragging = false;
    let lastAngle = angle;
    let lastTs: number | null = null;
    let raf = 0;

    function applyHandle() {
      const x = Math.cos(angle) * ORBIT_RADIUS_PX;
      const y = Math.sin(angle) * ORBIT_RADIUS_PX;
      handle!.style.transform = "translate(" + x.toFixed(1) + "px," + y.toFixed(1) + "px)";
    }

    function angleFromPointer(clientX: number, clientY: number) {
      const hr = hub!.getBoundingClientRect();
      const hx = hr.left + hr.width / 2, hy = hr.top + hr.height / 2;
      return Math.atan2(clientY - hy, clientX - hx);
    }

    function shortestDelta(a: number, b: number) {
      let d = b - a;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      return d;
    }

    function inertiaTick(ts: number) {
      if (lastTs === null) lastTs = ts;
      const dt = Math.min((ts - lastTs) / 1000, 0.032);
      lastTs = ts;
      angle += angularVel * dt;
      angularVel *= Math.pow(ORBIT_DECAY_RATE, dt * 60);
      applyHandle();
      if (Math.abs(angularVel) > 0.02) { raf = requestAnimationFrame(inertiaTick); return; }
      angularVel = 0;
      lastTs = null;
    }

    function beginDrag(clientX: number, clientY: number) {
      cancelAnimationFrame(raf);
      dragging = true;
      angularVel = 0;
      angle = angleFromPointer(clientX, clientY);
      lastAngle = angle;
      lastTs = null;
      root!.classList.add(styles.isDragging);
      applyHandle();
    }

    function moveDrag(clientX: number, clientY: number, ts?: number) {
      const next = angleFromPointer(clientX, clientY);
      const delta = shortestDelta(lastAngle, next);
      angle = lastAngle + delta;
      if (ts !== undefined && lastTs !== null) {
        const dt = Math.max((ts - lastTs) / 1000, 0.001);
        angularVel = delta / dt;
      }
      lastAngle = angle;
      lastTs = ts !== undefined ? ts : lastTs;
      applyHandle();
    }

    function endDrag() {
      dragging = false;
      root!.classList.remove(styles.isDragging);
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduce || Math.abs(angularVel) < 0.02) { angularVel = 0; } else { lastTs = null; raf = requestAnimationFrame(inertiaTick); }
    }

    function onPointerDown(e: PointerEvent) {
      root!.classList.remove("is-demo");
      handle!.setPointerCapture(e.pointerId);
      beginDrag(e.clientX, e.clientY);
      caption!.textContent = "각도만 계산해서 궤도 위를 이동해요";
      e.preventDefault();
    }
    function onPointerMove(e: PointerEvent) {
      if (!dragging) return;
      moveDrag(e.clientX, e.clientY, e.timeStamp);
      e.preventDefault();
    }
    function onPointerUp(e: PointerEvent) {
      if (!dragging) return;
      endDrag();
      caption!.textContent = "끌면 각도만 바뀌며 궤도를 돌아요";
      e.preventDefault();
    }
    handle.addEventListener("pointerdown", onPointerDown);
    handle.addEventListener("pointermove", onPointerMove);
    handle.addEventListener("pointerup", onPointerUp);

    function onKeyDown(e: KeyboardEvent) {
      root!.classList.remove("is-demo");
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        grabbed = !grabbed;
        handle!.classList.toggle(styles.isGrabbed, grabbed);
        caption!.textContent = grabbed ? "잡았어요. 화살표로 각도를 돌리세요" : "끌면 각도만 바뀌며 궤도를 돌아요";
        return;
      }
      if (!grabbed) return;
      let dir = 0;
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") dir = -1;
      else if (e.key === "ArrowRight" || e.key === "ArrowDown") dir = 1;
      else if (e.key === "Escape") {
        e.preventDefault();
        grabbed = false;
        handle!.classList.remove(styles.isGrabbed);
        caption!.textContent = "끌면 각도만 바뀌며 궤도를 돌아요";
        return;
      } else { return; }
      e.preventDefault();
      cancelAnimationFrame(raf);
      angularVel = 0;
      angle += (dir * ORBIT_KEY_STEP_DEG * Math.PI) / 180;
      applyHandle();
    }
    handle.addEventListener("keydown", onKeyDown);

    applyHandle();

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let demoRaf = 0;
    if (reduce) {
      root.classList.remove("is-demo");
    } else {
      const hubRect0 = hub.getBoundingClientRect();
      const hx0 = hubRect0.left + hubRect0.width / 2;
      const hy0 = hubRect0.top + hubRect0.height / 2;
      let demoStart: number | null = null;
      function demoTick(ts: number) {
        if (demoStart === null) demoStart = ts;
        const t = ts - demoStart;
        if (t < 200) {
          // 대기
        } else if (t < 1300) {
          const p = (t - 200) / 1100;
          const a = ((-90 + p * 200) * Math.PI) / 180;
          const px = hx0 + Math.cos(a) * (ORBIT_RADIUS_PX + 40);
          const py = hy0 + Math.sin(a) * (ORBIT_RADIUS_PX + 40);
          if (t < 220) beginDrag(px, py);
          moveDrag(px, py, ts);
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
      handle.removeEventListener("pointerdown", onPointerDown);
      handle.removeEventListener("pointermove", onPointerMove);
      handle.removeEventListener("pointerup", onPointerUp);
      handle.removeEventListener("keydown", onKeyDown);
      cancelAnimationFrame(raf);
      cancelAnimationFrame(demoRaf);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={`${styles.ob} is-demo`} ref={rootRef}>
        <div className={styles.ring}></div>
        <div className={styles.hub} ref={hubRef}></div>
        <button
          type="button"
          className={styles.handle}
          ref={handleRef}
          aria-label="고정 반지름 궤도를 도는 핸들. Enter 로 잡고 화살표로 각도를 돌립니다"
        ></button>
        <p className={styles.caption} ref={captionRef}>끌면 각도만 바뀌며 궤도를 돌아요</p>
      </div>
    </main>
  );
}
