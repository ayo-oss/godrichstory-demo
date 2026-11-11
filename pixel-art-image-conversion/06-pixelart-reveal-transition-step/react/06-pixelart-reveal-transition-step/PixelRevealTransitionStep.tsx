import { useEffect, useRef } from "react";
import styles from "./PixelRevealTransitionStep.module.scss";

export default function PixelRevealTransitionStep() {
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

    const REVEAL_STEPS = [28, 20, 14, 9, 5, 2];
    const STEP_DURATION_MS = 160;
    const CALC_W = 160, CALC_H = 100;
    const LOOP_MS = 2000;

    const off = document.createElement("canvas");
    off.width = CALC_W; off.height = CALC_H;
    const octx = off.getContext("2d") as CanvasRenderingContext2D;
    drawScene(octx, CALC_W, CALC_H, 415061);
    const baseImg = octx.getImageData(0, 0, CALC_W, CALC_H);
    const baseBuf = baseImg.data;

    const out = document.createElement("canvas");
    out.width = CALC_W; out.height = CALC_H;
    const outCtx = out.getContext("2d") as CanvasRenderingContext2D;
    const outImg = outCtx.createImageData(CALC_W, CALC_H);
    const outBuf = outImg.data;

    let replayStart = 0;

    function stepIndexAt(sinceStart: number) {
      const cycleMs = REVEAL_STEPS.length * STEP_DURATION_MS;
      const pos = sinceStart % cycleMs;
      return Math.min(REVEAL_STEPS.length - 1, Math.floor(pos / STEP_DURATION_MS));
    }

    function renderFrame(t: number) {
      let sinceStart = t - replayStart;
      if (sinceStart < 0) sinceStart += LOOP_MS;
      const idx = stepIndexAt(sinceStart);
      blockAverage(baseBuf, CALC_W, CALC_H, REVEAL_STEPS[idx], outBuf);
    }

    function onDown() {
      replayStart = lastElapsed;
      if (reduce) draw(lastElapsed);
    }
    canvas.addEventListener("pointerdown", onDown);

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
      canvas!.removeEventListener("pointerdown", onDown);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={`${styles.vd} is-demo`} ref={rootRef}>
        <canvas className={styles.vd__canvas} ref={canvasRef} width={480} height={300} />
        <p className={styles.vd__caption}>블록 크기가 단계로 줄어드는 도트 리빌</p>
      </div>
    </main>
  );
}
