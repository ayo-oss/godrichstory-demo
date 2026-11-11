import { useEffect, useRef } from "react";
import styles from "./FilterGrayscaleHoverReveal.module.scss";

export default function FilterGrayscaleHoverReveal() {
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

    const LOOP_MS = 2000;
    const GRAYSCALE_HOVER_MS = 200;

    const photo = document.createElement("canvas");
    const pctx = photo.getContext("2d") as CanvasRenderingContext2D;

    let cw = 480, ch = 300;
    function draw() {
      ctx!.clearRect(0, 0, cw, ch);
      ctx!.drawImage(photo, 0, 0);
    }
    function buildPhoto() {
      photo.width = cw; photo.height = ch;
      drawPhotoBase(pctx, cw, ch, 414091);
      draw();
    }
    function fit() {
      const r = wrap.getBoundingClientRect();
      cw = Math.max(1, Math.round(r.width));
      ch = Math.max(1, Math.round(r.height));
      canvas!.width = cw; canvas!.height = ch;
      buildPhoto();
    }

    canvas.style.transition = "filter " + GRAYSCALE_HOVER_MS + "ms ease";
    canvas.style.filter = "grayscale(1) saturate(0)";
    canvas.tabIndex = 0;

    function setHoverState(on: boolean) {
      canvas!.style.filter = on ? "grayscale(0) saturate(1)" : "grayscale(1) saturate(0)";
    }

    canvas.addEventListener("pointerenter", function () { setHoverState(true); });
    canvas.addEventListener("pointerleave", function () { setHoverState(false); });
    canvas.addEventListener("focus", function () { setHoverState(true); });
    canvas.addEventListener("blur", function () { setHoverState(false); });

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let playing = !reduce;
    if (reduce) { root.classList.remove("is-demo"); setHoverState(true); }

    let elapsed = 0, lastTs: number | null = null, lastBucket = -1;
    let raf = 0;
    function tick(ts: number) {
      if (lastTs === null) lastTs = ts;
      const dt = ts - lastTs;
      lastTs = ts;
      if (playing) {
        elapsed += dt;
        if (elapsed >= LOOP_MS) elapsed -= LOOP_MS;
        const bucket = Math.floor(elapsed / (LOOP_MS / 4));
        if (bucket !== lastBucket) { lastBucket = bucket; setHoverState(bucket % 2 === 1); }
      }
      raf = requestAnimationFrame(tick);
    }
    fit();
    window.addEventListener("resize", fit);
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
        <p className={styles.vd__caption}>채도 값이 돌아오는 흑백 호버 리빌</p>
      </div>
    </main>
  );
}
