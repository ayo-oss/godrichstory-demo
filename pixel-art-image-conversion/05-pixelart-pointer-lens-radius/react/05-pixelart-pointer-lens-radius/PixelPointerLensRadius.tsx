import { useEffect, useRef } from "react";
import styles from "./PixelPointerLensRadius.module.scss";

export default function PixelPointerLensRadius() {
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

    function blockAverage(buf: Uint8ClampedArray, w: number, h: number, blockPx: number, outBuf: Uint8ClampedArray) {
      for (let by = 0; by < h; by += blockPx) {
        const bh = Math.min(blockPx, h - by);
        for (let bx = 0; bx < w; bx += blockPx) {
          const bw = Math.min(blockPx, w - bx);
          let rs = 0, gs = 0, bs = 0, count = 0;
          for (let y = 0; y < bh; y += 1) {
            for (let x = 0; x < bw; x += 1) {
              const idx = ((by + y) * w + (bx + x)) * 4;
              rs += buf[idx]; gs += buf[idx + 1]; bs += buf[idx + 2]; count += 1;
            }
          }
          const r = Math.round(rs / count), g = Math.round(gs / count), b = Math.round(bs / count);
          for (let y2 = 0; y2 < bh; y2 += 1) {
            for (let x2 = 0; x2 < bw; x2 += 1) {
              const idx2 = ((by + y2) * w + (bx + x2)) * 4;
              outBuf[idx2] = r; outBuf[idx2 + 1] = g; outBuf[idx2 + 2] = b; outBuf[idx2 + 3] = 255;
            }
          }
        }
      }
    }

    function lensCompose(bigBuf: Uint8ClampedArray, smallBuf: Uint8ClampedArray, w: number, h: number, px: number, py: number, radius: number, outBuf: Uint8ClampedArray) {
      const r2 = radius * radius;
      for (let y = 0; y < h; y += 1) {
        for (let x = 0; x < w; x += 1) {
          const idx = (y * w + x) * 4;
          const dx = x - px, dy = y - py;
          const src = (dx * dx + dy * dy) < r2 ? bigBuf : smallBuf;
          outBuf[idx] = src[idx]; outBuf[idx + 1] = src[idx + 1]; outBuf[idx + 2] = src[idx + 2]; outBuf[idx + 3] = 255;
        }
      }
    }

    const CALC_W = 160, CALC_H = 100;
    const LOOP_MS = 2000;
    const BASE_BLOCK_PX = 4;
    const LENS_BLOCK_PX = 20;
    const PIXEL_LENS_RADIUS_PX = 40;

    const off = document.createElement("canvas");
    off.width = CALC_W; off.height = CALC_H;
    const octx = off.getContext("2d") as CanvasRenderingContext2D;
    drawScene(octx, CALC_W, CALC_H, 415051);
    const baseImg = octx.getImageData(0, 0, CALC_W, CALC_H);
    const baseBuf = baseImg.data;

    const bigBuf = new Uint8ClampedArray(baseBuf.length);
    const smallBuf = new Uint8ClampedArray(baseBuf.length);
    blockAverage(baseBuf, CALC_W, CALC_H, LENS_BLOCK_PX, bigBuf);
    blockAverage(baseBuf, CALC_W, CALC_H, BASE_BLOCK_PX, smallBuf);

    const out = document.createElement("canvas");
    out.width = CALC_W; out.height = CALC_H;
    const outCtx = out.getContext("2d") as CanvasRenderingContext2D;
    const outImg = outCtx.createImageData(CALC_W, CALC_H);
    const outBuf = outImg.data;

    let pointerActive = false;
    let pointerX = CALC_W * 0.5, pointerY = CALC_H * 0.5;

    function toCalc(clientX: number, clientY: number): [number, number] {
      const rect = canvas!.getBoundingClientRect();
      const relX = (clientX - rect.left) / Math.max(1, rect.width);
      const relY = (clientY - rect.top) / Math.max(1, rect.height);
      return [relX * CALC_W, relY * CALC_H];
    }

    function onEnter() { pointerActive = true; }
    function onLeave() { pointerActive = false; }
    function onMove(ev: PointerEvent) {
      const p = toCalc(ev.clientX, ev.clientY);
      pointerX = p[0]; pointerY = p[1];
      if (reduce) draw(lastElapsed);
    }
    canvas.addEventListener("pointerenter", onEnter);
    canvas.addEventListener("pointerleave", onLeave);
    canvas.addEventListener("pointermove", onMove);

    function renderFrame(t: number) {
      let px: number, py: number;
      if (pointerActive) {
        px = pointerX; py = pointerY;
      } else {
        const a = t * Math.PI * 4 / LOOP_MS;
        px = CALC_W * 0.5 + Math.cos(a) * CALC_W * 0.28;
        py = CALC_H * 0.5 + Math.sin(a) * CALC_H * 0.3;
      }
      lensCompose(bigBuf, smallBuf, CALC_W, CALC_H, px, py, PIXEL_LENS_RADIUS_PX, outBuf);
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
      canvas!.removeEventListener("pointerenter", onEnter);
      canvas!.removeEventListener("pointerleave", onLeave);
      canvas!.removeEventListener("pointermove", onMove);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={`${styles.vd} is-demo`} ref={rootRef}>
        <canvas className={styles.vd__canvas} ref={canvasRef} width={480} height={300} />
        <p className={styles.vd__caption}>포인터 반경 안쪽만 커지는 도트 렌즈</p>
      </div>
    </main>
  );
}
