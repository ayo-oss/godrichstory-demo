import { useEffect, useRef } from "react";
import styles from "./ButtonPhysicsFlickThrowDecay.module.scss";

export type ButtonPhysicsFlickThrowDecayProps = {
  color?: string;
};

type Sample = { t: number; x: number; y: number };

export default function ButtonPhysicsFlickThrowDecay({
  color = "#b9a0ff",
}: ButtonPhysicsFlickThrowDecayProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const field = root.querySelector<HTMLDivElement>(`.${styles.field}`);
    const chip = root.querySelector<HTMLButtonElement>(`.${styles.chip}`);
    if (!field || !chip) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // 계산 겹: 놓는 순간의 속도 값(vx, vy, px/s)을 물려받아 매 프레임 위치에 더하고,
    // 그 속도 값 자체를 FRICTION 비율만큼 지수적으로 줄인다 — vel *= FRICTION**dt.
    // 벽(WALL)에 닿으면 그 축의 속도만 0으로 죽여 멈춘 자리에서 정지한다.
    const FRICTION = 0.05, STOP_VEL = 6, CHIP_R = 24;
    let x = 100, y = 60, vx = 0, vy = 0, last = 0, raf: number | null = null;
    let dragging = false, samples: Sample[] = [];

    function bounds() { return { w: field!.clientWidth, h: field!.clientHeight }; }
    function paint() { chip!.style.transform = "translate(" + (x - CHIP_R).toFixed(1) + "px," + (y - CHIP_R).toFixed(1) + "px)"; }
    function tick(now: number) {
      const dt = Math.min((now - last) / 1000, 0.032);
      last = now;
      const decay = Math.pow(FRICTION, dt);
      vx *= decay; vy *= decay;
      x += vx * dt; y += vy * dt;
      const b = bounds();
      if (x < CHIP_R) { x = CHIP_R; vx = 0; }
      if (x > b.w - CHIP_R) { x = b.w - CHIP_R; vx = 0; }
      if (y < CHIP_R) { y = CHIP_R; vy = 0; }
      if (y > b.h - CHIP_R) { y = b.h - CHIP_R; vy = 0; }
      paint();
      if (Math.abs(vx) < STOP_VEL && Math.abs(vy) < STOP_VEL) { vx = 0; vy = 0; raf = null; return; }
      raf = requestAnimationFrame(tick);
    }
    function start() { if (raf === null) { last = performance.now(); raf = requestAnimationFrame(tick); } }
    function throwWith(nvx: number, nvy: number) {
      vx = nvx; vy = nvy;
      if (reduce) { vx = 0; vy = 0; return; }
      start();
    }

    function onPointerDown(e: PointerEvent) {
      stopAutoplay();
      dragging = true; samples = [{ t: performance.now(), x: e.clientX, y: e.clientY }];
      if (raf !== null) { cancelAnimationFrame(raf); raf = null; }
    }
    function onPointerMove(e: PointerEvent) {
      if (!dragging) return;
      const r = field!.getBoundingClientRect();
      const b = bounds();
      x = Math.max(CHIP_R, Math.min(b.w - CHIP_R, e.clientX - r.left));
      y = Math.max(CHIP_R, Math.min(b.h - CHIP_R, e.clientY - r.top));
      paint();
      samples.push({ t: performance.now(), x: e.clientX, y: e.clientY });
      if (samples.length > 6) { samples.shift(); }
    }
    function onPointerUp() {
      if (!dragging) return;
      dragging = false;
      if (samples.length >= 2) {
        const a = samples[0], b2 = samples[samples.length - 1];
        const dt = Math.max(1, b2.t - a.t) / 1000;
        throwWith((b2.x - a.x) / dt, (b2.y - a.y) / dt);
      }
    }
    chip.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    paint();

    let autoTimer: number | null = null;
    function autoTick() {
      x = 30; y = 30;
      throwWith(420, 260);
    }
    function stopAutoplay() { if (autoTimer !== null) { window.clearInterval(autoTimer); autoTimer = null; } }
    if (!reduce) { autoTick(); autoTimer = window.setInterval(autoTick, 1700); }

    return () => {
      stopAutoplay();
      if (raf !== null) cancelAnimationFrame(raf);
      chip.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, []);

  return (
    <div ref={rootRef} className={styles.stage}>
      <div className={styles.bft}>
        <div className={styles.field}>
          <button className={styles.chip} type="button" aria-label="플로팅 버튼" style={{ background: color }}>↗</button>
        </div>
        <p className={styles.hint}>가볍게 튕겨 던지면 속도 값이 줄어들며 멈춥니다</p>
      </div>
    </div>
  );
}
