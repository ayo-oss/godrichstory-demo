import { useEffect, useRef } from "react";
import styles from "./ScrollMomentumDecayParallaxLayers.module.scss";

export type ScrollMomentumDecayParallaxLayersProps = {
  color?: string;
};

type Layer = { el: HTMLDivElement; speed: number; decay: number; pos: number; vel: number };

export default function ScrollMomentumDecayParallaxLayers({
  color = "#4cd4a6",
}: ScrollMomentumDecayParallaxLayersProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const viewport = root.querySelector<HTMLDivElement>(`.${styles.viewport}`);
    const farEl = root.querySelector<HTMLDivElement>(`.${styles.far}`);
    const midEl = root.querySelector<HTMLDivElement>(`.${styles.mid}`);
    const nearEl = root.querySelector<HTMLDivElement>(`.${styles.near}`);
    if (!viewport || !farEl || !midEl || !nearEl) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // 계산 겹: 입력 값(inputVel)에 레이어마다 다른 SPEED 를 곱해 각자의 속도(layer.vel)를 만들고,
    // 입력이 끊기면 레이어마다 다른 DECAY 값으로 각자 감쇠한다 — 감쇠율이 클수록(1에 가까울수록)
    // 더 오래 움직인다. 그래서 손을 떼도 레이어들이 서로 다른 시점에 멈춘다.
    const WRAP = 320;
    const layers: Layer[] = [
      { el: farEl, speed: 0.35, decay: 0.988, pos: 0, vel: 0 },
      { el: midEl, speed: 0.65, decay: 0.95, pos: 0, vel: 0 },
      { el: nearEl, speed: 1.0, decay: 0.88, pos: 0, vel: 0 },
    ];
    let raf: number | null = null;
    let inputActive = false;

    function clampWrap(v: number) { let m = v % WRAP; if (m > 0) m -= WRAP; return m; }
    function paint() {
      for (const L of layers) { L.el.style.transform = "translateX(" + L.pos.toFixed(1) + "px)"; }
    }
    function stopLoop() { if (raf !== null) { cancelAnimationFrame(raf); raf = null; } }
    function loopTick() {
      let moving = false;
      for (const L of layers) {
        if (!inputActive) { L.vel *= L.decay; if (reduce) L.vel = 0; }
        L.pos = clampWrap(L.pos + L.vel);
        if (Math.abs(L.vel) > 0.02) moving = true;
      }
      paint();
      if (reduce || (!moving && !inputActive)) { raf = null; return; }
      raf = requestAnimationFrame(loopTick);
    }
    function ensureLoop() { if (raf === null) raf = requestAnimationFrame(loopTick); }
    function setInput(v: number) {
      for (const L of layers) { L.vel = v * L.speed; }
      ensureLoop();
    }

    let wheelTimer: number | null = null;
    function onWheel(e: WheelEvent) {
      e.preventDefault();
      stopAutoplay();
      inputActive = true;
      setInput(-e.deltaY * 0.5 - e.deltaX * 0.5);
      if (wheelTimer !== null) window.clearTimeout(wheelTimer);
      wheelTimer = window.setTimeout(() => { inputActive = false; }, 90);
    }

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
      const v = (e.clientX - lastX) / dt * 16.6;
      setInput(v);
      lastX = e.clientX; lastT = t;
    }
    function onPointerUp() {
      if (!dragging) return;
      dragging = false; inputActive = false;
      ensureLoop();
    }

    viewport.addEventListener("wheel", onWheel, { passive: false });
    viewport.addEventListener("pointerdown", onPointerDown);
    viewport.addEventListener("pointermove", onPointerMove);
    viewport.addEventListener("pointerup", onPointerUp);
    paint();

    let autoTimer: number | null = null, phase = 0;
    let autoReleaseTimer: number | null = null;
    function autoTick() {
      phase += 1;
      const dir = phase % 2 === 0 ? -1 : 1;
      inputActive = true;
      setInput(dir * 6.5);
      autoReleaseTimer = window.setTimeout(() => { inputActive = false; ensureLoop(); }, 160);
    }
    function stopAutoplay() {
      if (autoTimer !== null) { window.clearInterval(autoTimer); autoTimer = null; }
      if (autoReleaseTimer !== null) { window.clearTimeout(autoReleaseTimer); autoReleaseTimer = null; }
    }
    if (!reduce) { autoTimer = window.setInterval(autoTick, 1500); autoTick(); }

    return () => {
      stopAutoplay();
      stopLoop();
      viewport.removeEventListener("wheel", onWheel);
      viewport.removeEventListener("pointerdown", onPointerDown);
      viewport.removeEventListener("pointermove", onPointerMove);
      viewport.removeEventListener("pointerup", onPointerUp);
    };
  }, []);

  return (
    <div ref={rootRef} className={styles.stage}>
      <div className={styles.dpl}>
        <div className={styles.viewport} role="application" aria-label="레이어 패럴랙스 실험판">
          <div className={`${styles.layer} ${styles.far}`} />
          <div className={`${styles.layer} ${styles.mid}`} />
          <div
            className={`${styles.layer} ${styles.near}`}
            style={{ backgroundImage: `radial-gradient(circle, ${color} 0 13px, transparent 14px)` }}
          />
        </div>
        <p className={styles.hint}>가로로 드래그한 뒤 놓으면 레이어마다 다른 속도로 잦아듭니다</p>
      </div>
    </div>
  );
}
