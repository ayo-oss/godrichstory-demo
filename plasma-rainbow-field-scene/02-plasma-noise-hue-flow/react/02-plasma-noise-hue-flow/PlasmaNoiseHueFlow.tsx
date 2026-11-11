import { useEffect, useRef } from "react";
import styles from "./PlasmaNoiseHueFlow.module.scss";

export default function PlasmaNoiseHueFlow() {
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
    const PLASMA_NOISE_SCALE = 40;
    const PLASMA_FLOW_SPEED = 0.55;

    function seedRand(seed: number) {
      let s = seed >>> 0;
      return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    }

    function hslToRgb(h: number, s: number, l: number): [number, number, number] {
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
      return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
    }

    const NOISE_DIM = 34;
    const noiseRand = seedRand(417021);
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
    const offImg = octx.createImageData(CALC_W, CALC_H);
    const offBuf = offImg.data;

    function renderField(t: number) {
      const tt = (t / LOOP_MS) * PLASMA_FLOW_SPEED;
      let idx = 0;
      for (let y = 0; y < CALC_H; y += 1) {
        for (let x = 0; x < CALC_W; x += 1) {
          const n1 = valueNoise2D(x / PLASMA_NOISE_SCALE + tt, y / PLASMA_NOISE_SCALE);
          const n2 = valueNoise2D((x / PLASMA_NOISE_SCALE) * 2.3 + 5 - tt * 0.7, (y / PLASMA_NOISE_SCALE) * 2.3 + 5);
          const hue = (n1 * 220 + n2 * 140 + tt * 30 * LOOP_MS) % 360;
          const light = 0.38 + n2 * 0.22;
          const rgb = hslToRgb(hue, 0.68, light);
          offBuf[idx] = rgb[0]; offBuf[idx + 1] = rgb[1]; offBuf[idx + 2] = rgb[2]; offBuf[idx + 3] = 255;
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
      <div className={`${styles.pv} is-demo`} ref={rootRef}>
        <canvas className={styles.pv__canvas} ref={canvasRef} width={480} height={300} />
        <p className={styles.pv__caption}>노이즈 스케일 값이 색을 구름처럼 흘려보내는 배경</p>
      </div>
    </main>
  );
}
