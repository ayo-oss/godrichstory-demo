// ProximityBorderTraceButton — vanilla 판(run/408/demo/06-btn-proximity-border-trace-draw/index.html) 의 React 포트.
// SVG rect 의 실제 둘레 길이(getTotalLength)를 재서 stroke-dasharray 에 쓰고, 거리 값이 줄어드는
// 만큼 stroke-dashoffset 을 그 길이만큼 되돌려 테두리가 한 바퀴 그려지게 한다 — 짐작값이 아니라 실측값이다.
import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import styles from "./ProximityBorderTraceButton.module.scss";

type Box<T> = { current: T };

const PROX_RADIUS_PX = 170;
const LERP = 0.18;

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function syntheticOffset(t: number): [number, number] {
  const ang = t * 1.6;
  const rad = 120 * (1 + Math.cos(t * Math.PI));
  return [Math.cos(ang) * rad, Math.sin(ang) * rad];
}

export default function ProximityBorderTraceButton() {
  const sceneRef = useRef<HTMLDivElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const rectRef = useRef<SVGRectElement | null>(null);
  const badgeRef = useRef<HTMLParagraphElement | null>(null);
  const totalLengthRef = useRef<number>(0) as Box<number>;
  const targetPRef = useRef<number>(0) as Box<number>;
  const curPRef = useRef<number>(0) as Box<number>;
  const hasPointerRef = useRef<boolean>(false) as Box<boolean>;
  const frameRef = useRef<number>(0) as Box<number>;
  const t0Ref = useRef<number>(0) as Box<number>;
  const [demo, setDemo] = useState(true);
  const [reduce, setReduce] = useState(false);

  function render(p: number): void {
    const rect = rectRef.current;
    const badge = badgeRef.current;
    const wrap = wrapRef.current;
    if (!rect || !badge || !wrap) return;
    const offset = (1 - p) * totalLengthRef.current;
    rect.style.strokeDashoffset = String(offset);
    rect.style.opacity = String(0.2 + p * 0.8);
    // 계산 레이어: 같은 진행률(p)을 링 글로우·버튼 배경 그라디언트 각도에도 전파한다.
    wrap.style.setProperty("--p", p.toFixed(3));
    badge.textContent = "테두리 값 " + Math.round(p * 100) + "%";
  }

  function distanceToButton(x: number, y: number): number {
    const wrap = wrapRef.current;
    if (!wrap) return PROX_RADIUS_PX;
    const r = wrap.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    return Math.hypot(x - cx, y - cy);
  }

  useEffect(() => {
    setReduce(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(() => {
    const rect = rectRef.current;
    if (!rect) return;
    // 실제 도형 둘레 길이(px) — 짐작값이 아니라 SVG 가 직접 잰 값이다.
    totalLengthRef.current = rect.getTotalLength();
    rect.style.strokeDasharray = String(totalLengthRef.current);

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

  const cls = [styles.bt, demo ? styles.isDemo : ""].filter(Boolean).join(" ");
  return (
    <main className={styles.stage}>
      <div className={cls}>
        <p className={styles.badge} ref={badgeRef}>테두리 값 0%</p>
        <div className={styles.scene} ref={sceneRef} onPointerMove={onPointerMove} onPointerLeave={onPointerLeave}>
          <div className={styles.wrap} ref={wrapRef}>
            <svg className={styles.ring} viewBox="0 0 200 64" preserveAspectRatio="none" aria-hidden="true">
              <rect ref={rectRef} x={2} y={2} width={196} height={60} rx={12} ry={12} />
            </svg>
            <button className={styles.btn} ref={btnRef} type="button" onFocus={onFocus} onBlur={onBlur}>더 보기</button>
          </div>
        </div>
      </div>
    </main>
  );
}
