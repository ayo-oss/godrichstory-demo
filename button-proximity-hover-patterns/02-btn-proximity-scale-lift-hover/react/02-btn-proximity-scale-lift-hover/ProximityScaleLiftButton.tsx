// ProximityScaleLiftButton — vanilla 판(run/408/demo/02-btn-proximity-scale-lift-hover/index.html) 의 React 포트.
// 거리 값을 스프링 방정식(강성 STIFFNESS·감쇠 DAMPING)에 흘려 목표를 살짝 넘겼다가 정착하는
// 오버슛 한 겹을 더한다 — 단순 lerp 보다 한 계산 층이 깊다.
import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import styles from "./ProximityScaleLiftButton.module.scss";

type Box<T> = { current: T };

const PROX_RADIUS_PX = 170;
const SL_SCALE_MAX = 0.08;
const SL_LIFT_MAX_PX = 6;
const STIFFNESS = 0.22;
const DAMPING = 0.72;

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function syntheticOffset(t: number): [number, number] {
  const ang = t * 1.4 + 0.6;
  const rad = 110 * (1 + Math.cos(t * Math.PI));
  return [Math.cos(ang) * rad, Math.sin(ang) * rad];
}

export default function ProximityScaleLiftButton() {
  const sceneRef = useRef<HTMLDivElement | null>(null);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const badgeRef = useRef<HTMLParagraphElement | null>(null);
  const targetPRef = useRef<number>(0) as Box<number>;
  const posRef = useRef<number>(0) as Box<number>;
  const velRef = useRef<number>(0) as Box<number>;
  const hasPointerRef = useRef<boolean>(false) as Box<boolean>;
  const frameRef = useRef<number>(0) as Box<number>;
  const t0Ref = useRef<number>(0) as Box<number>;
  const [demo, setDemo] = useState(true);
  const [reduce, setReduce] = useState(false);

  function render(p: number): void {
    const btn = btnRef.current;
    const badge = badgeRef.current;
    const scene = sceneRef.current;
    if (!btn || !badge || !scene) return;
    const scale = 1 + p * SL_SCALE_MAX;
    const lift = p * SL_LIFT_MAX_PX;
    const depth = 8 + p * 18;
    btn.style.transform = "translateY(" + (-lift).toFixed(2) + "px) scale(" + scale.toFixed(4) + ")";
    btn.style.boxShadow = "0 " + depth.toFixed(1) + "px " + (depth * 1.6).toFixed(1) + "px rgba(23,20,26," + (0.18 + p * 0.18).toFixed(2) + ")";
    // 계산 레이어: 스프링 오버슛 값(p, 1 을 넘나든다)을 장면 배경 글로우 크기·불투명도에도 전파한다.
    const tone = clamp(p, 0, 1.15);
    scene.style.setProperty("--tone-p", tone.toFixed(3));
    badge.textContent = "거리 값 " + Math.round((1 - clamp(p, 0, 1)) * 100) + "%";
  }

  function springStep(target: number): void {
    const force = (target - posRef.current) * STIFFNESS;
    velRef.current = (velRef.current + force) * DAMPING;
    posRef.current += velRef.current;
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
      springStep(targetPRef.current);
      render(clamp(posRef.current, -0.2, 1.2));
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
    if (reduce) { posRef.current = targetPRef.current; render(posRef.current); }
  }

  function onPointerLeave(): void {
    hasPointerRef.current = false;
    targetPRef.current = 0;
    if (reduce) { posRef.current = 0; render(0); }
  }

  function onFocus(): void {
    hasPointerRef.current = true;
    targetPRef.current = 1;
    if (reduce) { posRef.current = 1; render(1); }
  }

  function onBlur(): void {
    hasPointerRef.current = false;
    targetPRef.current = 0;
    if (reduce) { posRef.current = 0; render(0); }
  }

  const cls = [styles.sl, demo ? styles.isDemo : ""].filter(Boolean).join(" ");
  return (
    <main className={styles.stage}>
      <div className={cls}>
        <p className={styles.badge} ref={badgeRef}>거리 값 100%</p>
        <div className={styles.scene} ref={sceneRef} onPointerMove={onPointerMove} onPointerLeave={onPointerLeave}>
          <button className={styles.btn} ref={btnRef} type="button" onFocus={onFocus} onBlur={onBlur}>담기</button>
        </div>
      </div>
    </main>
  );
}
