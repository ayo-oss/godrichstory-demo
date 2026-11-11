import { useEffect, useRef } from "react";
import styles from "./SmokeEffectLayeredDepthParallax.module.scss";

type Particle = { bx: number; y: number; born: number; wSeed: number };
type Layer = {
  speed: number; radiusMul: number; alphaMul: number; bx: number; spawnPerS: number; seed: number;
  rand: () => number; particles: Particle[]; spawnAcc: number;
};

export default function SmokeEffectLayeredDepthParallax() {
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
    const PLUME_LIFE_MS = 2400;

    function seedRand(seed: number) {
      let s = seed >>> 0;
      return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    }
    const NOISE_DIM = 40;
    const noiseRand = seedRand(423080);
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

    const LAYERS: Layer[] = [
      { speed: 6, radiusMul: 1.7, alphaMul: 0.20, bx: CALC_W * 0.30, spawnPerS: 11, seed: 423081, rand: seedRand(423081), particles: [], spawnAcc: 0 },
      { speed: 13, radiusMul: 1.15, alphaMul: 0.32, bx: CALC_W * 0.52, spawnPerS: 15, seed: 423082, rand: seedRand(423082), particles: [], spawnAcc: 0 },
      { speed: 22, radiusMul: 0.8, alphaMul: 0.46, bx: CALC_W * 0.72, spawnPerS: 19, seed: 423083, rand: seedRand(423083), particles: [], spawnAcc: 0 }
    ];

    function stepSim(dtMs: number, nowMs: number) {
      const dtS = dtMs / 1000;
      for (let li = 0; li < LAYERS.length; li += 1) {
        const L = LAYERS[li];
        L.spawnAcc += dtMs * L.spawnPerS / 1000;
        while (L.spawnAcc >= 1) {
          L.particles.push({ bx: L.bx + (L.rand() - 0.5) * 10, y: CALC_H - 6, born: nowMs, wSeed: L.rand() * 1000 });
          L.spawnAcc -= 1;
        }
        const alive: Particle[] = [];
        for (let i = 0; i < L.particles.length; i += 1) {
          const p = L.particles[i];
          p.y -= L.speed * dtS;
          if (nowMs - p.born < PLUME_LIFE_MS) alive.push(p);
        }
        L.particles = alive;
      }
    }

    let cw = 480, ch = 300;
    function drawSmoke(nowMs: number) {
      const sx = cw / CALC_W, sy = ch / CALC_H;
      ctx!.clearRect(0, 0, cw, ch);
      for (let li = 0; li < LAYERS.length; li += 1) {
        const L = LAYERS[li];
        for (let i = 0; i < L.particles.length; i += 1) {
          const p = L.particles[i];
          const f = Math.max(0, Math.min(1, (nowMs - p.born) / PLUME_LIFE_MS));
          const turb = (valueNoise2D(p.wSeed * 0.03, nowMs * 0.0016) - 0.5) * 2;
          const x = p.bx + turb * 14 * f;
          const r = (6 + f * 16) * L.radiusMul;
          const alpha = Math.sin(f * Math.PI) * L.alphaMul;
          if (alpha <= 0.01) continue;
          const dx = x * sx, dy = p.y * sy, dr = r * ((sx + sy) / 2);
          const g = ctx!.createRadialGradient(dx, dy, 0, dx, dy, dr);
          g.addColorStop(0, "rgba(30,28,34," + alpha + ")");
          g.addColorStop(1, "rgba(30,28,34,0)");
          ctx!.fillStyle = g;
          ctx!.beginPath();
          ctx!.arc(dx, dy, dr, 0, Math.PI * 2);
          ctx!.fill();
        }
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
    const warmSteps = reduce ? 160 : 130;
    for (let w = 0; w < warmSteps; w += 1) { elapsed += 20; stepSim(20, elapsed); }

    let lastTs: number | null = null;
    let raf = 0;
    function tick(ts: number) {
      if (lastTs === null) lastTs = ts;
      const dt = Math.min(ts - lastTs, 48);
      lastTs = ts;
      if (!reduce) {
        elapsed += dt;
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
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={`${styles.smk} is-demo`} ref={rootRef}>
        <canvas className={styles.smk__canvas} ref={canvasRef} width={480} height={300} />
        <p className={styles.smk__caption}>뒤쪽 레이어일수록 입자가 더 느리고 흐릿하게 움직여 앞쪽 레이어와 속도 차이가 깊이감을 만든다</p>
      </div>
    </main>
  );
}
