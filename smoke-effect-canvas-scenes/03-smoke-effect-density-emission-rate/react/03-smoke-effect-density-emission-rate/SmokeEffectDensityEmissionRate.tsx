import { useEffect, useRef } from "react";
import styles from "./SmokeEffectDensityEmissionRate.module.scss";

type Particle = { x: number; y: number; born: number; wSeed: number };

export default function SmokeEffectDensityEmissionRate() {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rangeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    const range = rangeRef.current;
    if (!root || !canvas || !range) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const wrap = canvas.parentElement as HTMLElement;

    const CALC_W = 160, CALC_H = 100;
    const SMOKE_EMISSION_RATE = 4;
    const SMOKE_RISE_SPEED_PX = 14;
    const PLUME_LIFE_MS = 2200;
    const PARTICLE_CAP = 320;
    const DEMO_SWEEP_MS = 2000;

    function seedRand(seed: number) {
      let s = seed >>> 0;
      return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    }
    const NOISE_DIM = 40;
    const noiseRand = seedRand(423030);
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

    const pRand = seedRand(423031);
    let particles: Particle[] = [];
    let spawnAcc = 0;
    let emissionRate = SMOKE_EMISSION_RATE;

    function spawn(bornMs: number) {
      particles.push({
        x: CALC_W * 0.5 + (pRand() - 0.5) * 14,
        y: CALC_H - 6,
        born: bornMs,
        wSeed: pRand() * 1000
      });
    }

    function stepSim(dtMs: number, nowMs: number) {
      const dtS = dtMs / 1000;
      spawnAcc += dtMs * emissionRate / 1000;
      while (spawnAcc >= 1) {
        if (particles.length < PARTICLE_CAP) spawn(nowMs);
        spawnAcc -= 1;
      }
      const alive: Particle[] = [];
      for (let i = 0; i < particles.length; i += 1) {
        const p = particles[i];
        const turb = (valueNoise2D(p.wSeed * 0.03, nowMs * 0.0016) - 0.5) * 2;
        p.x += turb * 6 * dtS;
        p.y -= SMOKE_RISE_SPEED_PX * dtS;
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
        const r = 6 + f * 14;
        const alpha = Math.sin(f * Math.PI) * 0.22;
        if (alpha <= 0.01) continue;
        const dx = p.x * sx, dy = p.y * sy, dr = r * ((sx + sy) / 2);
        const g = ctx!.createRadialGradient(dx, dy, 0, dx, dy, dr);
        g.addColorStop(0, "rgba(50,32,20," + alpha + ")");
        g.addColorStop(1, "rgba(50,32,20,0)");
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

    let userDriven = false;
    function onRangeInput() {
      userDriven = true;
      emissionRate = Number(range!.value);
      if (reduce) { stepSim(16, elapsed); drawSmoke(elapsed); }
    }
    range.addEventListener("input", onRangeInput);

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
        if (!userDriven && root!.classList.contains("is-demo")) {
          const phase = (elapsed % DEMO_SWEEP_MS) / DEMO_SWEEP_MS;
          const tri = phase < 0.5 ? phase * 2 : 2 - phase * 2;
          emissionRate = 3 + tri * 17;
          range!.value = String(Math.round(emissionRate));
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
      range.removeEventListener("input", onRangeInput);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={`${styles.smk} is-demo`} ref={rootRef}>
        <canvas className={styles.smk__canvas} ref={canvasRef} width={480} height={300} />
        <p className={styles.smk__caption}>발생량 값을 올리면 한 화면에 겹치는 입자 수가 늘어 연기가 더 짙고 불투명하게 보인다</p>
        <div className={styles.smk__control}>
          <label className={styles.smk__label} htmlFor="smkRate423react">발생량</label>
          <input
            className={styles.smk__range}
            id="smkRate423react"
            ref={rangeRef}
            type="range"
            min={2}
            max={22}
            defaultValue={4}
            aria-label="발생량"
          />
        </div>
      </div>
    </main>
  );
}
