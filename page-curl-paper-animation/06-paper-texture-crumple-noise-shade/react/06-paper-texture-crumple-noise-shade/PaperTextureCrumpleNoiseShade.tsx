import { useEffect, useRef } from "react";
import styles from "./PaperTextureCrumpleNoiseShade.module.scss";

export default function PaperTextureCrumpleNoiseShade() {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    if (!root || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const wrap = canvas.parentElement as HTMLElement;

    const LW = 320, LH = 200;
    const PAGE_L = 30, PAGE_T = 20, PAGE_R = 290, PAGE_B = 180;
    const CELL = 6;
    const SCENE_BG = "#17141a";
    const PAPER: [number, number, number] = [255, 247, 230];

    function seedRand(seed: number) {
      let s = seed >>> 0;
      return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    }
    function clamp(v: number, a: number, b: number): number { return v < a ? a : (v > b ? b : v); }
    function smoothStep(t: number): number { return t * t * (3 - 2 * t); }

    function makeValueNoise(seed: number) {
      const rnd = seedRand(seed);
      const GRID = 24;
      const lattice: number[] = [];
      for (let i = 0; i < GRID * GRID; i += 1) lattice.push(rnd());
      function latAt(xi: number, yi: number): number {
        xi = ((xi % GRID) + GRID) % GRID; yi = ((yi % GRID) + GRID) % GRID;
        return lattice[yi * GRID + xi];
      }
      return function valueNoise(x: number, y: number): number {
        const xi = Math.floor(x), yi = Math.floor(y);
        const xf = x - xi, yf = y - yi;
        const v00 = latAt(xi, yi), v10 = latAt(xi + 1, yi), v01 = latAt(xi, yi + 1), v11 = latAt(xi + 1, yi + 1);
        const sx = smoothStep(xf), sy = smoothStep(yf);
        const a = v00 + (v10 - v00) * sx;
        const b = v01 + (v11 - v01) * sx;
        return a + (b - a) * sy;
      };
    }
    const valueNoise = makeValueNoise(41306);

    function crumpleHeight(x: number, y: number, phase: number): number {
      const n1 = valueNoise(x * 0.16 + phase, y * 0.16);
      const n2 = valueNoise(x * 0.4 - phase * 1.4, y * 0.4 + phase * 0.6);
      return n1 * 0.66 + n2 * 0.34;
    }

    let phase = 0;
    const CYCLE_MS = 900;

    function draw(): void {
      ctx!.fillStyle = SCENE_BG;
      ctx!.fillRect(0, 0, LW, LH);
      ctx!.fillStyle = "rgba(0,0,0,.3)";
      ctx!.fillRect(PAGE_L - 6, PAGE_B + 3, PAGE_R - PAGE_L + 12, 6);

      const lightX = -0.7, lightY = -0.7;
      for (let y = PAGE_T; y < PAGE_B; y += CELL) {
        for (let x = PAGE_L; x < PAGE_R; x += CELL) {
          const u = (x - PAGE_L) / CELL, v = (y - PAGE_T) / CELL;
          const h0 = crumpleHeight(u, v, phase);
          const hx = crumpleHeight(u + 1, v, phase);
          const hy = crumpleHeight(u, v + 1, phase);
          const gx = (hx - h0) * 6, gy = (hy - h0) * 6;
          const lambert = clamp(0.72 - (gx * lightX + gy * lightY) * 0.9, 0.28, 1.15);
          const r = clamp(Math.round(PAPER[0] * lambert), 0, 255);
          const g = clamp(Math.round(PAPER[1] * lambert), 0, 255);
          const b = clamp(Math.round(PAPER[2] * lambert), 0, 255);
          ctx!.fillStyle = "rgb(" + r + "," + g + "," + b + ")";
          ctx!.fillRect(x, y, CELL + 1, CELL + 1);
        }
      }

      const p = (nowMs % CYCLE_MS) / CYCLE_MS;
      const sweepX = PAGE_L - 60 + p * (PAGE_R - PAGE_L + 120);
      const g2 = ctx!.createLinearGradient(sweepX - 34, 0, sweepX + 34, 0);
      g2.addColorStop(0, "rgba(255,255,255,0)");
      g2.addColorStop(0.5, "rgba(255,255,255,.16)");
      g2.addColorStop(1, "rgba(255,255,255,0)");
      ctx!.fillStyle = g2;
      ctx!.fillRect(PAGE_L, PAGE_T, PAGE_R - PAGE_L, PAGE_B - PAGE_T);
    }

    let nowMs = 0;
    function update(dt: number, tMs: number): void {
      if (reduce) return;
      nowMs = tMs;
      phase += dt * 0.5;
    }

    let cw = 480, ch = 300, sx = 1, sy = 1;
    function fit(): void {
      const r = wrap.getBoundingClientRect();
      cw = Math.max(1, Math.round(r.width));
      ch = Math.max(1, Math.round(r.height));
      canvas!.width = cw; canvas!.height = ch;
      sx = cw / LW; sy = ch / LH;
      render();
    }
    function render(): void {
      ctx!.setTransform(1, 0, 0, 1, 0, 0);
      ctx!.clearRect(0, 0, cw, ch);
      ctx!.save();
      ctx!.scale(sx, sy);
      draw();
      ctx!.restore();
    }

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const playing = !reduce;
    if (reduce) { root.classList.remove("is-demo"); phase = 1.2; nowMs = 0; }

    let lastTs: number | null = null;
    let raf = 0;
    function tick(ts: number): void {
      if (lastTs === null) lastTs = ts;
      const dt = Math.min((ts - lastTs) / 1000, 0.05);
      lastTs = ts;
      if (playing) update(dt, ts);
      render();
      raf = requestAnimationFrame(tick);
    }
    fit();
    window.addEventListener("resize", fit);
    render();
    if (playing) raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", fit);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={`${styles.vd} is-demo`} ref={rootRef}>
        <canvas className={styles.vd__canvas} ref={canvasRef} width={480} height={300} />
        <p className={styles.vd__caption}>구겨진 표면이 노이즈로 음영지는 종이 질감</p>
      </div>
    </main>
  );
}
