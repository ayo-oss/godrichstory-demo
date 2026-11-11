// ProximityTiltButton — vanilla 판(run/408/demo/03-btn-proximity-tilt-angle-follow/index.html) 의 React 포트.
// 커서–버튼 중심 방향 벡터를 단위 벡터로 정규화하고, 거리 값(가까울수록 1)을 그 방향의 각도 크기로
// 곱한다 — atan2 로 각도를 구하는 계산 한 겹이 단순 좌표 매핑과 다르다.
import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import styles from "./ProximityTiltButton.module.scss";

type Box<T> = { current: T };

const PROX_RADIUS_PX = 190;
const TA_MAX_DEG = 12;
const LERP = 0.16;

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function syntheticOffset(t: number): [number, number] {
  const ang = t * 1.9;
  const rad = 130 * (1 + Math.cos(t * Math.PI));
  return [Math.cos(ang) * rad, Math.sin(ang) * rad * 0.7];
}

export default function ProximityTiltButton() {
  const sceneRef = useRef<HTMLDivElement | null>(null);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const badgeRef = useRef<HTMLParagraphElement | null>(null);
  const targetDxRef = useRef<number>(0) as Box<number>;
  const targetDyRef = useRef<number>(0) as Box<number>;
  const curDxRef = useRef<number>(0) as Box<number>;
  const curDyRef = useRef<number>(0) as Box<number>;
  const hasPointerRef = useRef<boolean>(false) as Box<boolean>;
  const frameRef = useRef<number>(0) as Box<number>;
  const t0Ref = useRef<number>(0) as Box<number>;
  const [demo, setDemo] = useState(true);
  const [reduce, setReduce] = useState(false);

  function render(dx: number, dy: number): void {
    const btn = btnRef.current;
    const badge = badgeRef.current;
    if (!btn || !badge) return;
    const d = Math.hypot(dx, dy);
    const p = clamp(1 - d / PROX_RADIUS_PX, 0, 1);
    const ux = d > 0.001 ? dx / d : 0;
    const uy = d > 0.001 ? dy / d : 0;
    const rotY = ux * p * TA_MAX_DEG;
    const rotX = -uy * p * TA_MAX_DEG;
    const lean = p * 6;
    btn.style.transform = "translate(" + (ux * lean).toFixed(2) + "px," + (uy * lean).toFixed(2) + "px) rotateX(" + rotX.toFixed(2) + "deg) rotateY(" + rotY.toFixed(2) + "deg)";
    // 계산 레이어: 같은 기울기 각도(ux·uy·p) 를 테두리 하이라이트 위치·깊이 그림자에도 전파한다.
    const shadowX = ux * p * 16;
    const shadowY = 6 + uy * p * 12;
    const shadowBlur = 14 + p * 22;
    btn.style.boxShadow = shadowX.toFixed(1) + "px " + shadowY.toFixed(1) + "px " + shadowBlur.toFixed(1) + "px rgba(23,20,26," + (0.2 + p * 0.3).toFixed(2) + ")";
    btn.style.setProperty("--hl-x", (50 + ux * 38).toFixed(1) + "%");
    btn.style.setProperty("--hl-y", (50 + uy * 38).toFixed(1) + "%");
    btn.style.setProperty("--hl-o", (0.12 + p * 0.5).toFixed(2));
    badge.textContent = "각도 값 " + Math.round(rotY) + "°";
  }

  function vectorToButton(x: number, y: number): [number, number] {
    const btn = btnRef.current;
    if (!btn) return [PROX_RADIUS_PX * 2, 0];
    const r = btn.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    return [x - cx, y - cy];
  }

  useEffect(() => {
    setReduce(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(() => {
    if (reduce) {
      curDxRef.current = PROX_RADIUS_PX * 2;
      curDyRef.current = 0;
      render(curDxRef.current, curDyRef.current);
      return;
    }
    function loop(now: number): void {
      if (t0Ref.current === 0) t0Ref.current = now;
      const t = (now - t0Ref.current) / 1000;
      if (!hasPointerRef.current) {
        const off = syntheticOffset(t);
        targetDxRef.current = off[0];
        targetDyRef.current = off[1];
      }
      curDxRef.current += (targetDxRef.current - curDxRef.current) * LERP;
      curDyRef.current += (targetDyRef.current - curDyRef.current) * LERP;
      render(curDxRef.current, curDyRef.current);
      frameRef.current = requestAnimationFrame(loop);
    }
    frameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameRef.current);
  }, [reduce]);

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>): void {
    hasPointerRef.current = true;
    setDemo(false);
    const v = vectorToButton(event.clientX, event.clientY);
    targetDxRef.current = v[0];
    targetDyRef.current = v[1];
    if (reduce) { curDxRef.current = v[0]; curDyRef.current = v[1]; render(curDxRef.current, curDyRef.current); }
  }

  function onPointerLeave(): void {
    hasPointerRef.current = false;
    targetDxRef.current = PROX_RADIUS_PX * 2;
    targetDyRef.current = 0;
    if (reduce) { curDxRef.current = targetDxRef.current; curDyRef.current = 0; render(curDxRef.current, 0); }
  }

  function onFocus(): void {
    hasPointerRef.current = true;
    targetDxRef.current = 0;
    targetDyRef.current = 0;
    if (reduce) { curDxRef.current = 0; curDyRef.current = 0; render(0, 0); }
  }

  function onBlur(): void {
    hasPointerRef.current = false;
    targetDxRef.current = PROX_RADIUS_PX * 2;
    targetDyRef.current = 0;
    if (reduce) { curDxRef.current = targetDxRef.current; curDyRef.current = 0; render(curDxRef.current, 0); }
  }

  const cls = [styles.ta, demo ? styles.isDemo : ""].filter(Boolean).join(" ");
  return (
    <main className={styles.stage}>
      <div className={cls}>
        <p className={styles.badge} ref={badgeRef}>각도 값 0°</p>
        <div className={styles.scene} ref={sceneRef} onPointerMove={onPointerMove} onPointerLeave={onPointerLeave}>
          <button className={styles.btn} ref={btnRef} type="button" onFocus={onFocus} onBlur={onBlur}>
            <span>구매하기</span>
          </button>
        </div>
      </div>
    </main>
  );
}
