import { useEffect, useRef } from "react";
import styles from "./FilterDuotoneColormap.module.scss";

export default function FilterDuotoneColormap() {
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

    function drawPhotoBase(pctx: CanvasRenderingContext2D, w: number, h: number, seed: number) {
      const rand = seedRand(seed);
      const sky = pctx.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, "#8fc7ff");
      sky.addColorStop(1, "#fff2d6");
      pctx.fillStyle = sky;
      pctx.fillRect(0, 0, w, h);
      const sunX = w * 0.72, sunY = h * 0.3, sunR = h * 0.22;
      const glow = pctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunR * 2.3);
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
        const baseY = h * (0.5 + i * 0.15);
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
        const px = rand() * w, py = rand() * h * 0.55, r = rand() * 1.4 + 0.3;
        pctx.beginPath();
        pctx.arc(px, py, r, 0, Math.PI * 2);
        pctx.fillStyle = "rgba(255,255,255," + (0.12 + rand() * 0.22) + ")";
        pctx.fill();
      }
    }

    const CALC_W = 160, CALC_H = 100;
    const LOOP_MS = 2000;
    const DUOTONE_MIX_PERCENT = 30;
    const DUOTONE_DARK = [10, 79, 232];
    const DUOTONE_LIGHT = [255, 210, 63];

    const off = document.createElement("canvas");
    off.width = CALC_W; off.height = CALC_H;
    const octx = off.getContext("2d") as CanvasRenderingContext2D;
    drawPhotoBase(octx, CALC_W, CALC_H, 414011);
    const baseImg = octx.getImageData(0, 0, CALC_W, CALC_H);
    const baseBuf = baseImg.data;

    const out = document.createElement("canvas");
    out.width = CALC_W; out.height = CALC_H;
    const outCtx = out.getContext("2d") as CanvasRenderingContext2D;
    const outImg = outCtx.createImageData(CALC_W, CALC_H);
    const outBuf = outImg.data;

    function mapDuotone(lum: number, mix: number): [number, number, number, number] {
      const t = mix / 100;
      const dr = DUOTONE_DARK[0] + (DUOTONE_LIGHT[0] - DUOTONE_DARK[0]) * lum;
      const dg = DUOTONE_DARK[1] + (DUOTONE_LIGHT[1] - DUOTONE_DARK[1]) * lum;
      const db = DUOTONE_DARK[2] + (DUOTONE_LIGHT[2] - DUOTONE_DARK[2]) * lum;
      return [dr, dg, db, t];
    }

    let userMix = DUOTONE_MIX_PERCENT;
    if (range) {
      range.value = String(userMix);
      range.addEventListener("input", function () { userMix = Number(range.value); });
    }

    function renderFrame(t: number) {
      const wave = Math.sin(t * Math.PI * 4 / LOOP_MS);
      const mix = Math.max(0, Math.min(100, userMix + wave * 25));
      let idx = 0;
      for (let i = 0; i < CALC_W * CALC_H; i += 1) {
        const r = baseBuf[idx], g = baseBuf[idx + 1], b = baseBuf[idx + 2];
        const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        const dc = mapDuotone(lum, mix);
        outBuf[idx] = r + (dc[0] - r) * dc[3];
        outBuf[idx + 1] = g + (dc[1] - g) * dc[3];
        outBuf[idx + 2] = b + (dc[2] - b) * dc[3];
        outBuf[idx + 3] = 255;
        idx += 4;
      }
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
      ctx!.imageSmoothingEnabled = true;
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
        <input className={styles.vd__range} ref={rangeRef} type="range" min={0} max={100} defaultValue={30} aria-label="duotone mix" />
        <p className={styles.vd__caption}>두 색 매핑 값으로 세우는 듀오톤</p>
      </div>
    </main>
  );
}
