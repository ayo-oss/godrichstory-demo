import { useEffect, useRef } from "react";
import styles from "./FilterDominantColorSwatch.module.scss";

export default function FilterDominantColorSwatch() {
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
    const PHOTO_SEEDS = [414081, 414082, 414083];

    const off = document.createElement("canvas");
    off.width = CALC_W; off.height = CALC_H;
    const octx = off.getContext("2d") as CanvasRenderingContext2D;

    let photoIndex = 0;
    let baseBuf: Uint8ClampedArray | null = null;
    let dominant = "#2f6df6";

    function computeDominantColor() {
      if (!baseBuf) return;
      const bins: Record<string, number> = {};
      let idx = 0;
      for (let i = 0; i < CALC_W * CALC_H; i += 1) {
        const r = baseBuf[idx] >> 4, g = baseBuf[idx + 1] >> 4, b = baseBuf[idx + 2] >> 4;
        const key = r + "-" + g + "-" + b;
        bins[key] = (bins[key] || 0) + 1;
        idx += 4;
      }
      let bestKey: string | null = null, bestCount = -1;
      for (const k in bins) { if (bins[k] > bestCount) { bestCount = bins[k]; bestKey = k; } }
      if (!bestKey) return;
      const parts = bestKey.split("-");
      dominant = "rgb(" + (parseInt(parts[0], 10) * 16 + 8) + "," + (parseInt(parts[1], 10) * 16 + 8) + "," + (parseInt(parts[2], 10) * 16 + 8) + ")";
    }

    function renderPhoto(elapsed: number) {
      const seedVariant = PHOTO_SEEDS[photoIndex] + Math.floor(elapsed / 45);
      octx.clearRect(0, 0, CALC_W, CALC_H);
      drawPhotoBase(octx, CALC_W, CALC_H, seedVariant);
      baseBuf = octx.getImageData(0, 0, CALC_W, CALC_H).data;
      computeDominantColor();
    }
    function cyclePhoto() { photoIndex = (photoIndex + 1) % PHOTO_SEEDS.length; }

    canvas.addEventListener("click", function () { cyclePhoto(); draw(lastElapsed); });

    let cw = 480, ch = 300;
    let lastElapsed = 0;
    function fit() {
      const r = wrap.getBoundingClientRect();
      cw = Math.max(1, Math.round(r.width));
      ch = Math.max(1, Math.round(r.height));
      canvas!.width = cw; canvas!.height = ch;
      draw(lastElapsed);
    }

    function draw(elapsed: number) {
      lastElapsed = elapsed;
      renderPhoto(elapsed);
      const photoW = Math.round(cw * 0.72);
      ctx!.imageSmoothingEnabled = true;
      ctx!.clearRect(0, 0, cw, ch);
      ctx!.drawImage(off, 0, 0, CALC_W, CALC_H, 0, 0, photoW, ch);
      ctx!.fillStyle = dominant;
      ctx!.fillRect(photoW, 0, cw - photoW, ch);
    }

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let playing = !reduce;
    let elapsed = reduce ? LOOP_MS * 0.5 : 0;
    if (reduce) { root.classList.remove("is-demo"); }

    let lastTs: number | null = null, lastBucket = -1;
    let raf = 0;
    function tick(ts: number) {
      if (lastTs === null) lastTs = ts;
      const dt = ts - lastTs;
      lastTs = ts;
      if (playing) {
        elapsed += dt;
        if (elapsed >= LOOP_MS) elapsed -= LOOP_MS;
        const bucket = Math.floor(elapsed / (LOOP_MS / 2));
        if (bucket !== lastBucket) { lastBucket = bucket; cyclePhoto(); }
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
        <p className={styles.vd__caption}>픽셀 값을 읽어 뽑는 대표 색 스와치</p>
      </div>
    </main>
  );
}
