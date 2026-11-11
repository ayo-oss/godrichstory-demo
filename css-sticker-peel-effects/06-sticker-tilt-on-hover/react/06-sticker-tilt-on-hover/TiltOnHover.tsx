// TiltOnHover — vanilla 판(run/378/demo/06-sticker-tilt-on-hover/index.html) 의 React 포트.
// 포인터 좌표를 카드 중심 기준 -1..1 로 정규화한 값에 MAX_TILT 를 곱해 rotateX/rotateY 를 얻는다
// (applyFromPoint) — 같은 정규화 값으로 광택 위치도 함께 옮긴다.
import { useEffect, useRef } from "react";
import styles from "./TiltOnHover.module.scss";

type Box<T> = { current: T };

const MAX_TILT = 14;
const GLARE_RANGE = 60;
const LERP_RATE = 0.18;
const ORBIT_MS = 2200;

export default function TiltOnHover() {
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const zoneRef = useRef(null) as unknown as Box<HTMLButtonElement>;
  const cardRef = useRef(null) as unknown as Box<HTMLSpanElement>;
  const glareRef = useRef(null) as unknown as Box<HTMLSpanElement>;
  const rafRef = useRef(0) as unknown as Box<number>;

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const wrap = rootRef.current;
    const zone = zoneRef.current;
    const card = cardRef.current;
    const glare = glareRef.current;
    if (!wrap || !zone || !card || !glare) return;

    let isDemo = true;
    let targetRX = 0, targetRY = 0, targetGX = 50, targetGY = 50;
    let shownRX = 0, shownRY = 0, shownGX = 50, shownGY = 50;

    function human() { if (isDemo) { wrap!.classList.remove(styles.isDemo); isDemo = false; } }

    function applyFromPoint(px: number, py: number) {
      const rect = zone!.getBoundingClientRect();
      let nx = ((px - rect.left) / rect.width) * 2 - 1;
      let ny = ((py - rect.top) / rect.height) * 2 - 1;
      nx = Math.max(-1, Math.min(1, nx));
      ny = Math.max(-1, Math.min(1, ny));
      targetRY = nx * MAX_TILT;
      targetRX = -ny * MAX_TILT;
      targetGX = 50 + nx * GLARE_RANGE;
      targetGY = 50 + ny * GLARE_RANGE;
    }
    function reset() { targetRX = 0; targetRY = 0; targetGX = 50; targetGY = 50; }

    function onMove(e: PointerEvent) { human(); applyFromPoint(e.clientX, e.clientY); }
    function onLeave() { human(); reset(); }
    function onFocus() { human(); targetRY = MAX_TILT * 0.5; targetRX = -MAX_TILT * 0.3; }
    function onBlur() { reset(); }
    zone.addEventListener("pointermove", onMove);
    zone.addEventListener("pointerleave", onLeave);
    zone.addEventListener("focus", onFocus);
    zone.addEventListener("blur", onBlur);

    let start = 0;
    function autoAdvance(ts: number) {
      if (!start) start = ts;
      const t = ((ts - start) % ORBIT_MS) / ORBIT_MS * Math.PI * 2;
      const rect = zone!.getBoundingClientRect();
      applyFromPoint(
        rect.left + rect.width * (0.5 + 0.4 * Math.cos(t)),
        rect.top + rect.height * (0.5 + 0.4 * Math.sin(t))
      );
    }

    function loop(ts: number) {
      if (isDemo && !reduce) autoAdvance(ts);
      if (reduce) {
        shownRX = targetRX; shownRY = targetRY; shownGX = targetGX; shownGY = targetGY;
      } else {
        shownRX += (targetRX - shownRX) * LERP_RATE;
        shownRY += (targetRY - shownRY) * LERP_RATE;
        shownGX += (targetGX - shownGX) * LERP_RATE;
        shownGY += (targetGY - shownGY) * LERP_RATE;
      }
      card!.style.transform = "rotateX(" + shownRX.toFixed(2) + "deg) rotateY(" + shownRY.toFixed(2) + "deg)";
      glare!.style.background = "radial-gradient(circle at " + shownGX.toFixed(1) + "% " + shownGY.toFixed(1) +
        "%, rgba(255,255,255,.5), transparent 55%)";
      rafRef.current = requestAnimationFrame(loop);
    }
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      zone!.removeEventListener("pointermove", onMove);
      zone!.removeEventListener("pointerleave", onLeave);
      zone!.removeEventListener("focus", onFocus);
      zone!.removeEventListener("blur", onBlur);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.wrap + " " + styles.isDemo} ref={rootRef}>
        <button className={styles.cardZone} ref={zoneRef} type="button" aria-label="스티커, 마우스를 올리면 포인터 방향으로 기운다">
          <span className={styles.card} ref={cardRef}>
            <span className={styles.glare} ref={glareRef} aria-hidden="true"></span>
            <span className={styles.cardMark} aria-hidden="true"></span>
          </span>
        </button>
      </div>
    </main>
  );
}
