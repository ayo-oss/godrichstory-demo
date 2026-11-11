import { useEffect, useRef } from "react";
import styles from "./FilterHalftoneDotPrint.module.scss";

export default function FilterHalftoneDotPrint() {
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
    const HALFTONE_DOT_SIZE_PX = 4;

    const off = document.createElement("canvas");
    off.width = CALC_W; off.height = CALC_H;
    const octx = off.getContext("2d") as CanvasRenderingContext2D;
    drawPhotoBase(octx, CALC_W, CALC_H, 414031);
    const baseImg = octx.getImageData(0, 0, CALC_W, CALC_H);
    const baseBuf = baseImg.data;

    function sampleBrightness(xCalc: number, yCalc: number) {
      const xi = Math.max(0, Math.min(CALC_W - 1, Math.round(xCalc)));
      const yi = Math.max(0, Math.min(CALC_H - 1, Math.round(yCalc)));
      const idx = (yi * CALC_W + xi) * 4;
      return (0.299 * baseBuf[idx] + 0.587 * baseBuf[idx + 1] + 0.114 * baseBuf[idx + 2]) / 255;
    }

    function drawHalftoneDot(x: number, y: number, size: number, brightness: number) {
      const radius = (1 - brightness) * size * 0.62;
      if (radius < 0.4) return;
      ctx!.beginPath();
      ctx!.arc(x, y, radius, 0, Math.PI * 2);
      ctx!.fill();
    }

    let userDot = HALFTONE_DOT_SIZE_PX;
    if (range) {
      range.value = String(userDot);
      range.addEventListener("input", function () { userDot = Number(range.value); });
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
      const wave = Math.sin(elapsed * Math.PI * 4 / LOOP_MS);
      const dot = Math.max(3, userDot + wave * 3);
      const scaleX = CALC_W / cw, scaleY = CALC_H / ch;
      ctx!.clearRect(0, 0, cw, ch);
      ctx!.fillStyle = "#fff7e6";
      ctx!.fillRect(0, 0, cw, ch);
      ctx!.fillStyle = "#17141a";
      for (let y = dot / 2; y < ch; y += dot) {
        for (let x = dot / 2; x < cw; x += dot) {
          drawHalftoneDot(x, y, dot, sampleBrightness(x * scaleX, y * scaleY));
        }
      }
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
        <input className={styles.vd__range} ref={rangeRef} type="range" min={3} max={12} defaultValue={4} aria-label="dot size" />
        <p className={styles.vd__caption}>점 크기 값이 인쇄 질감을 만드는 망점 필터</p>
      </div>
    </main>
  );
}
