// ProximityHueShiftButton — vanilla 판(run/408/demo/05-btn-proximity-hue-shift-approach/index.html) 의 React 포트.
// 거리 값을 두 색상 값 사이의 보간 지점(0~1)으로 쓴다. 채널(R·G·B)마다 선형 보간해
// 커서가 가까워질수록 버튼 색이 강조 색 쪽으로 옮겨간다 — 계산 한 겹, 속성 트윈이 아니다.
import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import styles from "./ProximityHueShiftButton.module.scss";

type Box<T> = { current: T };
type RGB = [number, number, number];

const PROX_RADIUS_PX = 170;
const LERP = 0.17;
const COLOR_FAR: RGB = [10, 79, 232];
const COLOR_NEAR: RGB = [255, 122, 26];

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function lerpColor(c1: RGB, c2: RGB, t: number): RGB {
  return [
    Math.round(c1[0] + (c2[0] - c1[0]) * t),
    Math.round(c1[1] + (c2[1] - c1[1]) * t),
    Math.round(c1[2] + (c2[2] - c1[2]) * t),
  ];
}

function syntheticOffset(t: number): [number, number] {
  const ang = t * 1.5 + 0.3;
  const rad = 110 * (1 + Math.cos(t * Math.PI));
  return [Math.cos(ang) * rad, Math.sin(ang) * rad];
}

export default function ProximityHueShiftButton() {
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
    const scene = sceneRef.current;
    if (!btn || !badge || !scene) return;
    const c = lerpColor(COLOR_FAR, COLOR_NEAR, p);
    btn.style.background = "rgb(" + c[0] + "," + c[1] + "," + c[2] + ")";
    // 계산 레이어: 같은 보간 색(c)을 버튼 링·장면 배경 전체에도 전파한다.
    const ringPx = (6 + p * 20).toFixed(1);
    const ringA = (0.14 + p * 0.26).toFixed(2);
    btn.style.boxShadow = "0 0 0 " + ringPx + "px rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + ringA + ")";
    scene.style.background = "radial-gradient(circle, rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + (0.1 + p * 0.22).toFixed(2) + "), transparent 72%)";
    badge.textContent = "보간 지점 " + Math.round(p * 100) + "%";
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

  const cls = [styles.hu, demo ? styles.isDemo : ""].filter(Boolean).join(" ");
  return (
    <main className={styles.stage}>
      <div className={cls}>
        <p className={styles.badge} ref={badgeRef}>보간 지점 0%</p>
        <div className={styles.scene} ref={sceneRef} onPointerMove={onPointerMove} onPointerLeave={onPointerLeave}>
          <button className={styles.btn} ref={btnRef} type="button" onFocus={onFocus} onBlur={onBlur}>구독하기</button>
        </div>
      </div>
    </main>
  );
}
