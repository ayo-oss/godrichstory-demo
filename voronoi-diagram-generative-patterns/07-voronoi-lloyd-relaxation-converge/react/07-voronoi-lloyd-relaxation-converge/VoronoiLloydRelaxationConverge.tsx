import { useEffect, useRef, useState } from "react";
import styles from "./VoronoiLloydRelaxationConverge.module.scss";

export default function VoronoiLloydRelaxationConverge() {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stepLabel, setStepLabel] = useState("정리 진행 0/6");

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    if (!root || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const wrap = canvas.parentElement as HTMLElement;

    const CALC_W = 160, CALC_H = 100;
    const LOOP_MS = 2000;
    const LLOYD_RELAXATION_STEPS = 6;

    function seedRand(seed: number) {
      let s = seed >>> 0;
      return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    }
    const rand = seedRand(409071);

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
    const relaxPalette = ["#2f6df6", "#ff9ebb", "#4cd4a6", "#b9a0ff", "#6ec8ff", "#fff7e6"];
    const paletteRgb: Record<string, [number, number, number]> = {};
    relaxPalette.forEach((h) => { paletteRgb[h] = hexToRgb(h); });
    const SEED_COUNT07 = 22;
    const baseSeeds: Seed[] = [];
    for (let i7 = 0; i7 < SEED_COUNT07; i7 += 1) {
      baseSeeds.push({ x: rand() * CALC_W, y: rand() * CALC_H, c: relaxPalette[i7 % relaxPalette.length] });
    }

    function computeCentroids(positions: Seed[]): Seed[] {
      const sumX = new Array(positions.length).fill(0);
      const sumY = new Array(positions.length).fill(0);
      const cnt = new Array(positions.length).fill(0);
      for (let y = 0; y < CALC_H; y += 1) {
        for (let x = 0; x < CALC_W; x += 1) {
          nearestTwo(x + 0.5, y + 0.5, positions);
          sumX[NEI] += x + 0.5; sumY[NEI] += y + 0.5; cnt[NEI] += 1;
        }
      }
      return positions.map((p, i) => {
        if (!cnt[i]) return { x: p.x, y: p.y, c: p.c };
        return { x: sumX[i] / cnt[i], y: sumY[i] / cnt[i], c: p.c };
      });
    }

    const relaxationStates: Seed[][] = [baseSeeds];
    (function buildStates() {
      let cur = baseSeeds;
      for (let k = 0; k < LLOYD_RELAXATION_STEPS; k += 1) {
        cur = computeCentroids(cur);
        relaxationStates.push(cur);
      }
    })();

    const stepLabels = ["정리 진행 0/6", "정리 진행 1/6", "정리 진행 2/6", "정리 진행 3/6", "정리 진행 4/6", "정리 진행 5/6", "정리 진행 6/6"];

    function renderField(t: number) {
      const frac = (t % LOOP_MS) / LOOP_MS;
      const segFloat = frac * LLOYD_RELAXATION_STEPS;
      const seg = Math.min(LLOYD_RELAXATION_STEPS - 1, Math.floor(segFloat));
      const local = segFloat - seg;
      const a = relaxationStates[seg], b = relaxationStates[seg + 1];
      const cur: Seed[] = a.map((p, i) => ({
        x: p.x + (b[i].x - p.x) * local, y: p.y + (b[i].y - p.y) * local, c: p.c
      }));
      let idx = 0;
      for (let y = 0; y < CALC_H; y += 1) {
        for (let x = 0; x < CALC_W; x += 1) {
          nearestTwo(x + 0.5, y + 0.5, cur);
          const rgb = paletteRgb[cur[NEI].c];
          const edge = ND2 - ND;
          const dark = edge < 1.5 ? 0.5 + edge / 3 : 1;
          offBuf[idx] = rgb[0] * dark; offBuf[idx + 1] = rgb[1] * dark; offBuf[idx + 2] = rgb[2] * dark; offBuf[idx + 3] = 255;
          idx += 4;
        }
      }
      setStepLabel(stepLabels[Math.min(LLOYD_RELAXATION_STEPS, seg + (local > 0.5 ? 1 : 0))]);
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
    let elapsed = reduce ? LOOP_MS * 0.97 : 0;
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
        <p className={styles.vd__caption}>반복 횟수 값이 늘수록 고르게 정돈되는 셀</p>
        <p className={styles.vd__step}>{stepLabel}</p>
      </div>
    </main>
  );
}
