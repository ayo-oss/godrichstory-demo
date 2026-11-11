import { useEffect, useRef } from "react";
import styles from "./ButtonPhysicsPendulumHangSwing.module.scss";

export type ButtonPhysicsPendulumHangSwingProps = {
  color?: string;
};

export default function ButtonPhysicsPendulumHangSwing({
  color = "#ff9ebb",
}: ButtonPhysicsPendulumHangSwingProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const field = root.querySelector<HTMLDivElement>(`.${styles.field}`);
    const arm = root.querySelector<HTMLDivElement>(`.${styles.arm}`);
    const btn = root.querySelector<HTMLButtonElement>(`.${styles.btn}`);
    if (!field || !arm || !btn) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // 계산 겹: 각가속도 = -(GRAVITY/ARM_LEN)*sin(angle) - DAMPING*avel. 각도(angle)는 도(degree) 단위라
    // sin() 에 넣기 전 라디안으로 바꾸고 결과를 다시 도로 되돌린다(RAD 변환 상수) — 단위를 안 맞추면
    // 복원력이 57배 작아져 흔들림이 멈춘 것처럼 보인다.
    const GRAVITY = 2000, ARM_LEN = 110, DAMPING = 0.42, RAD = 180 / Math.PI;
    let angle = 0, avel = 0, dragging = false, last = 0, running = false, raf: number | null = null;

    function paint() { arm!.style.transform = "rotate(" + angle.toFixed(2) + "deg)"; }
    function tick(now: number) {
      const dt = Math.min((now - last) / 1000, 0.032);
      last = now;
      avel += (-(GRAVITY / ARM_LEN) * Math.sin(angle / RAD) * RAD - DAMPING * avel) * dt;
      angle += avel * dt;
      paint();
      if (Math.abs(angle) < 0.2 && Math.abs(avel) < 0.6) { angle = 0; avel = 0; paint(); running = false; return; }
      raf = requestAnimationFrame(tick);
    }
    function start() { if (!running) { running = true; last = performance.now(); raf = requestAnimationFrame(tick); } }

    function angleFromClientX(clientX: number) {
      const r = field!.getBoundingClientRect();
      const px = clientX - (r.left + r.width / 2);
      const deg = Math.atan2(px, ARM_LEN) * RAD;
      return Math.max(-70, Math.min(70, deg));
    }
    function onPointerDown(e: PointerEvent) {
      stopAutoplay();
      dragging = true;
      if (raf !== null) { cancelAnimationFrame(raf); raf = null; }
      running = false;
      angle = angleFromClientX(e.clientX);
      avel = 0;
      paint();
    }
    function onPointerMove(e: PointerEvent) {
      if (!dragging) return;
      angle = angleFromClientX(e.clientX);
      avel = 0;
      paint();
    }
    function onPointerUp() {
      if (!dragging) return;
      dragging = false;
      if (reduce) { angle = 0; avel = 0; paint(); return; }
      start();
    }
    btn.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    paint();

    let autoTimer: number | null = null;
    function autoTick() { angle = 30; avel = 0; running = false; start(); }
    function stopAutoplay() { if (autoTimer !== null) { window.clearInterval(autoTimer); autoTimer = null; } }
    if (!reduce) { autoTick(); autoTimer = window.setInterval(autoTick, 1700); }

    return () => {
      stopAutoplay();
      if (raf !== null) cancelAnimationFrame(raf);
      btn.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, []);

  return (
    <div ref={rootRef} className={styles.stage}>
      <div className={styles.bph}>
        <div className={styles.field} role="application" aria-label="매달린 버튼 흔들기 실험판" tabIndex={0}>
          <span className={styles.pivot} aria-hidden="true" />
          <div className={styles.arm}>
            <span className={styles.rod} aria-hidden="true" />
            <button className={styles.btn} type="button" aria-label="알림 버튼" style={{ background: color }}>3</button>
          </div>
        </div>
        <p className={styles.hint}>버튼을 옆으로 당겼다 놓으면 스스로 흔들립니다</p>
      </div>
    </div>
  );
}
