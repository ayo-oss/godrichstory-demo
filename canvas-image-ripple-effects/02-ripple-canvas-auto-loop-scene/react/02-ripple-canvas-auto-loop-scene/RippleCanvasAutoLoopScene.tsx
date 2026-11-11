import { useEffect, useRef } from "react";
import styles from "./RippleCanvasAutoLoopScene.module.scss";

export default function RippleCanvasAutoLoopScene() {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    if (!root || !canvas) return;
    const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
    const wrap = canvas.parentElement as HTMLElement;

    function seedRand(seed: number) {
      let s = seed >>> 0;
      return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    }

    function drawPhotoBase(pctx: CanvasRenderingContext2D, w: number, h: number, seed: number) {
      const rand = seedRand(seed);
      const sky = pctx.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, "#ffe6a8");
      sky.addColorStop(1, "#fff8ea");
      pctx.fillStyle = sky;
      pctx.fillRect(0, 0, w, h);
      const sunX = w * 0.24, sunY = h * 0.28, sunR = h * 0.17;
      const glow = pctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunR * 2.4);
      glow.addColorStop(0, "rgba(255,255,255,.85)");
      glow.addColorStop(1, "rgba(255,255,255,0)");
      pctx.fillStyle = glow;
      pctx.fillRect(0, 0, w, h);
      pctx.beginPath();
      pctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
      pctx.fillStyle = "#fff3c9";
      pctx.fill();
      const hillColors = ["#f3b25a", "#c9713a", "#6a3420"];
      for (let i = 0; i < hillColors.length; i += 1) {
        const baseY = h * (0.5 + i * 0.14);
        pctx.beginPath();
        pctx.moveTo(0, h);
        const step = Math.max(2, w / 24);
        for (let x = 0; x <= w; x += step) {
          const n = Math.sin(x * 0.05 + i * 1.7 + seed * 0.0002) * h * 0.04 + Math.sin(x * 0.14 + i) * h * 0.02;
          pctx.lineTo(x, baseY + n);
        }
        pctx.lineTo(w, h);
        pctx.closePath();
        pctx.fillStyle = hillColors[i];
        pctx.fill();
      }
      for (let k = 0; k < 55; k += 1) {
        const px = rand() * w, py = rand() * h * 0.5, r = rand() * 1.2 + 0.3;
        pctx.beginPath();
        pctx.arc(px, py, r, 0, Math.PI * 2);
        pctx.fillStyle = "rgba(255,255,255," + (0.1 + rand() * 0.2) + ")";
        pctx.fill();
      }
    }

    const CALC_W = 160, CALC_H = 100;
    const RIPPLE_AMBIENT_WAVE_COUNT = 2;
    const REFRACT_K = 1.15;

    const off = document.createElement("canvas");
    off.width = CALC_W; off.height = CALC_H;
    const octx = off.getContext("2d") as CanvasRenderingContext2D;
    drawPhotoBase(octx, CALC_W, CALC_H, 419021);
    const baseBuf = octx.getImageData(0, 0, CALC_W, CALC_H).data;

    const out = document.createElement("canvas");
    out.width = CALC_W; out.height = CALC_H;
    const outCtx = out.getContext("2d") as CanvasRenderingContext2D;
    const outImg = outCtx.createImageData(CALC_W, CALC_H);
    const outBuf = outImg.data;

    function ambientHeight(x: number, y: number, t: number) {
      let h = 0;
      for (let i = 0; i < RIPPLE_AMBIENT_WAVE_COUNT; i += 1) {
        const ang = (i / RIPPLE_AMBIENT_WAVE_COUNT) * Math.PI + 0.5;
        const freq = 0.05 + i * 0.021;
        const speed = 0.0017 + i * 0.0009;
        const amp = 6.5 / (i + 1);
        const dir = (i % 2 === 0) ? 1 : -1;
        h += amp * Math.sin(x * Math.cos(ang) * freq + y * Math.sin(ang) * freq + t * speed * dir);
      }
      return h;
    }

    function sampleBase(sx: number, sy: number): [number, number, number] {
      sx = sx < 0 ? 0 : (sx > CALC_W - 1 ? CALC_W - 1 : sx);
      sy = sy < 0 ? 0 : (sy > CALC_H - 1 ? CALC_H - 1 : sy);
      const i = (Math.round(sy) * CALC_W + Math.round(sx)) * 4;
      return [baseBuf[i], baseBuf[i + 1], baseBuf[i + 2]];
    }

    function renderFrame(t: number) {
      let idx = 0;
      for (let y = 0; y < CALC_H; y += 1) {
        for (let x = 0; x < CALC_W; x += 1) {
          const h0 = ambientHeight(x, y, t);
          const hx = ambientHeight(x + 1, y, t) - ambientHeight(x - 1, y, t);
          const hy = ambientHeight(x, y + 1, t) - ambientHeight(x, y - 1, t);
          const dx = hx * REFRACT_K, dy = hy * REFRACT_K;
          const rgb = sampleBase(x + dx, y + dy);
          const shine = Math.max(-26, Math.min(46, h0 * 4));
          outBuf[idx] = Math.max(0, Math.min(255, rgb[0] + shine));
          outBuf[idx + 1] = Math.max(0, Math.min(255, rgb[1] + shine));
          outBuf[idx + 2] = Math.max(0, Math.min(255, rgb[2] + shine));
          outBuf[idx + 3] = 255;
          idx += 4;
        }
      }
    }

    let cw = 480, ch = 300;
    let lastElapsed = 0;
    function draw(t: number) {
      lastElapsed = t;
      renderFrame(t);
      outCtx.putImageData(outImg, 0, 0);
      ctx.clearRect(0, 0, cw, ch);
      ctx.drawImage(out, 0, 0, CALC_W, CALC_H, 0, 0, cw, ch);
    }

    function fit() {
      const r = wrap.getBoundingClientRect();
      cw = Math.max(1, Math.round(r.width));
      ch = Math.max(1, Math.round(r.height));
      canvas!.width = cw; canvas!.height = ch;
      draw(lastElapsed);
    }

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const playing = !reduce;
    let elapsed = reduce ? 900 : 0;
    if (reduce) { root.classList.remove("is-demo"); }

    let lastTs: number | null = null;
    let raf = 0;
    function tick(ts: number) {
      if (lastTs === null) lastTs = ts;
      const dt = ts - lastTs;
      lastTs = ts;
      if (playing) { elapsed += dt; }
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
      <div className={`${styles.rv} is-demo`} ref={rootRef}>
        <canvas className={styles.rv__canvas} ref={canvasRef} width={480} height={300} />
        <p className={styles.rv__caption}>사용자 조작 없이도 사인파가 겹쳐 이미지 표면이 잔잔하게 계속 일렁인다</p>
      </div>
    </main>
  );
}
