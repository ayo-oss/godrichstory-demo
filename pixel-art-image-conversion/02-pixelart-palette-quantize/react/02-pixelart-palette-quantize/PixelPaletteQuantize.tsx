import { useEffect, useRef } from "react";
import styles from "./PixelPaletteQuantize.module.scss";

export default function PixelPaletteQuantize() {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rangeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    if (!root || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const wrap = canvas.parentElement as HTMLElement;
    const range = rangeRef.current;

    function seedRand(seed: number) {
      let s = seed >>> 0;
      return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    }

    function drawScene(pctx: CanvasRenderingContext2D, w: number, h: number, seed: number) {
      const rand = seedRand(seed);
      const sky = pctx.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, "#8fc7ff");
      sky.addColorStop(1, "#fff2d6");
      pctx.fillStyle = sky;
      pctx.fillRect(0, 0, w, h);
      const sunX = w * 0.72, sunY = h * 0.28, sunR = h * 0.2;
      const glow = pctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunR * 2.4);
      glow.addColorStop(0, "rgba(255,247,230,.9)");
      glow.addColorStop(1, "rgba(255,247,230,0)");
      pctx.fillStyle = glow;
      pctx.fillRect(0, 0, w, h);
      pctx.beginPath();
      pctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
      pctx.fillStyle = "#ffe27a";
      pctx.fill();
      const hillColors = ["#6ec8ff", "#2b9d74", "#17141a"];
      for (let i = 0; i < 3; i += 1) {
        const baseY = h * (0.48 + i * 0.16);
        pctx.beginPath();
        pctx.moveTo(0, h);
        const step = Math.max(2, w / 24);
        for (let x = 0; x <= w; x += step) {
          const n = Math.sin(x * 0.06 + i * 2.4 + seed * 0.0003) * h * 0.05 + Math.sin(x * 0.17 + i) * h * 0.02;
          pctx.lineTo(x, baseY + n);
        }
        pctx.lineTo(w, h);
        pctx.closePath();
        pctx.fillStyle = hillColors[i];
        pctx.fill();
      }
      const accent = ["#ff5c8a", "#2fe6c6", "#ffb703", "#8a5cd6", "#3ddc97", "#ff7a5e"];
      for (let m = 0; m < 8; m += 1) {
        const ax = rand() * w, ay = h * (0.56 + rand() * 0.38), ar = h * (0.025 + rand() * 0.05);
        pctx.beginPath();
        pctx.arc(ax, ay, ar, 0, Math.PI * 2);
        pctx.fillStyle = accent[m % accent.length];
        pctx.fill();
      }
      for (let k = 0; k < 60; k += 1) {
        const px = rand() * w, py = rand() * h * 0.5, r = rand() * 1.3 + 0.3;
        pctx.beginPath();
        pctx.arc(px, py, r, 0, Math.PI * 2);
        pctx.fillStyle = "rgba(255,255,255," + (0.12 + rand() * 0.22) + ")";
        pctx.fill();
      }
    }

    const PALETTE_HEX = ["#17141a", "#2f6df6", "#ff4d1f", "#ffd23f", "#ffffff", "#2b9d74", "#ff5c8a", "#8a5cd6", "#3ddc97", "#ff7a5e", "#6ec8ff", "#c93000", "#fff7e6", "#0a4fe8", "#2fe6c6", "#b02860"];
    function hexToRgb(hex: string): [number, number, number] {
      const n = parseInt(hex.slice(1), 16);
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    }
    const PALETTE_RGB = PALETTE_HEX.map(hexToRgb);

    function nearestPaletteColor(r: number, g: number, b: number, count: number) {
      let best = 0, bd = Infinity;
      for (let i = 0; i < count; i += 1) {
        const p = PALETTE_RGB[i];
        const dr = r - p[0], dg = g - p[1], db = b - p[2];
        const d = dr * dr + dg * dg + db * db;
        if (d < bd) { bd = d; best = i; }
      }
      return PALETTE_RGB[best];
    }

    function quantizePalette(buf: Uint8ClampedArray, w: number, h: number, count: number, outBuf: Uint8ClampedArray) {
      for (let i = 0; i < w * h; i += 1) {
        const idx = i * 4;
        const c = nearestPaletteColor(buf[idx], buf[idx + 1], buf[idx + 2], count);
        outBuf[idx] = c[0]; outBuf[idx + 1] = c[1]; outBuf[idx + 2] = c[2]; outBuf[idx + 3] = 255;
      }
    }

    const CALC_W = 160, CALC_H = 100;
    const LOOP_MS = 2000;
    const PALETTE_COLOR_COUNT = 6;

    const off = document.createElement("canvas");
    off.width = CALC_W; off.height = CALC_H;
    const octx = off.getContext("2d") as CanvasRenderingContext2D;
    drawScene(octx, CALC_W, CALC_H, 415021);
    const baseImg = octx.getImageData(0, 0, CALC_W, CALC_H);
    const baseBuf = baseImg.data;

    const out = document.createElement("canvas");
    out.width = CALC_W; out.height = CALC_H;
    const outCtx = out.getContext("2d") as CanvasRenderingContext2D;
    const outImg = outCtx.createImageData(CALC_W, CALC_H);
    const outBuf = outImg.data;

    let userCount = PALETTE_COLOR_COUNT;
    if (range) {
      range.value = String(userCount);
      range.addEventListener("input", function () {
        userCount = Number(range.value);
        if (reduce) draw(lastElapsed);
      });
    }

    function renderFrame(t: number) {
      const wave = Math.sin(t * Math.PI * 4 / LOOP_MS) * 5;
      const count = Math.max(2, Math.min(16, Math.round(userCount + wave)));
      quantizePalette(baseBuf, CALC_W, CALC_H, count, outBuf);
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
      renderFrame(elapsed);
      outCtx.putImageData(outImg, 0, 0);
      ctx!.imageSmoothingEnabled = false;
      ctx!.clearRect(0, 0, cw, ch);
      ctx!.drawImage(out, 0, 0, CALC_W, CALC_H, 0, 0, cw, ch);
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
        <input className={styles.vd__range} ref={rangeRef} type="range" min={2} max={16} defaultValue={6} step={1} aria-label="palette color count" />
        <p className={styles.vd__caption}>팔레트 색 수를 조절하는 색상 양자화</p>
      </div>
    </main>
  );
}
