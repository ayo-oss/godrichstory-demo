import { useEffect, useRef } from "react";
import styles from "./VoronoiEdgeNetworkGlow.module.scss";

export default function VoronoiEdgeNetworkGlow() {
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
    const EDGE_GLOW_WIDTH = 3.4;
    const DRIFT_AMP = 8;
    const DRIFT_FREQ = (Math.PI * 2) / LOOP_MS;

    function seedRand(seed: number) {
      let s = seed >>> 0;
      return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    }
    const rand = seedRand(409061);

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
    const glowPalette = ["#6ec8ff", "#5b8cf8", "#4cd4a6", "#b9a0ff"];
    const paletteRgb: Record<string, [number, number, number]> = {};
    glowPalette.forEach((h) => { paletteRgb[h] = hexToRgb(h); });
    const SEED_COUNT06 = 28;
    const seeds: Seed[] = [];
    for (let i6 = 0; i6 < SEED_COUNT06; i6 += 1) {
      seeds.push({
        bx: rand() * CALC_W, by: rand() * CALC_H, x: 0, y: 0,
        phaseX: rand() * Math.PI * 2, phaseY: rand() * Math.PI * 2,
        c: glowPalette[i6 % glowPalette.length]
      });
    }
    function driftSeeds(t: number) {
      seeds.forEach((s) => {
        s.x = s.bx + Math.sin(t * DRIFT_FREQ + s.phaseX) * DRIFT_AMP;
        s.y = s.by + Math.cos(t * DRIFT_FREQ + s.phaseY) * DRIFT_AMP;
      });
    }
    const BG_RGB: [number, number, number] = [24, 22, 30];

    function renderField(t: number) {
      driftSeeds(t);
      let idx = 0;
      for (let y = 0; y < CALC_H; y += 1) {
        for (let x = 0; x < CALC_W; x += 1) {
          nearestTwo(x + 0.5, y + 0.5, seeds);
          const edge = ND2 - ND;
          let r: number, g: number, b: number;
          if (edge < EDGE_GLOW_WIDTH) {
            const glowT = 1 - edge / EDGE_GLOW_WIDTH;
            const rgb = paletteRgb[seeds[NEI].c];
            r = BG_RGB[0] + (rgb[0] - BG_RGB[0]) * glowT;
            g = BG_RGB[1] + (rgb[1] - BG_RGB[1]) * glowT;
            b = BG_RGB[2] + (rgb[2] - BG_RGB[2]) * glowT;
          } else {
            r = BG_RGB[0]; g = BG_RGB[1]; b = BG_RGB[2];
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
        <p className={styles.vd__caption}>경계선만 남아 빛나는 네트워크 셀</p>

      </div>
    </main>
  );
}
