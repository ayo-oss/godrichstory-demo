import { useEffect, useRef } from "react";
import styles from "./Depth3dBokehBlurFalloff.module.scss";

type Bokeh = {
  distancePx: number;
  baseX: number;
  baseY: number;
  size: number;
  phase: number;
  driftAmp: number;
  color: string;
};

export default function Depth3dBokehBlurFalloff() {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    if (!root || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const wrap = canvas.parentElement as HTMLElement;

    const CALC_W = 160, CALC_H = 100;
    const DEPTH_BLUR_MAX_PX = 14;
    const FOCAL_CYCLE_MS = 4200;
    const FOCAL_RANGE_NEAR = 30, FOCAL_RANGE_FAR = 160;
    const BOKEH_COUNT = 14;

    function seedRand(seed: number) {
      let s = seed >>> 0;
      return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    }
    const rnd = seedRand(429021);
    const palette = ["#ffe6b3", "#ffd23f", "#ff9ebb", "#6ec8ff", "#4cd4a6"];

    const circles: Bokeh[] = [];
    for (let i = 0; i < BOKEH_COUNT; i += 1) {
      circles.push({
        distancePx: 20 + rnd() * 150,
        baseX: 14 + rnd() * (CALC_W - 28),
        baseY: 12 + rnd() * (CALC_H - 24),
        size: 5 + rnd() * 11,
        phase: rnd() * Math.PI * 2,
        driftAmp: 3 + rnd() * 5,
        color: palette[i % palette.length]
      });
    }

    function focalDepthAt(t: number) {
      const f = (Math.sin(t / FOCAL_CYCLE_MS * Math.PI * 2) + 1) / 2;
      return FOCAL_RANGE_NEAR + f * (FOCAL_RANGE_FAR - FOCAL_RANGE_NEAR);
    }

    function blurForDepth(distancePx: number, focalDepth: number) {
      const diff = Math.abs(distancePx - focalDepth);
      return Math.max(0, Math.min(DEPTH_BLUR_MAX_PX, diff / 9));
    }

    let elapsed = 0;
    let cw = 480, ch = 300;
    let focalNudge = 0;

    function drawScene(nowMs: number) {
      const sx = cw / CALC_W, sy = ch / CALC_H;
      const savg = (sx + sy) / 2;
      const focalDepth = focalDepthAt(nowMs);
      ctx!.clearRect(0, 0, cw, ch);
      ctx!.globalCompositeOperation = "lighter";
      const order = circles.slice().sort((a, b) => b.distancePx - a.distancePx);
      for (let i = 0; i < order.length; i += 1) {
        const c = order[i];
        const blurPx = blurForDepth(c.distancePx, focalDepth);
        const alpha = Math.max(0.3, Math.min(0.95, 1 - c.distancePx / 210));
        const driftX = Math.sin(nowMs * 0.0006 + c.phase) * c.driftAmp;
        const driftY = Math.cos(nowMs * 0.0005 + c.phase) * c.driftAmp * 0.6;
        const dx = (c.baseX + driftX) * sx, dy = (c.baseY + driftY) * sy;
        const dr = c.size * savg;
        ctx!.filter = blurPx > 0.15 ? "blur(" + (blurPx * savg).toFixed(1) + "px)" : "none";
        const g = ctx!.createRadialGradient(dx, dy, 0, dx, dy, dr);
        g.addColorStop(0, c.color);
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx!.globalAlpha = alpha;
        ctx!.fillStyle = g;
        ctx!.beginPath();
        ctx!.arc(dx, dy, dr, 0, Math.PI * 2);
        ctx!.fill();
      }
      ctx!.filter = "none";
      ctx!.globalAlpha = 1;
      ctx!.globalCompositeOperation = "source-over";
    }

    function fit() {
      const r = wrap.getBoundingClientRect();
      cw = Math.max(1, Math.round(r.width));
      ch = Math.max(1, Math.round(r.height));
      canvas!.width = cw; canvas!.height = ch;
      drawScene(elapsed);
    }

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) root.classList.remove("is-demo");

    function onPointerMove(e: PointerEvent) {
      const r = wrap.getBoundingClientRect();
      focalNudge = ((e.clientX - r.left) / r.width - 0.5) * 2;
      if (reduce) drawScene(elapsed + focalNudge * FOCAL_CYCLE_MS * 0.25);
    }
    function onKeydown(e: KeyboardEvent) {
      let moved = true;
      if (e.key === "ArrowLeft") focalNudge = Math.max(-1, focalNudge - 0.12);
      else if (e.key === "ArrowRight") focalNudge = Math.min(1, focalNudge + 0.12);
      else moved = false;
      if (moved) {
        e.preventDefault();
        if (reduce) drawScene(elapsed + focalNudge * FOCAL_CYCLE_MS * 0.25);
      }
    }
    wrap.addEventListener("pointermove", onPointerMove);
    wrap.addEventListener("keydown", onKeydown);

    const warmSteps = reduce ? 160 : 120;
    for (let w = 0; w < warmSteps; w += 1) elapsed += 20;

    let lastTs: number | null = null;
    let raf = 0;
    function tick(ts: number) {
      if (lastTs === null) lastTs = ts;
      const dt = Math.min(ts - lastTs, 48);
      lastTs = ts;
      if (!reduce) {
        elapsed += dt;
        drawScene(elapsed + focalNudge * FOCAL_CYCLE_MS * 0.25);
      }
      raf = requestAnimationFrame(tick);
    }
    fit();
    window.addEventListener("resize", fit);
    drawScene(elapsed);
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", fit);
      wrap.removeEventListener("pointermove", onPointerMove);
      wrap.removeEventListener("keydown", onKeydown);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={`${styles.d3} is-demo`} ref={rootRef} tabIndex={0}>
        <canvas className={styles.d3__canvas} ref={canvasRef} width={480} height={300} />
        <p className={styles.d3__caption}>각 도형의 거리값을 흐림 반경으로 변환해 실시간으로 filter blur 값을 다시 계산해, 초점면에서 멀어질수록 도형 윤곽이 더 크게 번진다</p>
      </div>
    </main>
  );
}
