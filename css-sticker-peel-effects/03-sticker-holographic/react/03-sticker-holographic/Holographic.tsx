// Holographic — vanilla 판(run/378/demo/03-sticker-holographic/index.html) 의 React 포트.
// 포인터 이동 속도(px/ms)가 색상 회전 속도(--hue-deg)와 빛 이동 속도(--sweep-pos)를 직접 정하고,
// 이동 방향(atan2)이 스윕 각도(--sweep-angle)를 정한다 — 계산 겹은 applyMove(x, y, now) 에 있다.
import { useEffect, useRef } from "react";
import styles from "./Holographic.module.scss";

type Box<T> = { current: T };

const HOLO_SWEEP_ANGLE_RANGE = 45; // 변형: 90deg
const HUE_SPEED = 220;
const SWEEP_SPEED = 340;
const LERP_RATE = 0.2;
const ORBIT_MS = 1900;

export default function Holographic() {
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const cardRef = useRef(null) as unknown as Box<HTMLButtonElement>;
  const sheenRef = useRef(null) as unknown as Box<HTMLSpanElement>;
  const rafRef = useRef(0) as unknown as Box<number>;

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const wrap = rootRef.current;
    const card = cardRef.current;
    const sheen = sheenRef.current;
    if (!wrap || !card || !sheen) return;

    let isDemo = true;
    let hue = 0, sweepPos = 0, sweepAngleTarget = 115;
    let shownAngle = 115;
    let lastX: number | null = null, lastY = 0, lastTime = 0;

    function applyMove(x: number, y: number, now: number) {
      if (lastX !== null) {
        const dt = Math.max(now - lastTime, 1);
        const dx = x - lastX, dy = y - lastY;
        const speed = Math.hypot(dx, dy) / dt;
        hue = (hue + speed * HUE_SPEED * (dt / 1000)) % 360;
        sweepPos = (sweepPos + speed * SWEEP_SPEED * (dt / 1000)) % 200;
        sweepAngleTarget = 90 + (Math.atan2(dy, dx) * 180 / Math.PI) % HOLO_SWEEP_ANGLE_RANGE;
      }
      lastX = x; lastY = y; lastTime = now;
    }

    function human() { if (isDemo) { wrap!.classList.remove(styles.isDemo); isDemo = false; } }
    function onMove(e: PointerEvent) { human(); applyMove(e.clientX, e.clientY, performance.now()); }
    function onLeave() { human(); lastX = null; }
    card.addEventListener("pointermove", onMove);
    card.addEventListener("pointerleave", onLeave);

    function autoAdvance(ts: number) {
      const t = (ts % ORBIT_MS) / ORBIT_MS;
      const angle = t * Math.PI * 2;
      const r = card!.getBoundingClientRect();
      const px = r.left + r.width / 2 + Math.cos(angle) * (r.width * 0.38);
      const py = r.top + r.height / 2 + Math.sin(angle) * (r.height * 0.38);
      applyMove(px, py, ts);
    }

    function loop(ts: number) {
      if (isDemo && !reduce) autoAdvance(ts);
      if (reduce) { shownAngle = sweepAngleTarget; }
      else { shownAngle += (sweepAngleTarget - shownAngle) * LERP_RATE; }
      card!.style.setProperty("--hue-deg", (reduce ? 0 : hue).toFixed(1) + "deg");
      card!.style.setProperty("--sweep-pos", (reduce ? 0 : sweepPos).toFixed(1) + "%");
      sheen!.style.setProperty("--sweep-angle", shownAngle.toFixed(1) + "deg");
      rafRef.current = requestAnimationFrame(loop);
    }
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      card!.removeEventListener("pointermove", onMove);
      card!.removeEventListener("pointerleave", onLeave);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.wrap + " " + styles.isDemo} ref={rootRef}>
        <button className={styles.card} ref={cardRef} type="button" aria-label="홀로그램 스티커, 커서를 움직이면 표면 위 무지개빛이 방향과 속도를 따라간다">
          <span className={styles.cardMark} aria-hidden="true"></span>
          <span className={styles.sheen} ref={sheenRef} aria-hidden="true"></span>
        </button>
      </div>
    </main>
  );
}
