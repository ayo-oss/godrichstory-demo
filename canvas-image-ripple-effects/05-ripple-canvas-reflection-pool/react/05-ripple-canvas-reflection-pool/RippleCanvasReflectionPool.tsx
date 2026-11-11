import { useEffect, useRef } from "react";
import styles from "./RippleCanvasReflectionPool.module.scss";

export default function RippleCanvasReflectionPool() {
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
      sky.addColorStop(0, "#274b7a");
      sky.addColorStop(1, "#6f9fd6");
      pctx.fillStyle = sky;
      pctx.fillRect(0, 0, w, h);
      const sunX = w * 0.62, sunY = h * 0.22, sunR = h * 0.13;
      const glow = pctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunR * 2.8);
      glow.addColorStop(0, "rgba(255,224,160,.85)");
      glow.addColorStop(1, "rgba(255,224,160,0)");
      pctx.fillStyle = glow;
      pctx.fillRect(0, 0, w, h);
      pctx.beginPath();
      pctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
      pctx.fillStyle = "#ffe9b8";
      pctx.fill();
      const towerColors = ["#1c2f4a", "#24405f", "#2d5578"];
      for (let i = 0; i < towerColors.length; i += 1) {
        const tw = w * (0.05 + i * 0.03);
        const tx = w * (0.18 + i * 0.28);
        const th = h * (0.32 + i * 0.08);
        pctx.fillStyle = towerColors[i];
        pctx.fillRect(tx, h * 0.5 - th, tw, th);
      }
      for (let k = 0; k < 40; k += 1) {
        const px = rand() * w, py = rand() * h * 0.5, r = rand() * 1 + 0.3;
        pctx.beginPath();
        pctx.arc(px, py, r, 0, Math.PI * 2);
        pctx.fillStyle = "rgba(255,255,255," + (0.1 + rand() * 0.2) + ")";
        pctx.fill();
      }
    }

    const CALC_W = 160, CALC_H = 100;
    const HORIZON = Math.round(CALC_H * 0.5);
    const REFLECT_SWAY_AMP = 6.5;
    const REFLECT_SWAY_SPEED = 0.0066;
    const REFLECT_GLOW_AMP = 46;

    const off = document.createElement("canvas");
    off.width = CALC_W; off.height = CALC_H;
    const octx = off.getContext("2d") as CanvasRenderingContext2D;
    drawPhotoBase(octx, CALC_W, CALC_H, 419051);
    const baseBuf = octx.getImageData(0, 0, CALC_W, CALC_H).data;

    const out = document.createElement("canvas");
    out.width = CALC_W; out.height = CALC_H;
    const outCtx = out.getContext("2d") as CanvasRenderingContext2D;
    const outImg = outCtx.createImageData(CALC_W, CALC_H);
    const outBuf = outImg.data;

    function sampleBase(sx: number, sy: number): [number, number, number] {
      sx = sx < 0 ? 0 : (sx > CALC_W - 1 ? CALC_W - 1 : sx);
      sy = sy < 0 ? 0 : (sy > CALC_H - 1 ? CALC_H - 1 : sy);
      const i = (Math.round(sy) * CALC_W + Math.round(sx)) * 4;
      return [baseBuf[i], baseBuf[i + 1], baseBuf[i + 2]];
    }

    function reflectWave(depth: number, t: number) {
      return Math.sin(depth * 0.5 - t * REFLECT_SWAY_SPEED);
    }

    function renderFrame(t: number) {
      let idx = 0;
      const span = CALC_H - HORIZON;
      for (let y = 0; y < CALC_H; y += 1) {
        for (let x = 0; x < CALC_W; x += 1) {
          let rgb: [number, number, number];
          let alpha = 1;
          let glow = 0;
          if (y < HORIZON) {
            rgb = sampleBase(x, y);
          } else {
            const depth = y - HORIZON;
            const srcY = HORIZON - depth;
            const frac = depth / span;
            const wave = reflectWave(depth, t);
            const offset = wave * REFLECT_SWAY_AMP * frac;
            rgb = sampleBase(x + offset, srcY);
            // 수면 하이라이트: x 오프셋과 같은 파형(wave)을 밝기 감쇠·스웨이 알파에도 그대로 전파한다.
            alpha = Math.max(0.15, 1 - frac * 0.75) * (0.9 + 0.1 * wave);
            glow = Math.max(0, wave) * REFLECT_GLOW_AMP * (1 - frac);
          }
          outBuf[idx] = Math.max(0, Math.min(255, rgb[0] * alpha + glow));
          outBuf[idx + 1] = Math.max(0, Math.min(255, rgb[1] * alpha + glow));
          outBuf[idx + 2] = Math.max(0, Math.min(255, rgb[2] * alpha + glow));
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
    let elapsed = reduce ? 700 : 0;
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
        <p className={styles.rv__caption}>이미지 아래 뒤집힌 반사가 물결치듯 좌우로 흔들리며 서서히 흐려진다</p>
      </div>
    </main>
  );
}
