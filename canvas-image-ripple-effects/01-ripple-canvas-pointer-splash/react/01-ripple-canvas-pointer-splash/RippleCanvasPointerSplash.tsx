import { useEffect, useRef } from "react";
import styles from "./RippleCanvasPointerSplash.module.scss";

export default function RippleCanvasPointerSplash() {
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
      sky.addColorStop(0, "#bfe3ff");
      sky.addColorStop(1, "#fff3da");
      pctx.fillStyle = sky;
      pctx.fillRect(0, 0, w, h);
      const sunX = w * 0.7, sunY = h * 0.24, sunR = h * 0.15;
      const glow = pctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunR * 2.6);
      glow.addColorStop(0, "rgba(255,247,225,.9)");
      glow.addColorStop(1, "rgba(255,247,225,0)");
      pctx.fillStyle = glow;
      pctx.fillRect(0, 0, w, h);
      pctx.beginPath();
      pctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
      pctx.fillStyle = "#ffe27a";
      pctx.fill();
      const hillColors = ["#8fd0c7", "#4a9d8f", "#215a56"];
      for (let i = 0; i < hillColors.length; i += 1) {
        const baseY = h * (0.5 + i * 0.14);
        pctx.beginPath();
        pctx.moveTo(0, h);
        const step = Math.max(2, w / 24);
        for (let x = 0; x <= w; x += step) {
          const n = Math.sin(x * 0.06 + i * 2.3 + seed * 0.0003) * h * 0.045 + Math.sin(x * 0.16 + i) * h * 0.02;
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

    const CALC_W = 160, CALC_H = 100;
    const RIPPLE_SPLASH_DECAY_MS = 400;
    const SPLASH_AMP = -520;
    const REFRACT_K = 0.9;

    let gridA = new Float32Array(CALC_W * CALC_H);
    let gridB = new Float32Array(CALC_W * CALC_H);
    const damping = Math.pow(0.02, 16 / RIPPLE_SPLASH_DECAY_MS);

    function cellIndex(x: number, y: number) { return y * CALC_W + x; }

    function splashAt(gx: number, gy: number) {
      gx = Math.round(gx); gy = Math.round(gy);
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          const x = gx + dx, y = gy + dy;
          if (x > 0 && x < CALC_W - 1 && y > 0 && y < CALC_H - 1) {
            gridA[cellIndex(x, y)] += SPLASH_AMP * (dx === 0 && dy === 0 ? 1 : 0.45);
          }
        }
      }
    }

    function stepWave() {
      for (let y = 1; y < CALC_H - 1; y += 1) {
        const row = y * CALC_W;
        for (let x = 1; x < CALC_W - 1; x += 1) {
          const i = row + x;
          const next = (gridA[i - 1] + gridA[i + 1] + gridA[i - CALC_W] + gridA[i + CALC_W]) / 2 - gridB[i];
          gridB[i] = next * damping;
        }
      }
      const t = gridA; gridA = gridB; gridB = t;
    }

    const off = document.createElement("canvas");
    off.width = CALC_W; off.height = CALC_H;
    const octx = off.getContext("2d") as CanvasRenderingContext2D;
    drawPhotoBase(octx, CALC_W, CALC_H, 419011);
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

    function renderField() {
      let idx = 0;
      for (let y = 0; y < CALC_H; y += 1) {
        const row = y * CALC_W;
        for (let x = 0; x < CALC_W; x += 1) {
          const i = row + x;
          const hl = x > 0 ? gridA[i - 1] : gridA[i];
          const hr = x < CALC_W - 1 ? gridA[i + 1] : gridA[i];
          const hu = y > 0 ? gridA[i - CALC_W] : gridA[i];
          const hd = y < CALC_H - 1 ? gridA[i + CALC_W] : gridA[i];
          const dx = (hr - hl) * REFRACT_K;
          const dy = (hd - hu) * REFRACT_K;
          const rgb = sampleBase(x + dx, y + dy);
          const shine = Math.max(-30, Math.min(60, (hu - hd) * 0.6));
          outBuf[idx] = Math.max(0, Math.min(255, rgb[0] + shine));
          outBuf[idx + 1] = Math.max(0, Math.min(255, rgb[1] + shine));
          outBuf[idx + 2] = Math.max(0, Math.min(255, rgb[2] + shine));
          outBuf[idx + 3] = 255;
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
      draw();
    }

    function draw() {
      renderField();
      outCtx.putImageData(outImg, 0, 0);
      ctx.clearRect(0, 0, cw, ch);
      ctx.drawImage(out, 0, 0, CALC_W, CALC_H, 0, 0, cw, ch);
    }

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const playing = !reduce;
    if (reduce) { root.classList.remove("is-demo"); }

    let pointerActive = false;
    let lastSplashMs = -9999;
    function toGrid(e: PointerEvent) {
      const r = wrap.getBoundingClientRect();
      const relX = ((e.clientX - r.left) / r.width) * CALC_W;
      const relY = ((e.clientY - r.top) / r.height) * CALC_H;
      return { x: relX, y: relY };
    }
    function onPointerDown(e: PointerEvent) {
      pointerActive = true;
      const g = toGrid(e);
      splashAt(g.x, g.y);
      lastSplashMs = performance.now();
      if (reduce) draw();
    }
    function onPointerMove(e: PointerEvent) {
      const g = toGrid(e);
      const now = performance.now();
      if (now - lastSplashMs > 90) {
        splashAt(g.x, g.y);
        lastSplashMs = now;
        if (reduce) draw();
      }
    }
    function onPointerUp() { pointerActive = false; }
    function onPointerLeave() { pointerActive = false; }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        splashAt(CALC_W / 2, CALC_H / 2);
        if (reduce) draw();
      }
    }
    wrap.addEventListener("pointerdown", onPointerDown);
    wrap.addEventListener("pointermove", onPointerMove);
    wrap.addEventListener("pointerup", onPointerUp);
    wrap.addEventListener("pointerleave", onPointerLeave);
    wrap.addEventListener("keydown", onKeyDown);
    wrap.tabIndex = 0;

    const VIRTUAL_INTERVAL_MS = 460;
    let lastVirtualMs = -9999;
    function virtualPointerOrbit(t: number) {
      return {
        x: CALC_W * (0.28 + 0.44 * ((Math.sin(t * 0.0013) + 1) / 2)),
        y: CALC_H * (0.3 + 0.4 * ((Math.cos(t * 0.0019) + 1) / 2))
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
        if (!pointerActive && elapsed - lastVirtualMs > VIRTUAL_INTERVAL_MS) {
          const p = virtualPointerOrbit(elapsed);
          splashAt(p.x, p.y);
          lastVirtualMs = elapsed;
        }
        stepWave();
        draw();
      }
      raf = requestAnimationFrame(tick);
    }
    fit();
    window.addEventListener("resize", fit);
    splashAt(CALC_W * 0.5, CALC_H * 0.45);
    draw();
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", fit);
      wrap.removeEventListener("pointerdown", onPointerDown);
      wrap.removeEventListener("pointermove", onPointerMove);
      wrap.removeEventListener("pointerup", onPointerUp);
      wrap.removeEventListener("pointerleave", onPointerLeave);
      wrap.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={`${styles.rv} is-demo`} ref={rootRef}>
        <canvas className={styles.rv__canvas} ref={canvasRef} width={480} height={300} />
        <p className={styles.rv__caption}>포인터가 지나간 자리마다 동심원 물결이 퍼지며 이미지 픽셀을 밀어낸다</p>
      </div>
    </main>
  );
}
