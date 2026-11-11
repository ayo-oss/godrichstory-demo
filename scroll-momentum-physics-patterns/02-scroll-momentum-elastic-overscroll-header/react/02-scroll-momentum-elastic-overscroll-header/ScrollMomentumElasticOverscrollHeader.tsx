import { useEffect, useRef } from "react";
import styles from "./ScrollMomentumElasticOverscrollHeader.module.scss";

export type ScrollMomentumElasticOverscrollHeaderProps = {
  color?: string;
};

export default function ScrollMomentumElasticOverscrollHeader({
  color = "#b9a0ff",
}: ScrollMomentumElasticOverscrollHeaderProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const frame = root.querySelector<HTMLDivElement>(`.${styles.frame}`);
    const header = root.querySelector<HTMLDivElement>(`.${styles.header}`);
    const body = root.querySelector<HTMLDivElement>(`.${styles.body}`);
    if (!frame || !header || !body) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // 계산 겹: 당긴 거리(dist)는 제곱근으로 저항을 걸어 늘어난 값(stretch)을 만든다(고무줄 저항).
    // 손을 놓으면 stretch 를 목표 1 로 스프링 적분(SPRING_K·SPRING_C)해 되돌린다.
    const PULL_RESIST = 9;
    const MAX_STRETCH = 1.85;
    const SPRING_K = 210;
    const SPRING_C = 15;
    const HEADER_H = 56;

    let stretch = 1, sVel = 0, raf: number | null = null;

    function paint() {
      header!.style.transform = "scaleY(" + stretch.toFixed(3) + ")";
      const extra = HEADER_H * (stretch - 1);
      body!.style.transform = "translateY(" + extra.toFixed(1) + "px)";
    }
    function stopSpring() { if (raf !== null) { cancelAnimationFrame(raf); raf = null; } }
    function springTick() {
      const force = -SPRING_K * (stretch - 1) - SPRING_C * sVel;
      sVel += force * (1 / 60) * 0.06;
      stretch += sVel;
      paint();
      if (Math.abs(stretch - 1) < 0.003 && Math.abs(sVel) < 0.003) {
        stretch = 1; sVel = 0; paint(); raf = null; return;
      }
      raf = requestAnimationFrame(springTick);
    }
    function release() {
      if (reduce) { stretch = 1; sVel = 0; paint(); return; }
      stopSpring();
      raf = requestAnimationFrame(springTick);
    }
    function pullTo(dist: number) {
      const d = Math.max(0, dist);
      stretch = Math.min(MAX_STRETCH, 1 + Math.sqrt(d) / PULL_RESIST);
      paint();
    }

    let dragging = false, startY = 0;
    function onPointerDown(e: PointerEvent) {
      stopAutoplay(); stopSpring();
      dragging = true; startY = e.clientY; sVel = 0;
      frame!.setPointerCapture(e.pointerId);
    }
    function onPointerMove(e: PointerEvent) {
      if (!dragging) return;
      pullTo(e.clientY - startY);
    }
    function onPointerUp() {
      if (!dragging) return;
      dragging = false;
      release();
    }
    function onWheel(e: WheelEvent) {
      if (e.deltaY >= 0) return;
      e.preventDefault();
      stopAutoplay(); stopSpring();
      pullTo((stretch - 1) * PULL_RESIST * PULL_RESIST + -e.deltaY * 1.4);
      release();
    }

    frame.addEventListener("pointerdown", onPointerDown);
    frame.addEventListener("pointermove", onPointerMove);
    frame.addEventListener("pointerup", onPointerUp);
    frame.addEventListener("wheel", onWheel, { passive: false });
    paint();

    let autoTimer: number | null = null, phase = 0;
    let releaseTimeout: number | null = null;
    function autoTick() {
      phase += 1;
      const d = 58 + Math.sin(phase * 1.1) * 20;
      pullTo(d);
      releaseTimeout = window.setTimeout(() => { release(); }, 260);
    }
    function stopAutoplay() {
      if (autoTimer !== null) { window.clearInterval(autoTimer); autoTimer = null; }
      if (releaseTimeout !== null) { window.clearTimeout(releaseTimeout); releaseTimeout = null; }
    }
    if (!reduce) { autoTimer = window.setInterval(autoTick, 900); autoTick(); }

    return () => {
      stopAutoplay();
      stopSpring();
      frame.removeEventListener("pointerdown", onPointerDown);
      frame.removeEventListener("pointermove", onPointerMove);
      frame.removeEventListener("pointerup", onPointerUp);
      frame.removeEventListener("wheel", onWheel);
    };
  }, []);

  return (
    <div ref={rootRef} className={styles.stage}>
      <div className={styles.eoh}>
        <div className={styles.frame} role="application" aria-label="오버스크롤 헤더 실험판">
          <div className={styles.header} style={{ background: color }}>헤더</div>
          <div className={styles.body}>
            <div className={styles.row}>알림 01</div>
            <div className={styles.row}>알림 02</div>
            <div className={styles.row}>알림 03</div>
          </div>
        </div>
        <p className={styles.hint}>위에서 아래로 당겼다 놓으면 헤더가 늘어났다 되돌아옵니다</p>
      </div>
    </div>
  );
}
