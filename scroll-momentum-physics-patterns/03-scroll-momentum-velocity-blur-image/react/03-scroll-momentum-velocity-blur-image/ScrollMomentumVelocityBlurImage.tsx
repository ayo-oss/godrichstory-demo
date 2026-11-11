import { useEffect, useRef } from "react";
import styles from "./ScrollMomentumVelocityBlurImage.module.scss";

export type ScrollMomentumVelocityBlurImageProps = {
  color?: string;
};

export default function ScrollMomentumVelocityBlurImage({
  color = "#2f6df6",
}: ScrollMomentumVelocityBlurImageProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const viewport = root.querySelector<HTMLDivElement>(`.${styles.viewport}`);
    const track = root.querySelector<HTMLDivElement>(`.${styles.track}`);
    if (!viewport || !track) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // 계산 겹: 매 프레임의 이동 값 변화율(velocity)을 재서 흐림 목표 값(targetBlur = |velocity| *
    // VELOCITY_TO_BLUR, MAX_BLUR 상한)을 만들고, 실제 표시 흐림(blur)은 BLUR_SMOOTH 비율로 그 목표를
    // 뒤따른다 — 속도가 줄면 흐림도 뒤따라 0 으로 잦아든다. 코스팅 자체는 COAST_FRICTION 으로 감쇠.
    const VELOCITY_TO_BLUR = 0.55;
    const MAX_BLUR = 9;
    const BLUR_SMOOTH = 0.25;
    const COAST_FRICTION = 0.92;
    const MIN_VELOCITY = 0.05;

    let pos = 0, vel = 0, blur = 0, maxScroll = 0, raf: number | null = null;

    function measure() { maxScroll = Math.max(0, track!.scrollWidth - viewport!.clientWidth); }
    function clamp(v: number) { return Math.max(-maxScroll, Math.min(0, v)); }
    function paint() {
      track!.style.transform = "translateX(" + pos.toFixed(1) + "px)";
      track!.style.filter = blur > 0.05 ? "blur(" + blur.toFixed(2) + "px)" : "none";
    }
    function stopLoop() { if (raf !== null) { cancelAnimationFrame(raf); raf = null; } }
    function loopTick() {
      vel *= COAST_FRICTION;
      pos = clamp(pos + vel);
      if (pos === 0 || pos === -maxScroll) { vel = 0; }
      const target = Math.min(MAX_BLUR, Math.abs(vel) * VELOCITY_TO_BLUR);
      blur += (target - blur) * BLUR_SMOOTH;
      paint();
      if (Math.abs(vel) < MIN_VELOCITY && blur < 0.05) { blur = 0; paint(); raf = null; return; }
      raf = requestAnimationFrame(loopTick);
    }
    function startLoop(v: number) {
      vel = v;
      if (reduce) { pos = clamp(pos + vel * 6); vel = 0; blur = 0; paint(); return; }
      stopLoop();
      raf = requestAnimationFrame(loopTick);
    }

    function onWheel(e: WheelEvent) {
      e.preventDefault();
      stopAutoplay();
      stopLoop();
      const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      pos = clamp(pos - d * 0.6);
      paint();
      startLoop(-d * 0.6);
    }

    let dragging = false, startX = 0, startPos = 0, lastX = 0, lastT = 0, dragVel = 0;
    function onPointerDown(e: PointerEvent) {
      stopAutoplay(); stopLoop();
      dragging = true; startX = lastX = e.clientX; startPos = pos; lastT = performance.now(); dragVel = 0;
      viewport!.setPointerCapture(e.pointerId);
    }
    function onPointerMove(e: PointerEvent) {
      if (!dragging) return;
      const t = performance.now();
      const dt = Math.max(1, t - lastT);
      dragVel = (e.clientX - lastX) / dt * 16.6;
      pos = clamp(startPos + (e.clientX - startX));
      const target = Math.min(MAX_BLUR, Math.abs(dragVel) * VELOCITY_TO_BLUR);
      blur += (target - blur) * BLUR_SMOOTH;
      paint();
      lastX = e.clientX; lastT = t;
    }
    function onPointerUp() {
      if (!dragging) return;
      dragging = false;
      startLoop(dragVel);
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
      startLoop(dir * -13);
    }
    function stopAutoplay() { if (autoTimer !== null) { window.clearInterval(autoTimer); autoTimer = null; } }
    if (!reduce) { autoTimer = window.setInterval(autoTick, 1500); autoTick(); }

    return () => {
      stopAutoplay();
      stopLoop();
      viewport.removeEventListener("wheel", onWheel);
      viewport.removeEventListener("pointerdown", onPointerDown);
      viewport.removeEventListener("pointermove", onPointerMove);
      viewport.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <div ref={rootRef} className={styles.stage}>
      <div className={styles.vbi}>
        <div className={styles.viewport} role="application" aria-label="속도 흐림 갤러리">
          <div className={styles.track}>
            <div className={`${styles.card} ${styles.cardA}`} style={{ background: `linear-gradient(135deg, ${color}, #b9a0ff)` }} />
            <div className={`${styles.card} ${styles.cardB}`} />
            <div className={`${styles.card} ${styles.cardC}`} />
            <div className={`${styles.card} ${styles.cardA}`} style={{ background: `linear-gradient(135deg, ${color}, #b9a0ff)` }} />
          </div>
        </div>
        <p className={styles.hint}>가로로 빠르게 스크롤할수록 흐려지고 멈추면 다시 선명해집니다</p>
      </div>
    </div>
  );
}
