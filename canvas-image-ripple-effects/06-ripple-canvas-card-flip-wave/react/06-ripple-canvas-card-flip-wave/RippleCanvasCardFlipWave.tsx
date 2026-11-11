import { useEffect, useRef } from "react";
import styles from "./RippleCanvasCardFlipWave.module.scss";

export default function RippleCanvasCardFlipWave() {
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

    function drawPhotoBase(pctx: CanvasRenderingContext2D, w: number, h: number, seed: number, palette: [string, string, string, string, string[]]) {
      const rand = seedRand(seed);
      const sky = pctx.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, palette[0]);
      sky.addColorStop(1, palette[1]);
      pctx.fillStyle = sky;
      pctx.fillRect(0, 0, w, h);
      const sunX = w * 0.35, sunY = h * 0.25, sunR = h * 0.15;
      const glow = pctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunR * 2.5);
      glow.addColorStop(0, palette[2]);
      glow.addColorStop(1, "rgba(255,255,255,0)");
      pctx.fillStyle = glow;
      pctx.fillRect(0, 0, w, h);
      pctx.beginPath();
      pctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
      pctx.fillStyle = palette[3];
      pctx.fill();
      const bands = palette[4];
      for (let i = 0; i < bands.length; i += 1) {
        const baseY = h * (0.5 + i * 0.14);
        pctx.beginPath();
        pctx.moveTo(0, h);
        const step = Math.max(2, w / 24);
        for (let x = 0; x <= w; x += step) {
          const n = Math.sin(x * 0.06 + i * 2 + seed * 0.0003) * h * 0.04;
          pctx.lineTo(x, baseY + n);
        }
        pctx.lineTo(w, h);
        pctx.closePath();
        pctx.fillStyle = bands[i];
        pctx.fill();
      }
      for (let k = 0; k < 48; k += 1) {
        const px = rand() * w, py = rand() * h * 0.5, r = rand() * 1.1 + 0.3;
        pctx.beginPath();
        pctx.arc(px, py, r, 0, Math.PI * 2);
        pctx.fillStyle = "rgba(255,255,255," + (0.1 + rand() * 0.2) + ")";
        pctx.fill();
      }
    }

    const CALC_W = 160, CALC_H = 100;
    const CARD_FLIP_MS = 900;
    const FRONT_BAND = 9;

    function makeBase(seed: number, palette: [string, string, string, string, string[]]) {
      const c = document.createElement("canvas");
      c.width = CALC_W; c.height = CALC_H;
      const cx = c.getContext("2d") as CanvasRenderingContext2D;
      drawPhotoBase(cx, CALC_W, CALC_H, seed, palette);
      return cx.getImageData(0, 0, CALC_W, CALC_H).data;
    }

    const bufFront = makeBase(419061, ["#ffe3b0", "#fff8ea", "rgba(255,255,255,.85)", "#ffcf6b", ["#f0a35a", "#c76b34", "#6a331a"]]);
    const bufBack = makeBase(419062, ["#c9e8ff", "#eaf6ff", "rgba(255,255,255,.8)", "#9fd4ff", ["#5fa8d9", "#2f6fa8", "#173a5c"]]);

    const out = document.createElement("canvas");
    out.width = CALC_W; out.height = CALC_H;
    const outCtx = out.getContext("2d") as CanvasRenderingContext2D;
    const outImg = outCtx.createImageData(CALC_W, CALC_H);
    const outBuf = outImg.data;

    function sampleAt(buf: Uint8ClampedArray, sx: number, sy: number): [number, number, number] {
      sx = sx < 0 ? 0 : (sx > CALC_W - 1 ? CALC_W - 1 : sx);
      sy = sy < 0 ? 0 : (sy > CALC_H - 1 ? CALC_H - 1 : sy);
      const i = (Math.round(sy) * CALC_W + Math.round(sx)) * 4;
      return [buf[i], buf[i + 1], buf[i + 2]];
    }

    let progress = 0;
    let target = 0;

    function renderFrame(t: number) {
      const frontX = progress * (CALC_W + FRONT_BAND * 2) - FRONT_BAND;
      let idx = 0;
      for (let y = 0; y < CALC_H; y += 1) {
        const wobble = Math.sin(y * 0.45 + t * 0.01) * 3.2;
        const localFront = frontX + wobble;
        for (let x = 0; x < CALC_W; x += 1) {
          let rgb: number[];
          const d = x - localFront;
          if (d < -FRONT_BAND) {
            rgb = sampleAt(bufBack, x, y);
          } else if (d > FRONT_BAND) {
            rgb = sampleAt(bufFront, x, y);
          } else {
            const m = (d + FRONT_BAND) / (FRONT_BAND * 2);
            const a = sampleAt(bufFront, x, y);
            const b = sampleAt(bufBack, x, y);
            rgb = [a[0] + (b[0] - a[0]) * m, a[1] + (b[1] - a[1]) * m, a[2] + (b[2] - a[2]) * m];
            const shine = (1 - Math.abs(m - 0.5) * 2) * 34;
            rgb = [rgb[0] + shine, rgb[1] + shine, rgb[2] + shine];
          }
          outBuf[idx] = Math.max(0, Math.min(255, rgb[0]));
          outBuf[idx + 1] = Math.max(0, Math.min(255, rgb[1]));
          outBuf[idx + 2] = Math.max(0, Math.min(255, rgb[2]));
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
    if (reduce) { root.classList.remove("is-demo"); }

    function toggleFlip() {
      target = target === 0 ? 1 : 0;
      if (reduce) { progress = target; draw(lastElapsed); }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleFlip(); }
    }
    wrap.addEventListener("click", toggleFlip);
    wrap.addEventListener("keydown", onKeyDown);
    wrap.tabIndex = 0;

    const AUTO_CYCLE_MS = 2600;
    let lastAutoMs = -9999;
    function maybeAutoFlip(t: number) {
      if (t - lastAutoMs > AUTO_CYCLE_MS) {
        target = target === 0 ? 1 : 0;
        lastAutoMs = t;
      }
    }

    let lastTs: number | null = null;
    let elapsed = 0;
    let raf = 0;
    function tick(ts: number) {
      if (lastTs === null) lastTs = ts;
      const dt = ts - lastTs;
      lastTs = ts;
      if (playing) {
        elapsed += dt;
        maybeAutoFlip(elapsed);
        const step = dt / CARD_FLIP_MS;
        if (progress < target) progress = Math.min(target, progress + step);
        else if (progress > target) progress = Math.max(target, progress - step);
        draw(elapsed);
      }
      raf = requestAnimationFrame(tick);
    }
    fit();
    window.addEventListener("resize", fit);
    draw(elapsed);
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", fit);
      wrap.removeEventListener("click", toggleFlip);
      wrap.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={`${styles.rv} is-demo`} ref={rootRef} tabIndex={0}>
        <canvas className={styles.rv__canvas} ref={canvasRef} width={480} height={300} />
        <p className={styles.rv__caption}>클릭하면 물결 전선이 화면을 가로지르며 지나간 자리부터 뒷면 이미지로 뒤집힌다</p>
      </div>
    </main>
  );
}
