import { useEffect, useRef } from "react";
import styles from "./ScrollMomentumInertiaCoast.module.scss";

export type ScrollMomentumInertiaCoastProps = {
  color?: string;
};

export default function ScrollMomentumInertiaCoast({
  color = "#4cd4a6",
}: ScrollMomentumInertiaCoastProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const viewport = root.querySelector<HTMLDivElement>(`.${styles.viewport}`);
    const track = root.querySelector<HTMLUListElement>(`.${styles.track}`);
    if (!viewport || !track) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // 계산 겹: 손을 뗀 순간의 속도 값(vel)이 매 프레임 FRICTION 배씩 줄어들며 이동 값(pos)에
    // 더해진다 — vel *= FRICTION; pos += vel. MIN_VELOCITY 밑으로 떨어지면 코스팅을 멈춘다.
    const FRICTION = 0.93;
    const MIN_VELOCITY = 0.04;
    const WHEEL_SCALE = 0.55;

    let pos = 0, vel = 0, raf: number | null = null, maxScroll = 0;

    function measure() {
      maxScroll = Math.max(0, track!.scrollHeight - viewport!.clientHeight);
    }
    function clamp(v: number) { return Math.max(-maxScroll, Math.min(0, v)); }
    function paint() { track!.style.transform = "translateY(" + pos.toFixed(1) + "px)"; }

    function stopCoast() { if (raf !== null) { cancelAnimationFrame(raf); raf = null; } }
    function coastTick() {
      vel *= FRICTION;
      pos = clamp(pos + vel);
      if (pos === 0 || pos === -maxScroll) { vel = 0; }
      paint();
      if (Math.abs(vel) < MIN_VELOCITY) { raf = null; return; }
      raf = requestAnimationFrame(coastTick);
    }
    function startCoast(v: number) {
      vel = v;
      if (reduce) { pos = clamp(pos + vel * 6); vel = 0; paint(); return; }
      stopCoast();
      raf = requestAnimationFrame(coastTick);
    }

    function onWheel(e: WheelEvent) {
      e.preventDefault();
      stopAutoplay();
      stopCoast();
      pos = clamp(pos - e.deltaY * WHEEL_SCALE);
      paint();
      startCoast(-e.deltaY * WHEEL_SCALE * 0.4);
    }

    let dragging = false, startY = 0, startPos = 0, lastY = 0, lastT = 0, dragVel = 0;
    function onPointerDown(e: PointerEvent) {
      stopAutoplay(); stopCoast();
      dragging = true; startY = lastY = e.clientY; startPos = pos; lastT = performance.now(); dragVel = 0;
      viewport!.setPointerCapture(e.pointerId);
    }
    function onPointerMove(e: PointerEvent) {
      if (!dragging) return;
      const t = performance.now();
      const dt = Math.max(1, t - lastT);
      dragVel = (e.clientY - lastY) / dt * 16.6;
      pos = clamp(startPos + (e.clientY - startY));
      paint();
      lastY = e.clientY; lastT = t;
    }
    function onPointerUp() {
      if (!dragging) return;
      dragging = false;
      startCoast(dragVel);
    }

    viewport.addEventListener("wheel", onWheel, { passive: false });
    viewport.addEventListener("pointerdown", onPointerDown);
    viewport.addEventListener("pointermove", onPointerMove);
    viewport.addEventListener("pointerup", onPointerUp);
    measure();
    const onResize = () => measure();
    window.addEventListener("resize", onResize);

    let autoTimer: number | null = null, phase = 0;
    function autoTick() {
      measure();
      if (maxScroll <= 0) return;
      phase += 1;
      const dir = phase % 2 === 0 ? -1 : 1;
      pos = clamp(dir > 0 ? 0 : -maxScroll);
      paint();
      startCoast(dir * -9.5);
    }
    function stopAutoplay() { if (autoTimer !== null) { window.clearInterval(autoTimer); autoTimer = null; } }
    if (!reduce) { autoTimer = window.setInterval(autoTick, 1500); autoTick(); }

    return () => {
      stopAutoplay();
      stopCoast();
      viewport.removeEventListener("wheel", onWheel);
      viewport.removeEventListener("pointerdown", onPointerDown);
      viewport.removeEventListener("pointermove", onPointerMove);
      viewport.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  const rows = Array.from({ length: 10 }, (_, i) => i + 1);

  return (
    <div ref={rootRef} className={styles.stage}>
      <div className={styles.mic}>
        <div className={styles.viewport} role="application" aria-label="관성 스크롤 목록">
          <ul className={styles.track}>
            {rows.map((n) => (
              <li key={n} className={styles.row} style={{ background: color }}>
                항목 {String(n).padStart(2, "0")}
              </li>
            ))}
          </ul>
        </div>
        <p className={styles.hint}>휠이나 드래그로 스크롤한 뒤 놓으면 관성으로 미끄러집니다</p>
      </div>
    </div>
  );
}
