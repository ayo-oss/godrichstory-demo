import { useEffect, useRef } from "react";
import styles from "./VoronoiOrganicCamouflagePattern.module.scss";

export default function VoronoiOrganicCamouflagePattern() {
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
    const LOOP_MS = 2000;
    const NOISE_WARP_PX = 13;
    const WARP_FREQ = (Math.PI * 2) / LOOP_MS;

    function seedRand(seed: number) {
      let s = seed >>> 0;
      return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    }
    const rand = seedRand(409081);

    const off = document.createElement("canvas");
    off.width = CALC_W; off.height = CALC_H;
    const octx = off.getContext("2d") as CanvasRenderingContext2D;
    const offImg = octx.createImageData(CALC_W, CALC_H);
    const offBuf = offImg.data;

    function hexToRgb(hex: string): [number, number, number] {
      const v = parseInt(hex.slice(1), 16);
      return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
    }

    type Vec = { x: number; y: number };
    let NEI = -1, ND = 0, ND2 = 0;
    function nearestTwo<T extends Vec>(px: number, py: number, arr: T[]): void {
      let bd = Infinity, bd2 = Infinity, bi = -1;
      for (let i = 0; i < arr.length; i += 1) {
        const dx = px - arr[i].x, dy = py - arr[i].y, d = dx * dx + dy * dy;
        if (d < bd) { bd2 = bd; bd = d; bi = i; } else if (d < bd2) { bd2 = d; }
      }
      NEI = bi; ND = Math.sqrt(bd); ND2 = Math.sqrt(bd2);
    }

    type Seed = { x: number; y: number; c: string };
    const camoPalette = ["#4cd4a6", "#6ec8ff", "#b9a0ff", "#17141a"];
    const paletteRgb: Record<string, [number, number, number]> = {};
    camoPalette.forEach((h) => { paletteRgb[h] = hexToRgb(h); });

    const MACRO_COUNT = 4;
    const macroCenters: { x: number; y: number; spread: number }[] = [];
    for (let m0 = 0; m0 < MACRO_COUNT; m0 += 1) {
      macroCenters.push({ x: rand() * CALC_W, y: rand() * CALC_H, spread: 10 + rand() * 26 });
    }
    const SEED_COUNT08 = 46;
    const seeds: Seed[] = [];
    for (let i8 = 0; i8 < SEED_COUNT08; i8 += 1) {
      const mc = macroCenters[i8 % MACRO_COUNT];
      seeds.push({
        x: Math.min(CALC_W, Math.max(0, mc.x + (rand() - 0.5) * mc.spread * 2)),
        y: Math.min(CALC_H, Math.max(0, mc.y + (rand() - 0.5) * mc.spread * 2)),
        c: camoPalette[i8 % camoPalette.length]
      });
    }

    const NOISE_GRID_W = 9, NOISE_GRID_H = 6;
    const noiseGridX: number[] = [], noiseGridY: number[] = [];
    for (let n0 = 0; n0 < NOISE_GRID_W * NOISE_GRID_H; n0 += 1) {
      noiseGridX.push(rand()); noiseGridY.push(rand());
    }
    function valueNoise2D(gx: number, gy: number, arr: number[]): number {
      const x0 = Math.floor(gx), y0 = Math.floor(gy);
      const x1 = Math.min(NOISE_GRID_W - 1, x0 + 1), y1 = Math.min(NOISE_GRID_H - 1, y0 + 1);
      const tx = gx - x0, ty = gy - y0;
      const v00 = arr[y0 * NOISE_GRID_W + x0], v10 = arr[y0 * NOISE_GRID_W + x1];
      const v01 = arr[y1 * NOISE_GRID_W + x0], v11 = arr[y1 * NOISE_GRID_W + x1];
      const top = v00 + (v10 - v00) * tx, bot = v01 + (v11 - v01) * tx;
      return top + (bot - top) * ty;
    }
    function warpCoord(x: number, y: number, breathe: number): Vec {
      const gx = (x / CALC_W) * (NOISE_GRID_W - 1), gy = (y / CALC_H) * (NOISE_GRID_H - 1);
      const n1 = valueNoise2D(gx, gy, noiseGridX), n2 = valueNoise2D(gx, gy, noiseGridY);
      return { x: x + (n1 - 0.5) * 2 * NOISE_WARP_PX * breathe, y: y + (n2 - 0.5) * 2 * NOISE_WARP_PX * breathe };
    }

    function renderField(t: number) {
      const breathe = 0.55 + 0.45 * Math.sin(t * WARP_FREQ);
      let idx = 0;
      for (let y = 0; y < CALC_H; y += 1) {
        for (let x = 0; x < CALC_W; x += 1) {
          const w = warpCoord(x + 0.5, y + 0.5, breathe);
          nearestTwo(w.x, w.y, seeds);
          const rgb = paletteRgb[seeds[NEI].c];
          const edge = ND2 - ND;
          const dark = edge < 1.6 ? 0.55 + edge / 3.6 : 1;
          offBuf[idx] = rgb[0] * dark; offBuf[idx + 1] = rgb[1] * dark; offBuf[idx + 2] = rgb[2] * dark; offBuf[idx + 3] = 255;
          idx += 4;
        }
      }
    }

    let cw = 480, ch = 300;
    function fit() {
      const r = wrap.getBoundingClientRect();
      cw = Math.max(1, Math.round(r.width));
      ch = Math.max(1, Math.round(r.height));
      canvas!.width = cw; canvas!.height = ch;
      draw(lastElapsed);
    }

    let lastElapsed = 0;
    function draw(elapsed: number) {
      lastElapsed = elapsed;
      renderField(elapsed);
      octx.putImageData(offImg, 0, 0);
      ctx!.imageSmoothingEnabled = false;
      ctx!.clearRect(0, 0, cw, ch);
      ctx!.drawImage(off, 0, 0, CALC_W, CALC_H, 0, 0, cw, ch);

    }

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let playing = !reduce;
    let elapsed = reduce ? LOOP_MS * 0.5 : 0;
    if (reduce) { root.classList.remove("is-demo"); }



    let lastTs: number | null = null;
    let raf = 0;
    function tick(ts: number) {
      if (lastTs === null) lastTs = ts;
      const dt = ts - lastTs;
      lastTs = ts;
      if (playing) {
        elapsed += dt;
        if (elapsed >= LOOP_MS) elapsed -= LOOP_MS;
      }
      draw(elapsed);
      raf = requestAnimationFrame(tick);
    }
    fit();
    window.addEventListener("resize", fit);
    draw(elapsed);
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", fit);

    };

  }, []);

  return (
    <main className={styles.stage}>
      <div className={`${styles.vd} is-demo`} ref={rootRef}>
        <canvas className={styles.vd__canvas} ref={canvasRef} width={480} height={300} />
        <p className={styles.vd__caption}>셀 크기 편차 값으로 만드는 위장 무늬</p>

      </div>
    </main>
  );
}
