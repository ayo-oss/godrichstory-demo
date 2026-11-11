// PeelCorner — vanilla 판(run/378/demo/02-sticker-peel-corner/index.html) 의 React 포트.
// 카드 우상단 꼭짓점에서 포인터까지의 벡터로 벗겨짐 크기와 그라디언트 각도(atan2)를 계산한다.
import { useEffect, useRef } from "react";
import styles from "./PeelCorner.module.scss";

type Box<T> = { current: T };

const PEEL_CORNER_SIZE = 24; // 변형: 44px
const PEEL_REACH = 190;
const LERP_RATE = 0.18;
const ORBIT_MS = 2600;

export default function PeelCorner() {
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const zoneRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const cardRef = useRef(null) as unknown as Box<HTMLButtonElement>;
  const shadeRef = useRef(null) as unknown as Box<HTMLSpanElement>;
  const rafRef = useRef(0) as unknown as Box<number>;

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const wrap = rootRef.current;
    const zone = zoneRef.current;
    const card = cardRef.current;
    const shade = shadeRef.current;
    if (!wrap || !zone || !card || !shade) return;

    let isDemo = true;
    let targetSize = 0, targetDeg = 45;
    let shownSize = 0, shownDeg = 45;

    function applyFromPoint(px: number, py: number) {
      const r = card!.getBoundingClientRect();
      const pivotX = r.right, pivotY = r.top;
      const dx = pivotX - px, dy = py - pivotY;
      const distance = Math.hypot(dx, dy);
      const amt = Math.max(0, Math.min(1, 1 - distance / PEEL_REACH));
      targetSize = amt * PEEL_CORNER_SIZE;
      targetDeg = (Math.atan2(dy, dx) * 180 / Math.PI + 360) % 360;
    }

    function human() { if (isDemo) { wrap!.classList.remove(styles.isDemo); isDemo = false; } }
    function onMove(e: PointerEvent) { human(); applyFromPoint(e.clientX, e.clientY); }
    function onLeave() { human(); targetSize = 0; }
    function onFocus() { human(); const r = card!.getBoundingClientRect(); applyFromPoint(r.left, r.top); }
    function onBlur() { human(); targetSize = 0; }
    zone.addEventListener("pointermove", onMove);
    zone.addEventListener("pointerleave", onLeave);
    card.addEventListener("focus", onFocus);
    card.addEventListener("blur", onBlur);

    let last = 0;
    function autoAdvance(ts: number) {
      if (!last) last = ts;
      const r = card!.getBoundingClientRect();
      const t = ((ts - last) % ORBIT_MS) / ORBIT_MS;
      const angle = t * Math.PI * 2;
      const px = r.right - 26 + Math.cos(angle) * 30;
      const py = r.top + 26 + Math.sin(angle) * 30;
      applyFromPoint(px, py);
    }

    function loop(ts: number) {
      if (isDemo && !reduce) autoAdvance(ts);
      if (reduce) { shownSize = targetSize; shownDeg = targetDeg; }
      else {
        shownSize += (targetSize - shownSize) * LERP_RATE;
        shownDeg += (targetDeg - shownDeg) * LERP_RATE;
      }
      card!.style.setProperty("--peel-size", shownSize.toFixed(2) + "px");
      shade!.style.setProperty("--peel-deg", shownDeg.toFixed(1) + "deg");
      rafRef.current = requestAnimationFrame(loop);
    }
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      zone!.removeEventListener("pointermove", onMove);
      zone!.removeEventListener("pointerleave", onLeave);
      card!.removeEventListener("focus", onFocus);
      card!.removeEventListener("blur", onBlur);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.wrap + " " + styles.isDemo} ref={rootRef}>
        <div className={styles.cardZone} ref={zoneRef}>
          <div className={styles.backing} aria-hidden="true"></div>
          <button className={styles.card} ref={cardRef} type="button" aria-label="스티커 카드, 커서를 모서리 쪽으로 움직이면 벗겨진다">
            <span className={styles.cardMark} aria-hidden="true"></span>
            <span className={styles.peelShade} ref={shadeRef} aria-hidden="true"></span>
          </button>
        </div>
      </div>
    </main>
  );
}
