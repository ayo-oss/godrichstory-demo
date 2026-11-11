// ProximityShadowLiftButton — vanilla 판(run/408/demo/07-btn-proximity-shadow-lift-depth/index.html) 의 React 포트.
// 그림자 오프셋(y)과 번짐(blur)을 같은 거리 값(p)의 함수로 갈라내 그림자만 따로 흔들리지 않고
// 버튼이 통째로 떠오른 것처럼 보이게 한다.
import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import styles from "./ProximityShadowLiftButton.module.scss";

type Box<T> = { current: T };

// PROX_SHADOW_LIFT_MAX_PX — 변형 2: 24 → 48 로 늘리면 그림자가 멀리 번져 버튼이 훨씬 높이 떠오른 것처럼 보인다.
const PROX_SHADOW_LIFT_MAX_PX = 24;
const PROX_RADIUS_PX = 170;
const LERP = 0.18;

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function syntheticOffset(t: number): [number, number] {
  const ang = t * 1.3 + 1.1;
  const rad = 110 * (1 + Math.cos(t * Math.PI));
  return [Math.cos(ang) * rad, Math.sin(ang) * rad];
}

export default function ProximityShadowLiftButton() {
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
    const offsetY = p * PROX_SHADOW_LIFT_MAX_PX;
    const blur = offsetY * 1.7;
    const lift = p * 8;
    btn.style.transform = "translateY(" + (-lift).toFixed(2) + "px)";
    btn.style.boxShadow = "0 " + offsetY.toFixed(1) + "px " + blur.toFixed(1) + "px rgba(23,20,26," + (0.22 + p * 0.24).toFixed(2) + ")";
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

  const cls = [styles.sd, demo ? styles.isDemo : ""].filter(Boolean).join(" ");
  return (
    <main className={styles.stage}>
      <div className={cls}>
        <p className={styles.badge} ref={badgeRef}>거리 값 100%</p>
        <div className={styles.scene} ref={sceneRef} onPointerMove={onPointerMove} onPointerLeave={onPointerLeave}>
          <button className={styles.btn} ref={btnRef} type="button" onFocus={onFocus} onBlur={onBlur}>예약하기</button>
        </div>
      </div>
    </main>
  );
}
