import { useEffect, useRef } from "react";
import styles from "./PixelDitherDiffuse.module.scss";

export default function PixelDitherDiffuse() {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    if (!root || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const wrap = canvas.parentElement as HTMLElement;

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
      for (let k = 0; k < 60; k += 1) {
        const px = rand() * w, py = rand() * h * 0.5, r = rand() * 1.3 + 0.3;
        pctx.beginPath();
        pctx.arc(px, py, r, 0, Math.PI * 2);
        pctx.fillStyle = "rgba(255,255,255," + (0.12 + rand() * 0.22) + ")";
        pctx.fill();
      }
    }

    function diffuseError(buf: Uint8ClampedArray, w: number, h: number, levels: number, outBuf: Uint8ClampedArray) {
      const work = new Float32Array(w * h * 3);
      for (let i = 0, j = 0; i < w * h; i += 1, j += 3) {
        work[j] = buf[i * 4]; work[j + 1] = buf[i * 4 + 1]; work[j + 2] = buf[i * 4 + 2];
      }
      const step = 255 / (levels - 1);
      const rowStride = w * 3;
      for (let y = 0; y < h; y += 1) {
        for (let x = 0; x < w; x += 1) {
          const idx = (y * w + x) * 3;
          for (let c = 0; c < 3; c += 1) {
            const old = work[idx + c];
            const q = Math.max(0, Math.min(255, Math.round(Math.round(old / step) * step)));
            const err = old - q;
            work[idx + c] = q;
            if (x + 1 < w) work[idx + 3 + c] += err * 7 / 16;
            if (y + 1 < h) {
              if (x > 0) work[idx + rowStride - 3 + c] += err * 3 / 16;
              work[idx + rowStride + c] += err * 5 / 16;
              if (x + 1 < w) work[idx + rowStride + 3 + c] += err * 1 / 16;
            }
          }
        }
      }
      for (let p = 0, q2 = 0; p < w * h; p += 1, q2 += 3) {
        const o = p * 4;
        outBuf[o] = work[q2]; outBuf[o + 1] = work[q2 + 1]; outBuf[o + 2] = work[q2 + 2]; outBuf[o + 3] = 255;
      }
    }

    const CALC_W = 160, CALC_H = 100;
    const LOOP_MS = 2000;
    const DITHER_LEVELS = 3;

    const off = document.createElement("canvas");
    off.width = CALC_W; off.height = CALC_H;
    const octx = off.getContext("2d") as CanvasRenderingContext2D;
    drawScene(octx, CALC_W, CALC_H, 415031);
    const baseImg = octx.getImageData(0, 0, CALC_W, CALC_H);
    const baseBuf = baseImg.data;

    const out = document.createElement("canvas");
    out.width = CALC_W; out.height = CALC_H;
    const outCtx = out.getContext("2d") as CanvasRenderingContext2D;
    const outImg = outCtx.createImageData(CALC_W, CALC_H);
    const outBuf = outImg.data;

    function renderFrame(t: number) {
      const wave = Math.sin(t * Math.PI * 4 / LOOP_MS);
      const levels = Math.max(2, DITHER_LEVELS + wave * 2);
      diffuseError(baseBuf, CALC_W, CALC_H, levels, outBuf);
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
        <p className={styles.vd__caption}>오차를 이웃 화소로 퍼뜨리는 디더링</p>
      </div>
    </main>
  );
}
