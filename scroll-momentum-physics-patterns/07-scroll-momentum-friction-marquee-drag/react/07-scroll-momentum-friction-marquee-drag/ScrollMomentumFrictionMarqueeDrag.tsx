import { useEffect, useRef } from "react";
import styles from "./ScrollMomentumFrictionMarqueeDrag.module.scss";

export type ScrollMomentumFrictionMarqueeDragProps = {
  color?: string;
};

export default function ScrollMomentumFrictionMarqueeDrag({
  color = "#4cd4a6",
}: ScrollMomentumFrictionMarqueeDragProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const viewport = root.querySelector<HTMLDivElement>(`.${styles.viewport}`);
    const track = root.querySelector<HTMLDivElement>(`.${styles.track}`);
    if (!viewport || !track) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // 계산 겹: 평소엔 BASE_SPEED 로 계속 흐르다가, 드래그·휠로 속도(vel)가 그 값에서 벗어나면
    // 매 프레임 FRICTION_PULL 만큼만 BASE_SPEED 쪽으로 되돌아온다 — 순간 정지가 아니라 서서히 복귀.
    const CHIP_W = 56, GAP = 10, SET_COUNT = 6;
    const WRAP = SET_COUNT * (CHIP_W + GAP);
    const BASE_SPEED = -0.9;
    const FRICTION_PULL = 0.06;
    let pos = 0, vel = BASE_SPEED;
    let inputActive = false;
    let raf: number | null = null;

    function clampWrap(v: number) { let m = v % WRAP; if (m > 0) m -= WRAP; return m; }
    function paint() { track!.style.transform = "translateX(" + pos.toFixed(1) + "px)"; }
    function loopTick() {
      if (reduce) { raf = null; return; }
      if (!inputActive) { vel += (BASE_SPEED - vel) * FRICTION_PULL; }
      pos = clampWrap(pos + vel);
      paint();
      raf = requestAnimationFrame(loopTick);
    }
    function ensureLoop() { if (raf === null && !reduce) raf = requestAnimationFrame(loopTick); }
    ensureLoop();
    paint();

    let dragging = false, lastX = 0, lastT = 0;
    function onPointerDown(e: PointerEvent) {
      stopAutoplay();
      dragging = true; inputActive = true; lastX = e.clientX; lastT = performance.now();
      viewport!.setPointerCapture(e.pointerId);
    }
    function onPointerMove(e: PointerEvent) {
      if (!dragging) return;
      const t = performance.now();
      const dt = Math.max(1, t - lastT);
      const dx = e.clientX - lastX;
      vel = (dx / dt) * 16.6;
      pos = clampWrap(pos + dx);
      paint();
      lastX = e.clientX; lastT = t;
    }
    function onPointerUp() {
      if (!dragging) return;
      dragging = false; inputActive = false;
      ensureLoop();
    }
    function onWheel(e: WheelEvent) {
      e.preventDefault();
      stopAutoplay();
      inputActive = true;
      vel += -e.deltaY * 0.4 - e.deltaX * 0.4;
      ensureLoop();
      if (wheelTimer !== null) window.clearTimeout(wheelTimer);
      wheelTimer = window.setTimeout(() => { inputActive = false; }, 80);
    }
    let wheelTimer: number | null = null;

    viewport.addEventListener("pointerdown", onPointerDown);
    viewport.addEventListener("pointermove", onPointerMove);
    viewport.addEventListener("pointerup", onPointerUp);
    viewport.addEventListener("wheel", onWheel, { passive: false });

    let autoTimer: number | null = null, phase = 0;
    function autoTick() {
      phase += 1;
      const dir = phase % 2 === 0 ? 1 : -1;
      inputActive = true;
      vel = dir * 7 + BASE_SPEED;
      ensureLoop();
      window.setTimeout(() => { inputActive = false; }, 140);
    }
    function stopAutoplay() { if (autoTimer !== null) { window.clearInterval(autoTimer); autoTimer = null; } }
    if (!reduce) { autoTimer = window.setInterval(autoTick, 1500); autoTick(); }

    return () => {
      stopAutoplay();
      if (raf !== null) cancelAnimationFrame(raf);
      viewport.removeEventListener("pointerdown", onPointerDown);
      viewport.removeEventListener("pointermove", onPointerMove);
      viewport.removeEventListener("pointerup", onPointerUp);
      viewport.removeEventListener("wheel", onWheel);
    };
  }, []);

  const labels = ["01", "02", "03", "04", "05", "06", "01", "02", "03", "04", "05", "06"];
  const cls = ["a", "b", "c"];

  return (
    <div ref={rootRef} className={styles.stage}>
      <div className={styles.fmd}>
        <div className={styles.viewport} role="application" aria-label="마퀴 드래그 실험판" tabIndex={0}>
          <div className={styles.track}>
            {labels.map((label, i) => (
              <span
                key={i}
                className={`${styles.chip} ${styles[cls[i % 3]]}`}
                style={i === 0 ? { background: color } : undefined}
              >
                {label}
              </span>
            ))}
          </div>
        </div>
        <p className={styles.hint}>드래그하거나 휠을 굴리면 속도가 바뀌었다가 마찰로 기준 속도로 되돌아옵니다</p>
      </div>
    </div>
  );
}
