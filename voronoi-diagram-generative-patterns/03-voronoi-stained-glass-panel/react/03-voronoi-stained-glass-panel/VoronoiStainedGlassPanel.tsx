import { useEffect, useRef } from "react";
import styles from "./VoronoiStainedGlassPanel.module.scss";

export default function VoronoiStainedGlassPanel() {
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
    const GLASS_BORDER_PX = 1.8;

    function seedRand(seed: number) {
      let s = seed >>> 0;
      return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    }
    const rand = seedRand(409031);

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
    const stainedPalette = ["#2f6df6", "#ff9ebb", "#4cd4a6", "#b9a0ff", "#6ec8ff"];
    const paletteRgb: Record<string, [number, number, number]> = {};
    stainedPalette.forEach((h) => { paletteRgb[h] = hexToRgb(h); });
    const SEED_COUNT03 = 20;
    const seeds: Seed[] = [];
    for (let i2 = 0; i2 < SEED_COUNT03; i2 += 1) {
      seeds.push({ x: rand() * CALC_W, y: rand() * CALC_H, c: stainedPalette[i2 % stainedPalette.length] });
    }
    const cellIdx = new Int16Array(CALC_W * CALC_H);
    const edgeVal = new Float32Array(CALC_W * CALC_H);
    (function precompute() {
      let idx = 0;
      for (let y = 0; y < CALC_H; y += 1) {
        for (let x = 0; x < CALC_W; x += 1) {
          nearestTwo(x + 0.5, y + 0.5, seeds);
          cellIdx[idx] = NEI;
          edgeVal[idx] = ND2 - ND;
          idx += 1;
        }
      }
    })();
    const lightSweepAngle = 0.62;
    const cosA = Math.cos(lightSweepAngle), sinA = Math.sin(lightSweepAngle);
    const projSpan = Math.abs(CALC_W * cosA) + Math.abs(CALC_H * sinA);

    function renderField(t: number) {
      const bandCenter = ((t / LOOP_MS) * (projSpan * 1.6)) - projSpan * 0.3;
      let idx4 = 0, idx = 0;
      for (let y = 0; y < CALC_H; y += 1) {
        for (let x = 0; x < CALC_W; x += 1) {
          const ni = cellIdx[idx];
          const rgb = paletteRgb[seeds[ni].c];
          const proj = x * cosA + y * sinA;
          const glow = Math.exp(-Math.pow((proj - bandCenter) / 14, 2)) * 0.6;
          const e = edgeVal[idx];
          const borderMix = e < GLASS_BORDER_PX ? 0.35 : 0;
          const r = rgb[0] * (1 - borderMix) * (1 + glow);
          const g = rgb[1] * (1 - borderMix) * (1 + glow);
          const b = rgb[2] * (1 - borderMix) * (1 + glow);
          offBuf[idx4] = Math.min(255, r);
          offBuf[idx4 + 1] = Math.min(255, g);
          offBuf[idx4 + 2] = Math.min(255, b);
          offBuf[idx4 + 3] = 255;
          idx += 1; idx4 += 4;
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
        <p className={styles.vd__caption}>셀마다 빛 투과 값이 다른 스테인드글라스 패널</p>

      </div>
    </main>
  );
}
