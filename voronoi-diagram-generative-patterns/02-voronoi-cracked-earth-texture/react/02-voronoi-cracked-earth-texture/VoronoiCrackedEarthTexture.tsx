import { useEffect, useRef } from "react";
import styles from "./VoronoiCrackedEarthTexture.module.scss";

export default function VoronoiCrackedEarthTexture() {
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
    const CRACK_WIDTH_VALUE = 1.6;
    const DRIFT_AMP = 6;
    const DRIFT_FREQ = (Math.PI * 2) / LOOP_MS;
    const PULSE_FREQ = (Math.PI * 2) / LOOP_MS;

    function seedRand(seed: number) {
      let s = seed >>> 0;
      return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    }
    const rand = seedRand(409021);

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

    type Seed = { bx: number; by: number; x: number; y: number; phaseX: number; phaseY: number; c: string };
    const earthPalette = ["#fff7e6", "#ffd23f", "#c93000"];
    const paletteRgb: Record<string, [number, number, number]> = {};
    earthPalette.forEach((h) => { paletteRgb[h] = hexToRgb(h); });
    const SEED_COUNT02 = 30;
    const seeds: Seed[] = [];
    for (let i1 = 0; i1 < SEED_COUNT02; i1 += 1) {
      seeds.push({
        bx: rand() * CALC_W, by: rand() * CALC_H, x: 0, y: 0,
        phaseX: rand() * Math.PI * 2, phaseY: rand() * Math.PI * 2,
        c: earthPalette[i1 % earthPalette.length]
      });
    }
    function driftSeeds(t: number) {
      seeds.forEach((s) => {
        s.x = s.bx + Math.sin(t * DRIFT_FREQ + s.phaseX) * DRIFT_AMP;
        s.y = s.by + Math.cos(t * DRIFT_FREQ + s.phaseY) * DRIFT_AMP;
      });
    }
    const INK_RGB: [number, number, number] = [23, 20, 26];

    function renderField(t: number) {
      driftSeeds(t);
      const crackPulsePhase = 0.5 + 0.5 * Math.sin(t * PULSE_FREQ);
      let idx = 0;
      for (let y = 0; y < CALC_H; y += 1) {
        for (let x = 0; x < CALC_W; x += 1) {
          nearestTwo(x + 0.5, y + 0.5, seeds);
          const rgb = paletteRgb[seeds[NEI].c];
          const band = 0.85 + 0.15 * Math.sin(ND * 0.4 + NEI);
          const edge = ND2 - ND;
          let r: number, g: number, b: number;
          if (edge < CRACK_WIDTH_VALUE) {
            const m = 0.15 + 0.55 * crackPulsePhase;
            r = rgb[0] + (INK_RGB[0] - rgb[0]) * m;
            g = rgb[1] + (INK_RGB[1] - rgb[1]) * m;
            b = rgb[2] + (INK_RGB[2] - rgb[2]) * m;
          } else {
            r = rgb[0] * band; g = rgb[1] * band; b = rgb[2] * band;
          }
          offBuf[idx] = r; offBuf[idx + 1] = g; offBuf[idx + 2] = b; offBuf[idx + 3] = 255;
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
    let elapsed = reduce ? LOOP_MS * 0.25 : 0;
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
        <p className={styles.vd__caption}>경계선 두께 값이 마른 땅처럼 갈라지는 셀</p>

      </div>
    </main>
  );
}
