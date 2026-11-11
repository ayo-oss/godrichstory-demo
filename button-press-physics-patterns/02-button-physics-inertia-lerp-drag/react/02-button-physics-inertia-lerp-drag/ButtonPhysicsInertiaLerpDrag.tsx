import { useEffect, useRef } from "react";
import styles from "./ButtonPhysicsInertiaLerpDrag.module.scss";

export type ButtonPhysicsInertiaLerpDragProps = {
  color?: string;
};

export default function ButtonPhysicsInertiaLerpDrag({
  color = "#4cd4a6",
}: ButtonPhysicsInertiaLerpDragProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const field = root.querySelector<HTMLDivElement>(`.${styles.field}`);
    const fab = root.querySelector<HTMLButtonElement>(`.${styles.fab}`);
    if (!field || !fab) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // 계산 겹: 포인터 위치 값(targetX/Y)과 버튼 위치 값(x/y)의 차이를 매 프레임 LERP_RATIO
    // 만큼만 좁힌다 — x += (targetX-x)*LERP_RATIO. 비율이 1에 가까울수록 즉시 따라붙고,
    // 낮을수록 지연(트레일)이 길어진다.
    const LERP_RATIO = 0.14;
    const FAB_R = 26;
    let x = 0, y = 0, targetX = 0, targetY = 0, raf: number | null = null;

    function bounds() { return { w: field!.clientWidth, h: field!.clientHeight }; }
    function clampPos(px: number, py: number): [number, number] {
      const b = bounds();
      return [Math.max(FAB_R, Math.min(b.w - FAB_R, px)), Math.max(FAB_R, Math.min(b.h - FAB_R, py))];
    }
    function paint() { fab!.style.transform = "translate(" + (x - FAB_R).toFixed(1) + "px," + (y - FAB_R).toFixed(1) + "px)"; }
    function tick() {
      x += (targetX - x) * LERP_RATIO;
      y += (targetY - y) * LERP_RATIO;
      paint();
      raf = requestAnimationFrame(tick);
    }
    function start() { if (raf === null) { raf = requestAnimationFrame(tick); } }
    function setTarget(px: number, py: number) {
      const c = clampPos(px, py);
      targetX = c[0]; targetY = c[1];
      if (reduce) { x = targetX; y = targetY; paint(); return; }
      start();
    }

    let dragging = false;
    function onPointerDown(e: PointerEvent) {
      stopAutoplay(); dragging = true;
      fab!.setPointerCapture(e.pointerId);
    }
    function onPointerMove(e: PointerEvent) {
      if (!dragging) return;
      const r = field!.getBoundingClientRect();
      setTarget(e.clientX - r.left, e.clientY - r.top);
    }
    function onPointerUp() { dragging = false; }
    fab.addEventListener("pointerdown", onPointerDown);
    fab.addEventListener("pointermove", onPointerMove);
    fab.addEventListener("pointerup", onPointerUp);
    const b0 = bounds();
    x = targetX = b0.w / 2; y = targetY = b0.h / 2;
    paint();

    let autoTimer: number | null = null, phase = 0;
    function autoTick() {
      const b = bounds();
      phase += 1;
      const px = b.w / 2 + Math.sin(phase * 0.9) * (b.w / 2 - FAB_R - 6);
      const py = b.h / 2 + Math.cos(phase * 0.6) * (b.h / 2 - FAB_R - 6) * 0.5;
      setTarget(px, py);
    }
    function stopAutoplay() { if (autoTimer !== null) { window.clearInterval(autoTimer); autoTimer = null; } }
    if (!reduce) { autoTimer = window.setInterval(autoTick, 260); autoTick(); }

    return () => {
      stopAutoplay();
      if (raf !== null) cancelAnimationFrame(raf);
      fab.removeEventListener("pointerdown", onPointerDown);
      fab.removeEventListener("pointermove", onPointerMove);
      fab.removeEventListener("pointerup", onPointerUp);
    };
  }, []);

  return (
    <div ref={rootRef} className={styles.stage}>
      <div className={styles.bil}>
        <div className={styles.field} role="application" aria-label="플로팅 버튼 드래그 실험판">
          <button className={styles.fab} type="button" aria-label="플로팅 액션 버튼" style={{ background: color }}>+</button>
        </div>
        <p className={styles.hint}>눌러서 옮기면 값이 뒤따라옵니다</p>
      </div>
    </div>
  );
}
