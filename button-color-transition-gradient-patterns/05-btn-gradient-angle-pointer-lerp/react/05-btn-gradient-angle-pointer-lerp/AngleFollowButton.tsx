// AngleFollowButton — vanilla 판(05-btn-gradient-angle-pointer-lerp) 의 React 포트.
// 포인터가 버튼 중심에서 향한 방향을 각도로 바꿔 목표로 삼고, 현재 각도가 일정 비율씩 따라간다.
import { useEffect, useRef } from "react";
import styles from "./AngleFollowButton.module.scss";

type Box<T> = { current: T };
type PointLike = { clientX: number; clientY: number };

const FOLLOW_RATE = 6;
const REST_ANGLE = 135;
const START_MS = 200;
const ORBIT_MS = 1300;
const CYCLE_MS = 2000;
const ORBIT_SPAN = 300;

function wrap(a: number): number {
  return ((a % 360) + 360) % 360;
}

export default function AngleFollowButton() {
  const btnRef = useRef<HTMLButtonElement | null>(null) as Box<HTMLButtonElement | null>;
  const angRef = useRef<HTMLElement | null>(null) as Box<HTMLElement | null>;

  useEffect(() => {
    const btn = btnRef.current;
    const angEl = angRef.current;
    if (!btn || !angEl) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let angle = REST_ANGLE;
    let goalAngle = REST_ANGLE;
    let demo = !reduce;
    let t0: number | null = null;
    let lastTs: number | null = null;
    let raf = 0;

    const fromPoint = (x: number, y: number): number => {
      const r = btn.getBoundingClientRect();
      const dx = x - (r.left + r.width / 2);
      const dy = y - (r.top + r.height / 2);
      return wrap((Math.atan2(dx, -dy) * 180) / Math.PI);
    };
    const paint = (): void => {
      btn.style.setProperty("--ang", angle.toFixed(2));
      angEl.textContent = String(Math.round(wrap(angle)));
    };
    const stopDemo = (): void => { demo = false; };
    const onMove = (e: Event): void => {
      const p = e as unknown as PointLike;
      stopDemo();
      goalAngle = fromPoint(p.clientX, p.clientY);
      if (reduce) { angle = goalAngle; paint(); }
    };
    const onLeave = (): void => {
      goalAngle = REST_ANGLE;
      if (reduce) { angle = goalAngle; paint(); }
    };
    btn.addEventListener("pointermove", onMove);
    btn.addEventListener("pointerleave", onLeave);

    const demoGoal = (now: number): number => {
      if (now < START_MS) return REST_ANGLE;
      const c = (now - START_MS) % CYCLE_MS;
      if (c >= ORBIT_MS) return REST_ANGLE;
      return wrap(60 + (c / ORBIT_MS) * ORBIT_SPAN);
    };

    function tick(ts: number): void {
      if (t0 === null) t0 = ts;
      const now = ts - t0;
      const dt = lastTs === null ? 0.016 : Math.min(0.05, (ts - lastTs) / 1000);
      lastTs = ts;
      const g = demo ? demoGoal(now) : goalAngle;
      const diff = ((g - angle + 540) % 360) - 180;
      angle = wrap(angle + diff * (1 - Math.exp(-dt * FOLLOW_RATE)));
      paint();
      raf = requestAnimationFrame(tick);
    }

    if (reduce) paint();
    else raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      btn.removeEventListener("pointermove", onMove);
      btn.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.bc}>
        <button className={styles.bc__btn} type="button" ref={btnRef}>방향 따라가기</button>
        <p className={styles.bc__meta}><span className={styles.bc__tag}>ANGLE</span> <b ref={angRef}>135</b><span>deg</span></p>
      </div>
    </main>
  );
}
