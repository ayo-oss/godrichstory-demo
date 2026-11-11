import { useEffect, useRef } from "react";
import styles from "./ButtonPhysicsGravityDropSettle.module.scss";

export type ButtonPhysicsGravityDropSettleProps = {
  color?: string;
};

export default function ButtonPhysicsGravityDropSettle({
  color = "#ff4d1f",
}: ButtonPhysicsGravityDropSettleProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const field = root.querySelector<HTMLDivElement>(`.${styles.field}`);
    const chip = root.querySelector<HTMLButtonElement>(`.${styles.chip}`);
    const dropBtn = root.querySelector<HTMLButtonElement>(`.${styles.drop}`);
    if (!field || !chip || !dropBtn) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // 계산 겹: vel += GRAVITY*dt, y += vel*dt 로 낙하시키다 바닥 값(FLOOR)에 닿으면
    // vel 을 -RESTITUTION 배로 뒤집어 반동시킨다. |반동 속도| 가 STOP_VEL 아래로 줄면 정착.
    const GRAVITY = 2200, RESTITUTION = 0.52, STOP_VEL = 40, CHIP_H = 34;
    let y = 0, vel = 0, last = 0, raf: number | null = null, running = false;

    function floorY() { return field!.clientHeight - CHIP_H; }
    function paint() { chip!.style.transform = "translateY(" + y.toFixed(1) + "px)"; }
    function tick(now: number) {
      const dt = Math.min((now - last) / 1000, 0.032);
      last = now;
      vel += GRAVITY * dt;
      y += vel * dt;
      const floor = floorY();
      if (y >= floor) {
        y = floor;
        vel = -vel * RESTITUTION;
        if (Math.abs(vel) < STOP_VEL) { vel = 0; paint(); running = false; return; }
      }
      paint();
      raf = requestAnimationFrame(tick);
    }
    function drop() {
      if (reduce) { y = floorY(); vel = 0; paint(); return; }
      y = 0; vel = 0; last = performance.now();
      if (!running) { running = true; raf = requestAnimationFrame(tick); }
    }

    function onDropClick() { stopAutoplay(); drop(); }
    function onChipClick() { stopAutoplay(); drop(); }
    dropBtn.addEventListener("click", onDropClick);
    chip.addEventListener("click", onChipClick);
    y = floorY(); paint();

    let autoTimer: number | null = null;
    function stopAutoplay() { if (autoTimer !== null) { window.clearInterval(autoTimer); autoTimer = null; } }
    if (!reduce) { drop(); autoTimer = window.setInterval(drop, 1600); }

    return () => {
      stopAutoplay();
      if (raf !== null) cancelAnimationFrame(raf);
      dropBtn.removeEventListener("click", onDropClick);
      chip.removeEventListener("click", onChipClick);
    };
  }, []);

  return (
    <div ref={rootRef} className={styles.stage}>
      <div className={styles.bgd}>
        <div className={styles.field}>
          <button className={styles.chip} type="button" style={{ background: color }}>알림 3</button>
          <span className={styles.floor} aria-hidden="true" />
        </div>
        <button className={styles.drop} type="button">다시 떨어뜨리기</button>
      </div>
    </div>
  );
}
