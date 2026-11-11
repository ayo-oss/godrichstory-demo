// ProximityParticleSwarmButton — vanilla 판(run/408/demo/09-btn-proximity-particle-density-swarm/index.html) 의 React 포트.
// 거리 값이 줄어드는 동안 캔버스에 그리는 입자 개수 값(count)과 궤도 반경(radius) 값이 함께
// 바뀐다. 입자마다 고정된 노이즈 오프셋(각도·주기 지터)을 심어 기계적으로 안 보이게 한다.
import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import styles from "./ProximityParticleSwarmButton.module.scss";

type Box<T> = { current: T };

type Particle = {
  baseAngle: number;
  noise: number;
  phase: number;
  size: number;
};

type TrailPoint = {
  x: number;
  y: number;
  size: number;
  alpha: number;
};

// PROX_PARTICLE_MAX_COUNT — 변형 3: 6 → 14 로 늘리면 입자가 촘촘히 모여 붐비듯 화려해진다.
const PROX_PARTICLE_MAX_COUNT = 6;
const PROX_RADIUS_PX = 170;
const LERP = 0.16;
const RADIUS_FAR_PX = 92;
const RADIUS_NEAR_PX = 46;
const TRAIL_STEPS = 7;

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function makeParticles(): Particle[] {
  const list: Particle[] = [];
  for (let i = 0; i < PROX_PARTICLE_MAX_COUNT; i += 1) {
    list.push({
      baseAngle: (i / PROX_PARTICLE_MAX_COUNT) * Math.PI * 2,
      noise: ((i * 137) % 23) / 23 - 0.5,
      phase: ((i * 71) % 100) / 100 * Math.PI * 2,
      size: 2.4 + ((i * 53) % 7) / 7 * 1.6,
    });
  }
  return list;
}

function syntheticOffset(t: number): [number, number] {
  const ang = t * 1.5;
  const rad = 110 * (1 + Math.cos(t * Math.PI));
  return [Math.cos(ang) * rad, Math.sin(ang) * rad];
}

export default function ProximityParticleSwarmButton() {
  const sceneRef = useRef<HTMLDivElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const badgeRef = useRef<HTMLParagraphElement | null>(null);
  const particlesRef = useRef<Particle[]>(makeParticles()) as Box<Particle[]>;
  const targetPRef = useRef<number>(0) as Box<number>;
  const curPRef = useRef<number>(0) as Box<number>;
  const hasPointerRef = useRef<boolean>(false) as Box<boolean>;
  const frameRef = useRef<number>(0) as Box<number>;
  const t0Ref = useRef<number>(0) as Box<number>;
  const radiusScaleRef = useRef<number>(1) as Box<number>;
  const trailHistoryRef = useRef<TrailPoint[][]>([]) as Box<TrailPoint[][]>;
  const [demo, setDemo] = useState(true);
  const [reduce, setReduce] = useState(false);

  function resizeCanvas(): void {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const r = wrap.getBoundingClientRect();
    const w = Math.max(1, Math.round(r.width));
    const h = Math.max(1, Math.round(r.height));
    if (canvas.width !== w) canvas.width = w;
    if (canvas.height !== h) canvas.height = h;
    radiusScaleRef.current = Math.min(w / 280, h / 150);
  }

  function draw(p: number, t: number): void {
    const canvas = canvasRef.current;
    const badge = badgeRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !badge || !wrap) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    const cx = w / 2;
    const cy = h / 2;
    const radiusScale = radiusScaleRef.current;
    const count = p * PROX_PARTICLE_MAX_COUNT;
    const radius = (RADIUS_FAR_PX + (RADIUS_NEAR_PX - RADIUS_FAR_PX) * p) * radiusScale;
    const positions: TrailPoint[] = [];
    particlesRef.current.forEach((pt, i) => {
      const visible = clamp(count - i, 0, 1);
      if (visible <= 0) return;
      const ang = pt.baseAngle + t * 0.5 + pt.noise * Math.sin(t * 1.3 + pt.phase) * 0.6;
      const rad = radius + pt.noise * 10 * radiusScale * Math.sin(t * 0.9 + pt.phase);
      const x = cx + Math.cos(ang) * rad;
      const y = cy + Math.sin(ang) * rad * 0.72;
      positions.push({ x, y, size: pt.size * radiusScale, alpha: (0.4 + p * 0.6) * visible });
    });
    // 계산 레이어: 최근 몇 프레임의 입자 위치를 옅은 잔상으로 같이 그려 궤적이 남게 한다(전체 캔버스를 덮지 않는다).
    const trailHistory = trailHistoryRef.current;
    trailHistory.push(positions);
    if (trailHistory.length > TRAIL_STEPS) trailHistory.shift();
    trailHistory.forEach((frame, hi) => {
      const age = trailHistory.length - hi;
      const fade = 1 - age / (TRAIL_STEPS + 1);
      frame.forEach((pos) => {
        ctx.globalAlpha = pos.alpha * fade;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, pos.size * (0.8 + fade * 0.9), 0, Math.PI * 2);
        ctx.fillStyle = "#0a4fe8";
        ctx.fill();
      });
    });
    positions.forEach((pos) => {
      ctx.globalAlpha = pos.alpha;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, pos.size, 0, Math.PI * 2);
      ctx.fillStyle = "#fff7e6";
      ctx.fill();
    });
    ctx.globalAlpha = 1;
    // 계산 레이어: 같은 진행률(p)을 입자 뒤 글로우 크기·불투명도에도 전파한다 — 배경과 겹치지 않는 색.
    wrap.style.setProperty("--sw-p", p.toFixed(3));
    badge.textContent = "입자 값 " + Math.round(count) + "/" + PROX_PARTICLE_MAX_COUNT;
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
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    return () => window.removeEventListener("resize", resizeCanvas);
  }, []);

  useEffect(() => {
    if (reduce) {
      draw(0, 0);
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
      draw(curPRef.current, t);
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
    if (reduce) { curPRef.current = targetPRef.current; draw(curPRef.current, 0); }
  }

  function onPointerLeave(): void {
    hasPointerRef.current = false;
    targetPRef.current = 0;
    if (reduce) { curPRef.current = 0; draw(0, 0); }
  }

  function onFocus(): void {
    hasPointerRef.current = true;
    targetPRef.current = 1;
    if (reduce) { curPRef.current = 1; draw(1, 0); }
  }

  function onBlur(): void {
    hasPointerRef.current = false;
    targetPRef.current = 0;
    if (reduce) { curPRef.current = 0; draw(0, 0); }
  }

  const cls = [styles.pd, demo ? styles.isDemo : ""].filter(Boolean).join(" ");
  return (
    <main className={styles.stage}>
      <div className={cls}>
        <p className={styles.badge} ref={badgeRef}>입자 값 0/6</p>
        <div className={styles.scene} ref={sceneRef} onPointerMove={onPointerMove} onPointerLeave={onPointerLeave}>
          <div className={styles.wrap} ref={wrapRef}>
            <canvas className={styles.canvas} ref={canvasRef} width={280} height={150} aria-hidden="true" />
            <button className={styles.btn} ref={btnRef} type="button" onFocus={onFocus} onBlur={onBlur}>가입하기</button>
          </div>
        </div>
      </div>
    </main>
  );
}
