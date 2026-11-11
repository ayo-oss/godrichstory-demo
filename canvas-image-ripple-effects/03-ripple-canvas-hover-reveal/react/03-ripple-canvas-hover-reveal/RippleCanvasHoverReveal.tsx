import { useEffect, useRef } from "react";
import styles from "./RippleCanvasHoverReveal.module.scss";

export default function RippleCanvasHoverReveal() {
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
      const sunX = w * 0.68, sunY = h * 0.26, sunR = h * 0.15;
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
          const n = Math.sin(x * 0.06 + i * 2 + seed * 0.0003) * h * 0.04 + Math.sin(x * 0.15 + i) * h * 0.018;
          pctx.lineTo(x, baseY + n);
        }
        pctx.lineTo(w, h);
        pctx.closePath();
        pctx.fillStyle = bands[i];
        pctx.fill();
      }
      for (let k = 0; k < 50; k += 1) {
        const px = rand() * w, py = rand() * h * 0.5, r = rand() * 1.2 + 0.3;
        pctx.beginPath();
        pctx.arc(px, py, r, 0, Math.PI * 2);
        pctx.fillStyle = "rgba(255,255,255," + (0.1 + rand() * 0.2) + ")";
        pctx.fill();
      }
    }

    const CALC_W = 160, CALC_H = 100;
    const WAVE_FRONT_SPEED = 0.11;
    const WAVE_BAND = 10;

    function makeBase(seed: number, palette: [string, string, string, string, string[]]) {
      const c = document.createElement("canvas");
      c.width = CALC_W; c.height = CALC_H;
      const cx = c.getContext("2d") as CanvasRenderingContext2D;
      drawPhotoBase(cx, CALC_W, CALC_H, seed, palette);
      return cx.getImageData(0, 0, CALC_W, CALC_H).data;
    }

    const bufA = makeBase(419031, ["#bfe3ff", "#fff3da", "rgba(255,247,225,.9)", "#ffe27a", ["#8fd0c7", "#4a9d8f", "#215a56"]]);
    const bufB = makeBase(419032, ["#3a2154", "#8a4fae", "rgba(255,214,247,.7)", "#ffd6f7", ["#5c3a7a", "#2f1f4a", "#160f28"]]);

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

    let origin = { x: CALC_W * 0.5, y: CALC_H * 0.5 };
    let radius = 0;
    let target = 0;

    function renderFrame(t: number) {
      let idx = 0;
      for (let y = 0; y < CALC_H; y += 1) {
        for (let x = 0; x < CALC_W; x += 1) {
          const dx0 = x - origin.x, dy0 = y - origin.y;
          const dist = Math.sqrt(dx0 * dx0 + dy0 * dy0);
          const band = Math.sin(dist * 0.35 - t * 0.01);
          const mix = 1 - Math.max(0, Math.min(1, (dist - (radius - WAVE_BAND)) / WAVE_BAND));
          const a = sampleAt(bufA, x + band * 0.6, y);
          const b = sampleAt(bufB, x - band * 0.6, y);
          const m = mix;
          outBuf[idx] = a[0] + (b[0] - a[0]) * m;
          outBuf[idx + 1] = a[1] + (b[1] - a[1]) * m;
          outBuf[idx + 2] = a[2] + (b[2] - a[2]) * m;
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

    let hovering = false;
    function toGrid(e: PointerEvent) {
      const r = wrap.getBoundingClientRect();
      return {
        x: (e.clientX - r.left) / r.width * CALC_W,
        y: (e.clientY - r.top) / r.height * CALC_H
      };
    }
    function startReveal(e: PointerEvent | null) {
      hovering = true;
      if (e) origin = toGrid(e);
      target = Math.sqrt(CALC_W * CALC_W + CALC_H * CALC_H);
      if (reduce) draw(lastElapsed);
    }
    function endReveal() {
      hovering = false;
      target = 0;
      if (reduce) draw(lastElapsed);
    }
    function onPointerMove(e: PointerEvent) { if (hovering) origin = toGrid(e); }
    function onFocus() { startReveal(null); origin = { x: CALC_W * 0.5, y: CALC_H * 0.5 }; }
    wrap.addEventListener("pointerenter", startReveal as EventListener);
    wrap.addEventListener("pointermove", onPointerMove);
    wrap.addEventListener("pointerleave", endReveal);
    wrap.addEventListener("focus", onFocus);
    wrap.addEventListener("blur", endReveal);

    const VIRTUAL_CYCLE_MS = 1900;
    function virtualHover(t: number) {
      const phase = (t % VIRTUAL_CYCLE_MS) / VIRTUAL_CYCLE_MS;
      return phase < 0.55;
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
        if (!hovering) {
          const on = virtualHover(elapsed);
          target = on ? Math.sqrt(CALC_W * CALC_W + CALC_H * CALC_H) : 0;
          if (on) {
            origin.x = CALC_W * (0.3 + 0.4 * ((Math.sin(elapsed * 0.0007) + 1) / 2));
            origin.y = CALC_H * (0.3 + 0.4 * ((Math.cos(elapsed * 0.0011) + 1) / 2));
          }
        }
        const maxR = Math.sqrt(CALC_W * CALC_W + CALC_H * CALC_H);
        const step = WAVE_FRONT_SPEED * dt * (maxR / 20);
        if (radius < target) radius = Math.min(target, radius + step);
        else if (radius > target) radius = Math.max(target, radius - step);
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
      wrap.removeEventListener("pointerenter", startReveal as EventListener);
      wrap.removeEventListener("pointermove", onPointerMove);
      wrap.removeEventListener("pointerleave", endReveal);
      wrap.removeEventListener("focus", onFocus);
      wrap.removeEventListener("blur", endReveal);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={`${styles.rv} is-demo`} ref={rootRef} tabIndex={0}>
        <canvas className={styles.rv__canvas} ref={canvasRef} width={480} height={300} />
        <p className={styles.rv__caption}>호버하면 물결이 퍼지면서 밑에 깔린 두 번째 이미지가 파동을 따라 서서히 드러난다</p>
      </div>
    </main>
  );
}
