// EmberTrailButton — vanilla 판(run/404/demo/03-btn-canvas-ember-trail-drag/index.html) 의 React 포트.
// 드래그(또는 자동 경로)의 이동 속도를 계산해 그 속도에 비례한 개수의 잔불 입자를 만들고,
// 중력·공기저항으로 매 프레임 물리 업데이트하며 나이에 따라 뜨거운 색에서 식은 색으로 보간해 그린다.
import { useEffect, useRef } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import styles from "./EmberTrailButton.module.scss";

type Box<T> = { current: T };
type KeyEvt = { key: string; preventDefault(): void };
type Ember = { x: number; y: number; vx: number; vy: number; born: number; life: number; size: number };

const W = 480, H = 300;
const SEED = 30309;
const GRAVITY = 520;
const AIR_DRAG = 0.988;
const EMBER_LIFE_MIN = 620;
const EMBER_LIFE_SPAN = 620;
const EMBER_HOT: [number, number, number] = [255, 214, 120];
const EMBER_COOL: [number, number, number] = [196, 40, 10];

function makeLcg(seed: number) {
  let s = seed >>> 0;
  return function () {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export default function EmberTrailButton() {
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const rndRef = useRef(makeLcg(SEED)) as Box<() => number>;
  const particlesRef = useRef<Ember[]>([]) as Box<Ember[]>;
  const draggingRef = useRef<boolean>(false) as Box<boolean>;
  const demoRef = useRef<boolean>(true) as Box<boolean>;
  const lastRef = useRef<{ x: number | null; y: number | null; t: number | null }>({ x: null, y: null, t: null }) as Box<{ x: number | null; y: number | null; t: number | null }>;
  const reduceRef = useRef<boolean>(false) as Box<boolean>;
  const frameRef = useRef<number>(0) as Box<number>;
  const autoStartRef = useRef<number | null>(null) as Box<number | null>;

  function spawnEmbers(x: number, y: number, speed: number, now: number): void {
    const rnd = rndRef.current;
    const particles = particlesRef.current;
    const count = Math.max(1, Math.min(9, Math.round(speed / 26)));
    for (let i = 0; i < count; i++) {
      const ang = rnd() * Math.PI * 2;
      const spd = 24 + rnd() * 96;
      particles.push({
        x: x, y: y,
        vx: Math.cos(ang) * spd * 0.34,
        vy: Math.sin(ang) * spd * 0.34 - 34 - rnd() * 46,
        born: now,
        life: EMBER_LIFE_MIN + rnd() * EMBER_LIFE_SPAN,
        size: 2.6 + rnd() * 3.2,
      });
    }
  }

  function stepParticles(now: number, dt: number): void {
    const particles = particlesRef.current;
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      const age = now - p.born;
      if (age > p.life) { particles.splice(i, 1); continue; }
      p.vy += GRAVITY * dt;
      p.vx *= AIR_DRAG;
      p.vy *= AIR_DRAG;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
  }

  function render(now: number): void {
    const cv = cvRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ff4d1f";
    ctx.fillRect(0, 0, W, H);
    const particles = particlesRef.current;
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      const age = Math.max(0, now - p.born);
      const frac = Math.max(0, Math.min(1, age / p.life));
      const r = EMBER_HOT[0] + (EMBER_COOL[0] - EMBER_HOT[0]) * frac;
      const g = EMBER_HOT[1] + (EMBER_COOL[1] - EMBER_HOT[1]) * frac;
      const b = EMBER_HOT[2] + (EMBER_COOL[2] - EMBER_HOT[2]) * frac;
      const a = 1 - frac;
      ctx.beginPath();
      ctx.fillStyle = "rgba(" + (r | 0) + "," + (g | 0) + "," + (b | 0) + "," + a.toFixed(3) + ")";
      ctx.arc(p.x, p.y, p.size * (1 - frac * 0.4), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function pointFromClient(cx: number, cy: number): [number, number] {
    const cv = cvRef.current;
    if (!cv) return [0, 0];
    const r = cv.getBoundingClientRect();
    return [(cx - r.left) * (W / r.width), (cy - r.top) * (H / r.height)];
  }

  function buttonCenter(): [number, number] {
    const btn = btnRef.current;
    const cv = cvRef.current;
    if (!btn || !cv) return [W / 2, H / 2];
    const r = btn.getBoundingClientRect();
    const c = cv.getBoundingClientRect();
    return [(r.left + r.width / 2 - c.left) * (W / c.width), (r.top + r.height / 2 - c.top) * (H / c.height)];
  }

  function dragTo(x: number, y: number, now: number): void {
    const last = lastRef.current;
    if (last.x !== null && last.y !== null && last.t !== null) {
      const dt = Math.max(1, now - last.t);
      const dist = Math.hypot(x - last.x, y - last.y);
      const speed = (dist / dt) * 1000;
      spawnEmbers(x, y, speed, now);
    }
    last.x = x; last.y = y; last.t = now;
  }

  function press(px: number, py: number): void {
    demoRef.current = false;
    const last = lastRef.current;
    last.x = null; last.y = null; last.t = null;
    spawnEmbers(px, py, 240, performance.now());
    if (reduceRef.current) render(performance.now());
  }

  function pressAtButtonCenter(): void {
    const p = buttonCenter();
    press(p[0], p[1]);
  }

  function onKeyDown(e: KeyEvt): void {
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    pressAtButtonCenter();
  }

  function onPointerDown(e: ReactPointerEvent<HTMLCanvasElement>): void {
    draggingRef.current = true;
    demoRef.current = false;
    const cv = cvRef.current;
    if (cv) { try { cv.setPointerCapture(e.pointerId); } catch (err) { /* noop */ } }
    const p = pointFromClient(e.clientX, e.clientY);
    const last = lastRef.current;
    last.x = null; last.y = null; last.t = null;
    dragTo(p[0], p[1], performance.now());
    if (reduceRef.current) render(performance.now());
  }

  function onPointerMove(e: ReactPointerEvent<HTMLCanvasElement>): void {
    if (!draggingRef.current) return;
    const p = pointFromClient(e.clientX, e.clientY);
    dragTo(p[0], p[1], performance.now());
    if (reduceRef.current) render(performance.now());
  }

  function onPointerUp(): void {
    draggingRef.current = false;
  }

  function pathPoint(t: number): [number, number] {
    const cx = W / 2, cy = H / 2;
    return [cx + Math.sin(t * 0.0021) * 150, cy + Math.sin(t * 0.0037 + 1) * 82];
  }

  useEffect(() => {
    reduceRef.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceRef.current) {
      const t0 = performance.now();
      const pts = [pathPoint(0), pathPoint(120), pathPoint(240)];
      for (let i = 0; i < pts.length; i++) spawnEmbers(pts[i][0], pts[i][1], 200, t0 - 260 + i * 90);
      render(t0);
      return;
    }
    const p0 = pathPoint(0);
    dragTo(p0[0], p0[1], performance.now());

    function frame(now: number): void {
      if (autoStartRef.current === null) autoStartRef.current = now;
      const last = lastRef.current;
      const dt = last.t === null ? 0.016 : Math.min(0.05, (now - last.t) / 1000);
      const t = now - (autoStartRef.current as number);
      if (demoRef.current) {
        const p = pathPoint(t);
        dragTo(p[0], p[1], now);
      }
      stepParticles(now, dt);
      render(now);
      frameRef.current = requestAnimationFrame(frame);
    }
    frameRef.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(frameRef.current);
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.et}>
        <canvas
          className={styles.cv}
          ref={cvRef}
          width={W}
          height={H}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        />
        <button className={styles.btn} ref={btnRef} type="button" onClick={pressAtButtonCenter} onKeyDown={onKeyDown}>
          전송하기
        </button>
        <p className={styles.hint}>버튼을 끌어 보세요 — 빠르게 끌수록 잔불이 많이 흩어집니다</p>
      </div>
    </main>
  );
}
