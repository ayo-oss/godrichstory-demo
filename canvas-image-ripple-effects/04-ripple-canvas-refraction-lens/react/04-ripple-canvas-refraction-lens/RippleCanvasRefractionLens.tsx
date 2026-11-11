import { useEffect, useRef } from "react";
import styles from "./RippleCanvasRefractionLens.module.scss";

export default function RippleCanvasRefractionLens() {
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
      sky.addColorStop(0, "#d8e9ff");
      sky.addColorStop(1, "#f6f2ff");
      pctx.fillStyle = sky;
      pctx.fillRect(0, 0, w, h);
      const sunX = w * 0.3, sunY = h * 0.22, sunR = h * 0.14;
      const glow = pctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunR * 2.6);
      glow.addColorStop(0, "rgba(255,255,255,.9)");
      glow.addColorStop(1, "rgba(255,255,255,0)");
      pctx.fillStyle = glow;
      pctx.fillRect(0, 0, w, h);
      const gridColors = ["#a9c9ff", "#6f97e0", "#3d5fa8"];
      for (let i = 0; i < gridColors.length; i += 1) {
        const baseY = h * (0.48 + i * 0.16);
        pctx.beginPath();
        pctx.moveTo(0, h);
        const step = Math.max(2, w / 22);
        for (let x = 0; x <= w; x += step) {
          const n = Math.sin(x * 0.055 + i * 1.9 + seed * 0.00025) * h * 0.035;
          pctx.lineTo(x, baseY + n);
        }
        pctx.lineTo(w, h);
        pctx.closePath();
        pctx.fillStyle = gridColors[i];
        pctx.fill();
      }
      for (let k = 0; k < 46; k += 1) {
        const px = rand() * w, py = rand() * h, r = rand() * 1.1 + 0.4;
        pctx.beginPath();
        pctx.arc(px, py, r, 0, Math.PI * 2);
        pctx.fillStyle = "rgba(255,255,255," + (0.12 + rand() * 0.2) + ")";
        pctx.fill();
      }
    }

    const CALC_W = 160, CALC_H = 100;
    const LENS_RADIUS = 26;
    const LENS_REFRACT_K = 1.7;

    const off = document.createElement("canvas");
    off.width = CALC_W; off.height = CALC_H;
    const octx = off.getContext("2d") as CanvasRenderingContext2D;
    drawPhotoBase(octx, CALC_W, CALC_H, 419041);
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

    let lens = { x: CALC_W * 0.5, y: CALC_H * 0.5 };

    function renderFrame(t: number) {
      let idx = 0;
      for (let y = 0; y < CALC_H; y += 1) {
        for (let x = 0; x < CALC_W; x += 1) {
          const dxp = x - lens.x, dyp = y - lens.y;
          const dist = Math.sqrt(dxp * dxp + dyp * dyp);
          let rgb: [number, number, number];
          if (dist < LENS_RADIUS) {
            const norm = dist / LENS_RADIUS;
            const bulge = (1 - norm) * (1 - norm);
            const ripple = Math.sin(dist * 0.9 - t * 0.012) * 0.6 * (1 - norm);
            const factor = LENS_REFRACT_K * bulge + ripple;
            const ux = dist > 0.0001 ? dxp / dist : 0;
            const uy = dist > 0.0001 ? dyp / dist : 0;
            const sx = x - ux * factor * 4;
            const sy = y - uy * factor * 4;
            const base = sampleBase(sx, sy);
            const shine = Math.max(-20, Math.min(50, (1 - norm) * 30 - ripple * 14));
            rgb = [
              Math.max(0, Math.min(255, base[0] + shine)),
              Math.max(0, Math.min(255, base[1] + shine)),
              Math.max(0, Math.min(255, base[2] + shine))
            ];
          } else {
            rgb = sampleBase(x, y);
          }
          outBuf[idx] = rgb[0];
          outBuf[idx + 1] = rgb[1];
          outBuf[idx + 2] = rgb[2];
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

    let pointerActive = false;
    function toGrid(e: PointerEvent) {
      const r = wrap.getBoundingClientRect();
      return {
        x: (e.clientX - r.left) / r.width * CALC_W,
        y: (e.clientY - r.top) / r.height * CALC_H
      };
    }
    function onPointerEnter() { pointerActive = true; }
    function onPointerMove(e: PointerEvent) {
      pointerActive = true;
      lens = toGrid(e);
      if (reduce) draw(lastElapsed);
    }
    function onPointerLeave() { pointerActive = false; }
    function onKeyDown(e: KeyboardEvent) {
      let moved = true;
      if (e.key === "ArrowLeft") lens.x = Math.max(0, lens.x - 6);
      else if (e.key === "ArrowRight") lens.x = Math.min(CALC_W, lens.x + 6);
      else if (e.key === "ArrowUp") lens.y = Math.max(0, lens.y - 6);
      else if (e.key === "ArrowDown") lens.y = Math.min(CALC_H, lens.y + 6);
      else moved = false;
      if (moved) {
        e.preventDefault();
        pointerActive = true;
        if (reduce) draw(lastElapsed);
      }
    }
    wrap.addEventListener("pointerenter", onPointerEnter);
    wrap.addEventListener("pointermove", onPointerMove);
    wrap.addEventListener("pointerleave", onPointerLeave);
    wrap.addEventListener("keydown", onKeyDown);
    wrap.tabIndex = 0;

    function virtualLens(t: number) {
      return {
        x: CALC_W * (0.5 + 0.32 * Math.sin(t * 0.0011)),
        y: CALC_H * (0.5 + 0.3 * Math.cos(t * 0.0017))
      };
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
        if (!pointerActive) lens = virtualLens(elapsed);
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
      wrap.removeEventListener("pointerenter", onPointerEnter);
      wrap.removeEventListener("pointermove", onPointerMove);
      wrap.removeEventListener("pointerleave", onPointerLeave);
      wrap.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={`${styles.rv} is-demo`} ref={rootRef} tabIndex={0}>
        <canvas className={styles.rv__canvas} ref={canvasRef} width={480} height={300} />
        <p className={styles.rv__caption}>포인터를 따라다니는 원형 렌즈 안에서 이미지가 물속처럼 굴절되어 보인다</p>
      </div>
    </main>
  );
}
