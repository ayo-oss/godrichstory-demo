import { useEffect, useRef } from "react";
import styles from "./NumberStepperDragVerticalInertia.module.scss";

export type NumberStepperDragVerticalInertiaProps = {
  color?: string;
};

export default function NumberStepperDragVerticalInertia({
  color = "#0a4fe8",
}: NumberStepperDragVerticalInertiaProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const handle = root.querySelector<HTMLSpanElement>(`.${styles.handle}`);
    const valueEl = root.querySelector<HTMLSpanElement>(`.${styles.value}`);
    if (!handle || !valueEl) return;

    const MIN = -10, MAX = 40, STEP_PX = 20, MAX_OFFSET = 34;
    let value = 20;
    let dragging = false;
    let startY = 0, startValue = 0, lastY = 0, lastT = 0, vel = 0;
    let inertiaRaf: number | null = null;

    function render() { valueEl!.innerHTML = value + "<small>°C</small>"; }
    function setHandle(px: number) {
      const c = Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, px));
      handle!.style.transform = "translateY(" + c.toFixed(1) + "px)";
    }

    function beginDrag(y: number) {
      if (inertiaRaf) { cancelAnimationFrame(inertiaRaf); inertiaRaf = null; }
      dragging = true;
      startY = y; startValue = value; lastY = y; lastT = performance.now(); vel = 0;
      handle!.classList.add(styles.handleActive);
    }
    function moveDrag(y: number) {
      const now = performance.now();
      const dtMove = Math.max(1, now - lastT);
      vel = (y - lastY) / dtMove;
      lastY = y; lastT = now;
      const dy = y - startY;
      value = Math.max(MIN, Math.min(MAX, startValue - Math.round(dy / STEP_PX)));
      render();
      setHandle(dy);
    }

    // 계산 겹: 놓는 순간의 속도(px/ms)에 지수 마찰(FRICTION)을 매 프레임 곱해 감쇠시키고,
    // 감쇠 중 이동한 가상 거리(virtual)를 20px 단위로 값에 계속 반영한다 — 손을 놓아도 몇 단계 더 이어진다.
    const FRICTION = 6.2;
    function endDrag() {
      dragging = false;
      handle!.classList.remove(styles.handleActive);
      const baseValue = value;
      let virtual = 0;
      let v = vel;
      let last = performance.now();
      function frame(now: number) {
        const dt = now - last; last = now;
        v *= Math.exp(-FRICTION * dt / 1000);
        virtual += v * dt;
        value = Math.max(MIN, Math.min(MAX, baseValue - Math.round(virtual / STEP_PX)));
        render();
        setHandle(virtual);
        if (Math.abs(v) > 0.02) {
          inertiaRaf = requestAnimationFrame(frame);
        } else {
          setHandle(0);
          inertiaRaf = null;
        }
      }
      inertiaRaf = requestAnimationFrame(frame);
    }

    const onDown = (e: PointerEvent) => {
      root!.classList.remove(styles.isDemo);
      stopAutoplay();
      e.preventDefault();
      handle!.setPointerCapture(e.pointerId);
      beginDrag(e.clientY);
    };
    const onMove = (e: PointerEvent) => { if (dragging) { moveDrag(e.clientY); } };
    const onUp = () => { if (dragging) { endDrag(); } };
    handle.addEventListener("pointerdown", onDown);
    handle.addEventListener("pointermove", onMove);
    handle.addEventListener("pointerup", onUp);
    handle.addEventListener("pointercancel", onUp);

    let autoplayTimer: ReturnType<typeof setInterval> | null = null;
    function autoplayFling(vpx: number) {
      vel = vpx;
      value = 20;
      render();
      endDrag();
    }
    function stopAutoplay() {
      if (autoplayTimer) { clearInterval(autoplayTimer); autoplayTimer = null; }
    }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) {
      autoplayFling(-0.85);
      autoplayTimer = setInterval(() => {
        autoplayFling(Math.random() > 0.5 ? -0.85 : 0.85);
      }, 1900);
    }
    render();

    return () => {
      stopAutoplay();
      if (inertiaRaf) cancelAnimationFrame(inertiaRaf);
      handle!.removeEventListener("pointerdown", onDown);
      handle!.removeEventListener("pointermove", onMove);
      handle!.removeEventListener("pointerup", onUp);
      handle!.removeEventListener("pointercancel", onUp);
    };
  }, []);

  return (
    <div ref={rootRef} className={`${styles.stage} ${styles.isDemo}`} style={{ ["--color" as string]: color }}>
      <div className={styles.panel}>
        <span className={styles.label}>체감 온도</span>
        <div className={styles.body}>
          <div className={styles.track}>
            <span className={styles.handle} />
          </div>
          <span className={styles.value}>20<small>°C</small></span>
        </div>
        <span className={styles.hint}>위아래로 끌면 놓은 뒤에도 관성으로 이어집니다</span>
      </div>
    </div>
  );
}
