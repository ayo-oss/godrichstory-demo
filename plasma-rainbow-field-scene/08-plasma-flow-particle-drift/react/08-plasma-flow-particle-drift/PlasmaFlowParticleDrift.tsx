import { useEffect, useRef } from "react";
import styles from "./PlasmaFlowParticleDrift.module.scss";

type Particle = { x: number; y: number; hueSeed: number };

export default function PlasmaFlowParticleDrift() {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    if (!root || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const wrap = canvas.parentElement as HTMLElement;

    // 기법: 2D 값 노이즈로 방향장(flow field)을 만들고, 입자 PLASMA_PARTICLE_COUNT 개가
    // 각자의 자리에서 그 방향을 따라 흐르며 지나간 자리를 옅게 남긴다(트레일). 트레일은
    // 매 프레임 살짝 페이드되는 offBuf 위에 누적되므로, 매 프레임을 독립 계산하는 다른
    // 항목과 달리 상태(입자 위치·트레일)를 이어간다 — reduce 에서는 이 상태 갱신 자체를 멈춘다.
    const CALC_W = 160, CALC_H = 100;
    const PLASMA_PARTICLE_COUNT = 80;
    const PLASMA_FLOW_SCALE = 0.05;
    const PLASMA_SPEED_PX_S = 34;
    const PLASMA_FADE_ALPHA = 0.1;

    function seedRand(seed: number) {
      let s = seed >>> 0;
      return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    }

    function hslToRgb(h: number, s: number, l: number) {
      h = ((h % 360) + 360) % 360;
      const c = (1 - Math.abs(2 * l - 1)) * s;
      const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
      const m = l - c / 2;
      let r = 0, g = 0, b = 0;
      if (h < 60) { r = c; g = x; b = 0; }
      else if (h < 120) { r = x; g = c; b = 0; }
      else if (h < 180) { r = 0; g = c; b = x; }
      else if (h < 240) { r = 0; g = x; b = c; }
      else if (h < 300) { r = x; g = 0; b = c; }
      else { r = c; g = 0; b = x; }
      return "rgb(" + Math.round((r + m) * 255) + "," + Math.round((g + m) * 255) + "," + Math.round((b + m) * 255) + ")";
    }

    const NOISE_DIM = 40;
    const noiseRand = seedRand(417082);
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

    const off = document.createElement("canvas");
    off.width = CALC_W; off.height = CALC_H;
    const octx = off.getContext("2d") as CanvasRenderingContext2D;
    octx.fillStyle = "#0c0e16";
    octx.fillRect(0, 0, CALC_W, CALC_H);

    const pRand = seedRand(417083);
    const particles: Particle[] = [];
    for (let pi = 0; pi < PLASMA_PARTICLE_COUNT; pi += 1) {
      particles.push({ x: pRand() * CALC_W, y: pRand() * CALC_H, hueSeed: pRand() * 360 });
    }

    let flowT = 0;
    function stepSim(dtMs: number) {
      octx.fillStyle = "rgba(12,14,22," + PLASMA_FADE_ALPHA + ")";
      octx.fillRect(0, 0, CALC_W, CALC_H);
      flowT += dtMs * 0.00035;
      const dtS = dtMs / 1000;
      for (let i = 0; i < particles.length; i += 1) {
        const p = particles[i];
        const ang = valueNoise2D(p.x * PLASMA_FLOW_SCALE + flowT, p.y * PLASMA_FLOW_SCALE) * Math.PI * 4;
        p.x += Math.cos(ang) * PLASMA_SPEED_PX_S * dtS;
        p.y += Math.sin(ang) * PLASMA_SPEED_PX_S * dtS;
        if (p.x < 0) p.x += CALC_W; if (p.x >= CALC_W) p.x -= CALC_W;
        if (p.y < 0) p.y += CALC_H; if (p.y >= CALC_H) p.y -= CALC_H;
        const hue = (ang * 57.3 + p.hueSeed + flowT * 40) % 360;
        octx.fillStyle = hslToRgb(hue, 0.75, 0.58);
        octx.fillRect(p.x - 0.6, p.y - 0.6, 1.6, 1.6);
      }
    }

    let cw = 480, ch = 300;
    function fit() {
      const r = wrap.getBoundingClientRect();
      cw = Math.max(1, Math.round(r.width));
      ch = Math.max(1, Math.round(r.height));
      canvas!.width = cw; canvas!.height = ch;
      present();
    }

    function present() {
      ctx!.imageSmoothingEnabled = false;
      ctx!.clearRect(0, 0, cw, ch);
      ctx!.drawImage(off, 0, 0, CALC_W, CALC_H, 0, 0, cw, ch);
    }

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let playing = !reduce;
    if (reduce) {
      root.classList.remove("is-demo");
      for (let w = 0; w < 70; w += 1) stepSim(1000 / 30);
    }

    let lastTs: number | null = null;
    let raf = 0;
    function tick(ts: number) {
      if (lastTs === null) lastTs = ts;
      const dt = ts - lastTs;
      lastTs = ts;
      if (playing) { stepSim(Math.min(dt, 48)); }
      present();
      raf = requestAnimationFrame(tick);
    }
    fit();
    window.addEventListener("resize", fit);
    present();
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", fit);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={`${styles.pv} is-demo`} ref={rootRef}>
        <canvas className={styles.pv__canvas} ref={canvasRef} width={480} height={300} />
        <p className={styles.pv__caption}>노이즈 흐름장을 따라 입자 80개가 색 궤적을 남기는 배경</p>
      </div>
    </main>
  );
}
