import { useEffect, useRef } from "react";
import styles from "./ButtonPhysicsSpringOvershoot.module.scss";

export type ButtonPhysicsSpringOvershootProps = {
  color?: string;
};

export default function ButtonPhysicsSpringOvershoot({
  color = "#0a4fe8",
}: ButtonPhysicsSpringOvershootProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const btn = root.querySelector<HTMLButtonElement>(`.${styles.btn}`);
    const val = root.querySelector<HTMLElement>(`.${styles.valNum}`);
    if (!btn || !val) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // 계산 겹: 스프링-감쇠 방정식 accel = -(K/MASS)*(depth-target) - (C/MASS)*vel.
    // 목표 값을 지나쳤다가 되돌아오는 오버슈트는 감쇠비(zeta = C/(2*sqrt(K*MASS)))가
    // 1보다 작은 저감쇠(underdamped) 상태라 생긴다 — zeta 를 낮출수록 반동 폭이 커진다.
    const K = 300, C = 7, MASS = 1, PRESS_DEPTH = 14;
    let depth = 0, vel = 0, target = 0, last = 0, raf: number | null = null;

    function paint() {
      const scale = 1 - depth / 340;
      btn!.style.transform = "translateY(" + depth.toFixed(2) + "px) scale(" + scale.toFixed(4) + ")";
      val!.textContent = depth.toFixed(1) + "px";
    }
    function tick(now: number) {
      const dt = Math.min((now - last) / 1000, 0.032);
      last = now;
      const accel = (-K * (depth - target) - C * vel) / MASS;
      vel += accel * dt;
      depth += vel * dt;
      paint();
      raf = requestAnimationFrame(tick);
    }
    function start() { if (raf === null) { last = performance.now(); raf = requestAnimationFrame(tick); } }
    function press(p: number) {
      if (reduce) { depth = p; vel = 0; target = p; paint(); return; }
      target = p;
      start();
    }

    function onPointerDown() { stopAutoplay(); press(PRESS_DEPTH); }
    function onPointerUp() { press(0); }
    btn.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointerup", onPointerUp);
    btn.addEventListener("pointercancel", onPointerUp);
    paint();

    let autoTimer: number | null = null, autoDown: number | null = null;
    function autoTick() { press(PRESS_DEPTH); autoDown = window.setTimeout(() => { press(0); }, 350); }
    function stopAutoplay() {
      if (autoTimer !== null) { window.clearInterval(autoTimer); autoTimer = null; }
      if (autoDown !== null) { window.clearTimeout(autoDown); autoDown = null; }
    }
    if (!reduce) { autoTick(); autoTimer = window.setInterval(autoTick, 1500); }

    return () => {
      stopAutoplay();
      if (raf !== null) cancelAnimationFrame(raf);
      btn.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerup", onPointerUp);
      btn.removeEventListener("pointercancel", onPointerUp);
    };
  }, []);

  return (
    <div ref={rootRef} className={styles.stage}>
      <div className={styles.bso}>
        <button className={styles.btn} type="button" style={{ background: color }}>제출하기</button>
        <p className={styles.val}><span className={styles.valLabel}>깊이 값</span><b className={styles.valNum}>0.0px</b></p>
      </div>
    </div>
  );
}
