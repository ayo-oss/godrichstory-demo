import { useEffect, useRef } from "react";
import styles from "./Depth3dLightShaftDepth.module.scss";

type Shaft = {
  angleBase: number;
  distanceBase: number;
  swayRange: number;
  swaySpeed: number;
  phase: number;
  width: number;
  hue: string;
};

export default function Depth3dLightShaftDepth() {
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
    const SOURCE_X = CALC_W * 0.5, SOURCE_Y = -6;
    const SHAFT_LAYER_COUNT = 7;
    const LIGHT_SHAFT_DECAY = 0.42;
    const MAX_OPACITY = 0.62;

    function seedRand(seed: number) {
      let s = seed >>> 0;
      return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    }
    const rnd = seedRand(429061);

    const shafts: Shaft[] = [];
    for (let i = 0; i < SHAFT_LAYER_COUNT; i += 1) {
      shafts.push({
        angleBase: -0.62 + (1.24 / (SHAFT_LAYER_COUNT - 1)) * i,
        distanceBase: 1.1 + i * 0.62,
        swayRange: 0.6 + rnd() * 0.6,
        swaySpeed: 0.0013 + rnd() * 0.0011,
        phase: rnd() * Math.PI * 2,
        width: 8 + rnd() * 6,
        hue: i % 2 === 0 ? "90,60,170" : "40,30,110"
      });
    }

    function depthFor(shaft: Shaft, t: number) {
      return shaft.distanceBase + Math.sin(t * shaft.swaySpeed + shaft.phase) * shaft.swayRange;
    }

    function shaftOpacityForDepth(depth: number) {
      const v = Math.exp(-LIGHT_SHAFT_DECAY * depth) * MAX_OPACITY;
      return Math.max(0, Math.min(MAX_OPACITY, v));
    }

    let elapsed = 0;
    let cw = 480, ch = 300;

    function drawScene(t: number) {
      const sx = cw / CALC_W, sy = ch / CALC_H;
      ctx!.clearRect(0, 0, cw, ch);

      ctx!.fillStyle = "rgba(60,40,120,.55)";
      ctx!.beginPath();
      ctx!.arc(SOURCE_X * sx, SOURCE_Y * sy, 10 * sx, 0, Math.PI * 2);
      ctx!.fill();

      ctx!.globalCompositeOperation = "lighter";
      for (let i = 0; i < shafts.length; i += 1) {
        const shaft = shafts[i];
        const depth = depthFor(shaft, t);
        const op = shaftOpacityForDepth(depth);
        const angle = shaft.angleBase + Math.sin(t * shaft.swaySpeed * 0.7 + shaft.phase) * 0.13;
        const length = 118 + depth * 6;
        const endX = SOURCE_X + Math.sin(angle) * length;
        const endY = SOURCE_Y + Math.cos(angle) * length;

        const grad = ctx!.createLinearGradient(SOURCE_X * sx, SOURCE_Y * sy, endX * sx, endY * sy);
        grad.addColorStop(0, `rgba(${shaft.hue},${op})`);
        grad.addColorStop(1, `rgba(${shaft.hue},0)`);

        const perpX = Math.cos(angle) * shaft.width;
        const perpY = -Math.sin(angle) * shaft.width;

        ctx!.fillStyle = grad;
        ctx!.beginPath();
        ctx!.moveTo((SOURCE_X - perpX * 0.15) * sx, (SOURCE_Y - perpY * 0.15) * sy);
        ctx!.lineTo((SOURCE_X + perpX * 0.15) * sx, (SOURCE_Y + perpY * 0.15) * sy);
        ctx!.lineTo((endX + perpX) * sx, (endY + perpY) * sy);
        ctx!.lineTo((endX - perpX) * sx, (endY - perpY) * sy);
        ctx!.closePath();
        ctx!.fill();
      }
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

    const warmSteps = reduce ? 0 : 120;
    for (let w = 0; w < warmSteps; w += 1) elapsed += 20;

    let lastTs: number | null = null;
    let raf = 0;
    function tick(ts: number) {
      if (lastTs === null) lastTs = ts;
      const dt = Math.min(ts - lastTs, 48);
      lastTs = ts;
      if (!reduce) {
        elapsed += dt;
        drawScene(elapsed);
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
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={`${styles.d3} is-demo`} ref={rootRef} tabIndex={0}>
        <canvas className={styles.d3__canvas} ref={canvasRef} width={480} height={300} />
        <p className={styles.d3__caption}>빛줄기 여러 겹을 그리고 각 겹의 불투명도를 거리값에 지수함수로 곱해 줄여, 가까운 겹은 선명하고 먼 겹은 배경에 거의 스며든다</p>
      </div>
    </main>
  );
}
