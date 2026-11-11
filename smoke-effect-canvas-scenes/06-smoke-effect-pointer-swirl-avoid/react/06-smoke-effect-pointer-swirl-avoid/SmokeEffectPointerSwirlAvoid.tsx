import { useEffect, useRef } from "react";
import styles from "./SmokeEffectPointerSwirlAvoid.module.scss";

type Particle = { x: number; y: number; born: number; wSeed: number };

export default function SmokeEffectPointerSwirlAvoid() {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    if (!root || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const wrap = canvas.parentElement as HTMLElement;

    const CALC_W = 160, CALC_H = 100;
    const SMOKE_RISE_SPEED_PX = 13;
    const SMOKE_SWIRL_RADIUS = 34;
    const SMOKE_SWIRL_STRENGTH = 70;
    const PLUME_SPAWN_PER_S = 22;
    const PLUME_LIFE_MS = 2400;

    function seedRand(seed: number) {
      let s = seed >>> 0;
      return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    }
    const NOISE_DIM = 40;
    const noiseRand = seedRand(423061);
    const noiseTable = new Float32Array(NOISE_DIM * NOISE_DIM);
    for (let ni = 0; ni < noiseTable.length; ni += 1) noiseTable[ni] = noiseRand();
    function noiseAt(xi: number, yi: number) {
      const wx = ((xi % NOISE_DIM) + NOISE_DIM) % NOISE_DIM;
      const wy = ((yi % NOISE_DIM) + NOISE_DIM) % NOISE_DIM;
      return noiseTable[wy * NOISE_DIM + wx];
    }
    function smoothstep(t: number) { return t * t * (3 - 2 * t); }
    function valueNoise2D(x: number, y: number) {
      const x0 = Math.floor(x), y0 = Math.floor(y);
      const tx = smoothstep(x - x0), ty = smoothstep(y - y0);
      const v00 = noiseAt(x0, y0), v10 = noiseAt(x0 + 1, y0);
      const v01 = noiseAt(x0, y0 + 1), v11 = noiseAt(x0 + 1, y0 + 1);
      const a = v00 + (v10 - v00) * tx;
      const b = v01 + (v11 - v01) * tx;
      return a + (b - a) * ty;
    }

    const pRand = seedRand(423062);
    let particles: Particle[] = [];
    let spawnAcc = 0;

    function spawn(bornMs: number) {
      particles.push({
        x: CALC_W * 0.5 + (pRand() - 0.5) * 12,
        y: CALC_H - 6,
        born: bornMs,
        wSeed: pRand() * 1000
      });
    }

    let pointerX = CALC_W * 0.5, pointerY = CALC_H * 0.4;
    let pointerActive = false;

    function stepSim(dtMs: number, nowMs: number) {
      const dtS = dtMs / 1000;
      spawnAcc += dtMs * PLUME_SPAWN_PER_S / 1000;
      while (spawnAcc >= 1) { spawn(nowMs); spawnAcc -= 1; }
      const alive: Particle[] = [];
      for (let i = 0; i < particles.length; i += 1) {
        const p = particles[i];
        const turb = (valueNoise2D(p.wSeed * 0.03, nowMs * 0.0018) - 0.5) * 2;
        p.x += turb * 8 * dtS;
        p.y -= SMOKE_RISE_SPEED_PX * dtS;
        const rx = p.x - pointerX, ry = p.y - pointerY;
        const dist = Math.hypot(rx, ry);
        if (dist < SMOKE_SWIRL_RADIUS && dist > 0.5) {
          const push = (1 - dist / SMOKE_SWIRL_RADIUS) * SMOKE_SWIRL_STRENGTH;
          const tx = -ry / dist, ty = rx / dist;
          p.x += tx * push * dtS;
          p.y += ty * push * dtS;
        }
        if (nowMs - p.born < PLUME_LIFE_MS) alive.push(p);
      }
      particles = alive;
    }

    let cw = 480, ch = 300;
    function drawSmoke(nowMs: number) {
      const sx = cw / CALC_W, sy = ch / CALC_H;
      ctx!.clearRect(0, 0, cw, ch);
      for (let i = 0; i < particles.length; i += 1) {
        const p = particles[i];
        const f = Math.max(0, Math.min(1, (nowMs - p.born) / PLUME_LIFE_MS));
        const r = 6 + f * 15;
        const alpha = Math.sin(f * Math.PI) * 0.5;
        if (alpha <= 0.01) continue;
        const dx = p.x * sx, dy = p.y * sy, dr = r * ((sx + sy) / 2);
        const g = ctx!.createRadialGradient(dx, dy, 0, dx, dy, dr);
        g.addColorStop(0, "rgba(38,32,24," + alpha + ")");
        g.addColorStop(1, "rgba(38,32,24,0)");
        ctx!.fillStyle = g;
        ctx!.beginPath();
        ctx!.arc(dx, dy, dr, 0, Math.PI * 2);
        ctx!.fill();
      }
    }

    function fit() {
      const r = wrap.getBoundingClientRect();
      cw = Math.max(1, Math.round(r.width));
      ch = Math.max(1, Math.round(r.height));
      canvas!.width = cw; canvas!.height = ch;
      drawSmoke(elapsed);
    }

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let elapsed = 0;
    if (reduce) root.classList.remove("is-demo");

    function toCalc(e: PointerEvent) {
      const r = wrap.getBoundingClientRect();
      return {
        x: (e.clientX - r.left) / r.width * CALC_W,
        y: (e.clientY - r.top) / r.height * CALC_H
      };
    }
    function onPointerMove(e: PointerEvent) {
      pointerActive = true;
      const g = toCalc(e);
      pointerX = g.x; pointerY = g.y;
      if (reduce) { stepSim(16, elapsed); drawSmoke(elapsed); }
    }
    function onPointerLeave() { pointerActive = false; }
    function onKeydown(e: KeyboardEvent) {
      let moved = true;
      if (e.key === "ArrowLeft") pointerX = Math.max(0, pointerX - 8);
      else if (e.key === "ArrowRight") pointerX = Math.min(CALC_W, pointerX + 8);
      else if (e.key === "ArrowUp") pointerY = Math.max(0, pointerY - 8);
      else if (e.key === "ArrowDown") pointerY = Math.min(CALC_H, pointerY + 8);
      else moved = false;
      if (moved) {
        e.preventDefault();
        pointerActive = true;
        if (reduce) { stepSim(16, elapsed); drawSmoke(elapsed); }
      }
    }
    wrap.addEventListener("pointermove", onPointerMove);
    wrap.addEventListener("pointerleave", onPointerLeave);
    wrap.addEventListener("keydown", onKeydown);

    function virtualPointerOrbit(t: number) {
      const cx = CALC_W * (0.3 + 0.4 * ((Math.sin(t * 0.0011) + 1) / 2));
      const cy = CALC_H * (0.28 + 0.5 * ((Math.cos(t * 0.0017) + 1) / 2));
      return { x: cx, y: cy };
    }

    const warmSteps = reduce ? 160 : 120;
    for (let w = 0; w < warmSteps; w += 1) { elapsed += 20; stepSim(20, elapsed); }

    let lastTs: number | null = null;
    let raf = 0;
    function tick(ts: number) {
      if (lastTs === null) lastTs = ts;
      const dt = Math.min(ts - lastTs, 48);
      lastTs = ts;
      if (!reduce) {
        elapsed += dt;
        if (!pointerActive) {
          const v = virtualPointerOrbit(elapsed);
          pointerX = v.x; pointerY = v.y;
        }
        stepSim(dt, elapsed);
        drawSmoke(elapsed);
      }
      raf = requestAnimationFrame(tick);
    }
    fit();
    window.addEventListener("resize", fit);
    drawSmoke(elapsed);
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", fit);
      wrap.removeEventListener("pointermove", onPointerMove);
      wrap.removeEventListener("pointerleave", onPointerLeave);
      wrap.removeEventListener("keydown", onKeydown);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={`${styles.smk} is-demo`} ref={rootRef} tabIndex={0}>
        <canvas className={styles.smk__canvas} ref={canvasRef} width={480} height={300} />
        <p className={styles.smk__caption}>포인터가 연기 기둥에 가까워지는 거리만큼 근처 입자가 소용돌이치며 옆으로 밀려난다</p>
      </div>
    </main>
  );
}
