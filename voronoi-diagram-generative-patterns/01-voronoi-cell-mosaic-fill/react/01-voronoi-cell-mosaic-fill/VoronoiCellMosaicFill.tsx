import { useEffect, useRef } from "react";
import styles from "./VoronoiCellMosaicFill.module.scss";

export default function VoronoiCellMosaicFill() {
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
    const VORONOI_SEED_COUNT = 24;
    const DRIFT_AMP = 9;
    const DRIFT_FREQ = (Math.PI * 2) / LOOP_MS;

    function seedRand(seed: number) {
      let s = seed >>> 0;
      return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    }
    const rand = seedRand(409011);

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
    const mosaicPalette = ["#2f6df6", "#ff9ebb", "#4cd4a6", "#b9a0ff", "#6ec8ff", "#fff7e6"];
    const paletteRgb: Record<string, [number, number, number]> = {};
    mosaicPalette.forEach((h) => { paletteRgb[h] = hexToRgb(h); });
    const seeds: Seed[] = [];
    for (let i0 = 0; i0 < VORONOI_SEED_COUNT; i0 += 1) {
      seeds.push({
        bx: rand() * CALC_W, by: rand() * CALC_H, x: 0, y: 0,
        phaseX: rand() * Math.PI * 2, phaseY: rand() * Math.PI * 2,
        c: mosaicPalette[i0 % mosaicPalette.length]
      });
    }
    function driftSeeds(t: number) {
      seeds.forEach((s) => {
        s.x = s.bx + Math.sin(t * DRIFT_FREQ + s.phaseX) * DRIFT_AMP;
        s.y = s.by + Math.cos(t * DRIFT_FREQ * 0.8 + s.phaseY) * DRIFT_AMP;
      });
    }

    function renderField(t: number) {
      driftSeeds(t);
      let idx = 0;
      for (let y = 0; y < CALC_H; y += 1) {
        for (let x = 0; x < CALC_W; x += 1) {
          nearestTwo(x + 0.5, y + 0.5, seeds);
          const rgb = paletteRgb[seeds[NEI].c];
          const edge = ND2 - ND;
          const dark = edge < 1.5 ? 0.5 + edge / 3 : 1;
          offBuf[idx] = rgb[0] * dark;
          offBuf[idx + 1] = rgb[1] * dark;
          offBuf[idx + 2] = rgb[2] * dark;
          offBuf[idx + 3] = 255;
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
        <p className={styles.vd__caption}>시드 개수 값만큼 색이 채워지는 모자이크 셀</p>

      </div>
    </main>
  );
}
