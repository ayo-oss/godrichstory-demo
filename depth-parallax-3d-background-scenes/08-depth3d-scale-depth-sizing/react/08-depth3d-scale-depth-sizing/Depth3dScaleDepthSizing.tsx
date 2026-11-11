import { useEffect, useRef } from "react";
import styles from "./Depth3dScaleDepthSizing.module.scss";

type Particle = {
  worldX: number;
  worldY: number;
  zOffset: number;
  speedScale: number;
  color: string;
};

export default function Depth3dScaleDepthSizing() {
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
    const CX = CALC_W * 0.5, CY = CALC_H * 0.5;
    const PARTICLE_Z_MAX = 120;
    const PARTICLE_COUNT = 34;
    const FOCAL = 60;

    function seedRand(seed: number) {
      let s = seed >>> 0;
      return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    }
    const rnd = seedRand(429081);

    const particles: Particle[] = [];
    for (let i = 0; i < PARTICLE_COUNT; i += 1) {
      particles.push({
        worldX: (rnd() - 0.5) * 140,
        worldY: (rnd() - 0.5) * 90,
        zOffset: rnd() * PARTICLE_Z_MAX,
        speedScale: 0.6 + rnd() * 0.8,
        color: i % 3 === 0 ? "#6ec8ff" : (i % 3 === 1 ? "#b9a0ff" : "#4cd4a6")
      });
    }

    function zAdvanceSpeed(p: Particle) {
      return 0.012 * p.speedScale;
    }

    function zAt(p: Particle, t: number) {
      let raw = (p.zOffset - t * zAdvanceSpeed(p)) % PARTICLE_Z_MAX;
      if (raw < 0) raw += PARTICLE_Z_MAX;
      return raw + 1;
    }

    function sizeForDepth(z: number) {
      const v = (FOCAL / z) * 3.4;
      return Math.max(0.8, Math.min(7, v));
    }

    let elapsed = 0;
    let cw = 480, ch = 300;

    function drawScene(t: number) {
      const sx = cw / CALC_W, sy = ch / CALC_H;
      ctx!.clearRect(0, 0, cw, ch);

      for (let i = 0; i < particles.length; i += 1) {
        const p = particles[i];
        const z = zAt(p, t);
        const scale = FOCAL / z;
        const sizePx = sizeForDepth(z);
        const alpha = Math.max(0.18, Math.min(1, scale * 0.55));
        const dx = (CX + p.worldX * scale * 0.34) * sx;
        const dy = (CY + p.worldY * scale * 0.34) * sy;
        ctx!.globalAlpha = alpha;
        ctx!.fillStyle = p.color;
        ctx!.beginPath();
        ctx!.arc(dx, dy, sizePx * sx, 0, Math.PI * 2);
        ctx!.fill();
      }
      ctx!.globalAlpha = 1;
    }

    function fit() {
      const r = wrap.getBoundingClientRect();
      cw = Math.max(1, Math.round(r.width));
      ch = Math.max(1, Math.round(r.height));
      canvas!.width = cw; canvas!.height = ch;
      drawScene(elapsed);
    }

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) root.classList.remove("is-demo");

    const warmSteps = reduce ? 0 : 130;
    for (let w = 0; w < warmSteps; w += 1) elapsed += 20;

    let lastTs: number | null = null;
    let raf = 0;
    function tick(ts: number) {
      if (lastTs === null) lastTs = ts;
      const dt = Math.min(ts - lastTs, 48);
      lastTs = ts;
      if (!reduce) {
        elapsed += dt;
        drawScene(elapsed);
      }
      raf = requestAnimationFrame(tick);
    }
    fit();
    window.addEventListener("resize", fit);
    drawScene(elapsed);
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", fit);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={`${styles.d3} is-demo`} ref={rootRef} tabIndex={0}>
        <canvas className={styles.d3__canvas} ref={canvasRef} width={480} height={300} />
        <p className={styles.d3__caption}>입자마다 z값을 시간에 따라 조금씩 바꾸고 그 값을 화면 크기로 매 프레임 다시 환산해, 다가오는 입자는 점점 커지고 멀어지는 입자는 점점 작아진다</p>
      </div>
    </main>
  );
}
