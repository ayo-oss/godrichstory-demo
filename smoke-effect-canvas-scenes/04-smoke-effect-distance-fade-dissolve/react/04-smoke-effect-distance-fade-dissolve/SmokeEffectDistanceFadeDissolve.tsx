import { useEffect, useRef } from "react";
import styles from "./SmokeEffectDistanceFadeDissolve.module.scss";

type Particle = { x: number; y: number; ang: number; born: number };

export default function SmokeEffectDistanceFadeDissolve() {
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
    const SMOKE_DISSOLVE_MS = 900;
    const DRIFT_SPEED_PX_S = 30;
    const DISSOLVE_DISTANCE = (SMOKE_DISSOLVE_MS / 1000) * DRIFT_SPEED_PX_S;
    const SOURCE_X = CALC_W * 0.5, SOURCE_Y = CALC_H * 0.55;
    const SPAWN_PER_S = 30;

    function seedRand(seed: number) {
      let s = seed >>> 0;
      return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    }
    const pRand = seedRand(423041);
    let particles: Particle[] = [];
    let spawnAcc = 0;

    function spawn(bornMs: number) {
      particles.push({ x: SOURCE_X, y: SOURCE_Y, ang: pRand() * Math.PI * 2, born: bornMs });
    }

    function stepSim(dtMs: number, nowMs: number) {
      const dtS = dtMs / 1000;
      spawnAcc += dtMs * SPAWN_PER_S / 1000;
      while (spawnAcc >= 1) { spawn(nowMs); spawnAcc -= 1; }
      const alive: Particle[] = [];
      for (let i = 0; i < particles.length; i += 1) {
        const p = particles[i];
        p.x += Math.cos(p.ang) * DRIFT_SPEED_PX_S * dtS;
        p.y += Math.sin(p.ang) * DRIFT_SPEED_PX_S * dtS - DRIFT_SPEED_PX_S * 0.2 * dtS;
        const dist = Math.hypot(p.x - SOURCE_X, p.y - SOURCE_Y);
        if (dist < DISSOLVE_DISTANCE && nowMs - p.born < 4000) alive.push(p);
      }
      particles = alive;
    }

    let cw = 480, ch = 300;
    function drawSmoke(nowMs: number) {
      const sx = cw / CALC_W, sy = ch / CALC_H;
      ctx!.clearRect(0, 0, cw, ch);
      for (let i = 0; i < particles.length; i += 1) {
        const p = particles[i];
        const dist = Math.hypot(p.x - SOURCE_X, p.y - SOURCE_Y);
        const f = Math.max(0, 1 - dist / DISSOLVE_DISTANCE);
        const r = 6 + (1 - f) * 24;
        const alpha = f * 0.6;
        if (alpha <= 0.01) continue;
        const dx = p.x * sx, dy = p.y * sy, dr = r * ((sx + sy) / 2);
        const g = ctx!.createRadialGradient(dx, dy, 0, dx, dy, dr);
        g.addColorStop(0, "rgba(35,32,40," + alpha + ")");
        g.addColorStop(1, "rgba(35,32,40,0)");
        ctx!.fillStyle = g;
        ctx!.beginPath();
        ctx!.arc(dx, dy, dr, 0, Math.PI * 2);
        ctx!.fill();
      }
      void nowMs;
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
    const warmSteps = reduce ? 140 : 100;
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
        <p className={styles.smk__caption}>발원지에서 멀어진 거리만큼 입자의 불투명도가 줄어들다가 일정 거리를 넘으면 완전히 사라진다</p>
      </div>
    </main>
  );
}
