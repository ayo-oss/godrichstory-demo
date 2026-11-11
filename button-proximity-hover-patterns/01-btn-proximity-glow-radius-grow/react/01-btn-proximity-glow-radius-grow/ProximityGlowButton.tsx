// ProximityGlowButton — vanilla 판(run/408/demo/01-btn-proximity-glow-radius-grow/index.html) 의 React 포트.
// 버튼까지 거리 값(0~1)을 lerp 로 관성 있게 따라가며 후광(box-shadow blur·spread)과 밝기(filter)를 계산한다.
// 포인터가 없을 때(자동 시연)는 궤도 반지름이 2초 동안 0 → 최대 → 0 으로 도는 가상 커서 거리로 같은 계산을 돌린다.
import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import styles from "./ProximityGlowButton.module.scss";

type Box<T> = { current: T };

// PROX_GLOW_RADIUS_MAX_PX — 변형 1: 40 → 80 로 늘리면 후광이 버튼 전체를 덮을 만큼 크게 번진다.
const PROX_GLOW_RADIUS_MAX_PX = 40;
const PROX_RADIUS_PX = 170;
const LERP = 0.18;

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function syntheticOffset(t: number): [number, number] {
  const ang = t * 1.7;
  const rad = 110 * (1 + Math.cos(t * Math.PI));
  return [Math.cos(ang) * rad, Math.sin(ang) * rad];
}

export default function ProximityGlowButton() {
  const sceneRef = useRef<HTMLDivElement | null>(null);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const badgeRef = useRef<HTMLParagraphElement | null>(null);
  const targetPRef = useRef<number>(0) as Box<number>;
  const curPRef = useRef<number>(0) as Box<number>;
  const hasPointerRef = useRef<boolean>(false) as Box<boolean>;
  const frameRef = useRef<number>(0) as Box<number>;
  const t0Ref = useRef<number>(0) as Box<number>;
  const [demo, setDemo] = useState(true);
  const [reduce, setReduce] = useState(false);

  function render(p: number): void {
    const btn = btnRef.current;
    const badge = badgeRef.current;
    if (!btn || !badge) return;
    const blurRadius = p * PROX_GLOW_RADIUS_MAX_PX;
    const spread = p * PROX_GLOW_RADIUS_MAX_PX * 0.3;
    const alpha = (0.18 + p * 0.55).toFixed(2);
    btn.style.boxShadow = "0 0 " + blurRadius.toFixed(1) + "px " + spread.toFixed(1) + "px rgba(255,247,230," + alpha + ")";
    btn.style.filter = "brightness(" + (1 + p * 0.22).toFixed(3) + ")";
    badge.textContent = "거리 값 " + Math.round((1 - p) * 100) + "%";
  }

  function distanceToButton(x: number, y: number): number {
    const btn = btnRef.current;
    if (!btn) return PROX_RADIUS_PX;
    const r = btn.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    return Math.hypot(x - cx, y - cy);
  }

  useEffect(() => {
    setReduce(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(() => {
    if (reduce) {
      render(0);
      return;
    }
    function loop(now: number): void {
      if (t0Ref.current === 0) t0Ref.current = now;
      const t = (now - t0Ref.current) / 1000;
      if (!hasPointerRef.current) {
        const off = syntheticOffset(t);
        const d = Math.hypot(off[0], off[1]);
        targetPRef.current = clamp(1 - d / PROX_RADIUS_PX, 0, 1);
      }
      curPRef.current += (targetPRef.current - curPRef.current) * LERP;
      render(curPRef.current);
      frameRef.current = requestAnimationFrame(loop);
    }
    frameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameRef.current);
  }, [reduce]);

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>): void {
    hasPointerRef.current = true;
    setDemo(false);
    const d = distanceToButton(event.clientX, event.clientY);
    targetPRef.current = clamp(1 - d / PROX_RADIUS_PX, 0, 1);
    if (reduce) { curPRef.current = targetPRef.current; render(curPRef.current); }
  }

  function onPointerLeave(): void {
    hasPointerRef.current = false;
    targetPRef.current = 0;
    if (reduce) { curPRef.current = 0; render(0); }
  }

  function onFocus(): void {
    hasPointerRef.current = true;
    targetPRef.current = 1;
    if (reduce) { curPRef.current = 1; render(1); }
  }

  function onBlur(): void {
    hasPointerRef.current = false;
    targetPRef.current = 0;
    if (reduce) { curPRef.current = 0; render(0); }
  }

  const cls = [styles.pg, demo ? styles.isDemo : ""].filter(Boolean).join(" ");
  return (
    <main className={styles.stage}>
      <div className={cls}>
        <p className={styles.badge} ref={badgeRef}>거리 값 100%</p>
        <div className={styles.scene} ref={sceneRef} onPointerMove={onPointerMove} onPointerLeave={onPointerLeave}>
          <button className={styles.btn} ref={btnRef} type="button" onFocus={onFocus} onBlur={onBlur}>지금 시작하기</button>
        </div>
      </div>
    </main>
  );
}
