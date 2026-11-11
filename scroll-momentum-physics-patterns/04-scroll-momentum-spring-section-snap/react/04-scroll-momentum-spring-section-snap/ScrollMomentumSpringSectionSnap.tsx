import { useEffect, useRef } from "react";
import styles from "./ScrollMomentumSpringSectionSnap.module.scss";

export type ScrollMomentumSpringSectionSnapProps = {
  color?: string;
};

export default function ScrollMomentumSpringSectionSnap({
  color = "#4cd4a6",
}: ScrollMomentumSpringSectionSnapProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const viewport = root.querySelector<HTMLDivElement>(`.${styles.viewport}`);
    const track = root.querySelector<HTMLDivElement>(`.${styles.track}`);
    if (!viewport || !track) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // 계산 겹: 놓인 위치 값(pos)이 가장 가까운 구간 값(target = round(pos/SECTION_H)*SECTION_H)을
    // 향해 스프링 방정식(SPRING_K·SPRING_C)으로 매 프레임 가속도를 쌓아 다가간다 — 목표를 살짝
    // 지나쳤다 되돌아오길 반복하며 잦아든다(과소감쇠 스프링).
    const SECTION_H = 150;
    const SECTION_COUNT = 3;
    const SPRING_K = 150;
    const SPRING_C = 7.5;

    let pos = 0, vel = 0, raf: number | null = null;
    const maxScroll = SECTION_H * (SECTION_COUNT - 1);

    function clampFree(v: number) { return Math.max(-maxScroll, Math.min(0, v)); }
    function paint() { track!.style.transform = "translateY(" + pos.toFixed(1) + "px)"; }
    function stopSpring() { if (raf !== null) { cancelAnimationFrame(raf); raf = null; } }
    function nearestTarget() { return clampFree(Math.round(pos / SECTION_H) * SECTION_H); }

    function springTick(target: number) {
      const force = -SPRING_K * (pos - target) - SPRING_C * vel;
      vel += force * (1 / 60) * 0.06;
      pos += vel;
      paint();
      if (Math.abs(pos - target) < 0.4 && Math.abs(vel) < 0.4) {
        pos = target; vel = 0; paint(); raf = null; return;
      }
      raf = requestAnimationFrame(() => springTick(target));
    }
    function snap() {
      const target = nearestTarget();
      if (reduce) { pos = target; vel = 0; paint(); return; }
      stopSpring();
      raf = requestAnimationFrame(() => springTick(target));
    }

    let wheelTimer: number | null = null;
    let dragging = false, startY = 0, startPos = 0;
    function onPointerDown(e: PointerEvent) {
      stopAutoplay(); stopSpring();
      dragging = true; startY = e.clientY; startPos = pos; vel = 0;
      viewport!.setPointerCapture(e.pointerId);
    }
    function onPointerMove(e: PointerEvent) {
      if (!dragging) return;
      pos = clampFree(startPos + (e.clientY - startY));
      paint();
    }
    function onPointerUp() {
      if (!dragging) return;
      dragging = false;
      snap();
    }
    function onWheel(e: WheelEvent) {
      e.preventDefault();
      stopAutoplay(); stopSpring();
      pos = clampFree(pos - e.deltaY * 0.5);
      paint();
      if (wheelTimer !== null) window.clearTimeout(wheelTimer);
      wheelTimer = window.setTimeout(snap, 140);
    }

    viewport.addEventListener("pointerdown", onPointerDown);
    viewport.addEventListener("pointermove", onPointerMove);
    viewport.addEventListener("pointerup", onPointerUp);
    viewport.addEventListener("wheel", onWheel, { passive: false });
    paint();

    let autoTimer: number | null = null, section = 0;
    function autoTick() {
      section = (section + 1) % SECTION_COUNT;
      pos = clampFree(-section * SECTION_H + 26);
      paint();
      snap();
    }
    function stopAutoplay() {
      if (autoTimer !== null) { window.clearInterval(autoTimer); autoTimer = null; }
      if (wheelTimer !== null) { window.clearTimeout(wheelTimer); wheelTimer = null; }
    }
    if (!reduce) { autoTimer = window.setInterval(autoTick, 1300); autoTick(); }

    return () => {
      stopAutoplay();
      stopSpring();
      viewport.removeEventListener("pointerdown", onPointerDown);
      viewport.removeEventListener("pointermove", onPointerMove);
      viewport.removeEventListener("pointerup", onPointerUp);
      viewport.removeEventListener("wheel", onWheel);
    };
  }, []);

  return (
    <div ref={rootRef} className={styles.stage}>
      <div className={styles.sss}>
        <div className={styles.viewport} role="application" aria-label="구간 스냅 스크롤판">
          <div className={styles.track}>
            <section className={`${styles.panel} ${styles.panel1}`} style={{ background: color }}>구간 1</section>
            <section className={`${styles.panel} ${styles.panel2}`}>구간 2</section>
            <section className={`${styles.panel} ${styles.panel3}`}>구간 3</section>
          </div>
        </div>
        <p className={styles.hint}>드래그로 스크롤한 뒤 놓으면 가까운 구간 값으로 스프링 정착합니다</p>
      </div>
    </div>
  );
}
