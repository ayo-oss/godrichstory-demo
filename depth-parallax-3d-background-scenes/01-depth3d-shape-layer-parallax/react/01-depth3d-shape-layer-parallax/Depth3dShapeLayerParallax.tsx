import { useEffect, useRef } from "react";
import styles from "./Depth3dShapeLayerParallax.module.scss";

type ShapeItem = {
  distancePx: number;
  baseX: number;
  baseY: number;
  size: number;
  round: boolean;
  color: string;
  curX: number;
  curY: number;
};

export default function Depth3dShapeLayerParallax() {
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
    const CX = CALC_W * 0.5, CY = CALC_H * 0.5;
    const PARALLAX_REF_DISTANCE_PX = 70;
    const PARALLAX_MAX_OFFSET_PX = 26;
    const INERTIA_LERP_RATE = 5.2;
    const SHAPE_COUNT = 16;

    function seedRand(seed: number) {
      let s = seed >>> 0;
      return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    }
    const rnd = seedRand(429011);
    const palette = ["#2f6df6", "#ff9ebb", "#4cd4a6", "#b9a0ff", "#6ec8ff"];

    function distanceMultiplier(distancePx: number) {
      const m = PARALLAX_REF_DISTANCE_PX / distancePx;
      return Math.max(0.18, Math.min(3.1, m));
    }

    const shapes: ShapeItem[] = [];
    for (let i = 0; i < SHAPE_COUNT; i += 1) {
      const distancePx = 26 + rnd() * 150;
      const ang = rnd() * Math.PI * 2;
      const rad = 14 + rnd() * 62;
      shapes.push({
        distancePx,
        baseX: CX + Math.cos(ang) * rad,
        baseY: CY + Math.sin(ang) * rad * 0.72,
        size: Math.max(3.2, Math.min(15, 620 / distancePx)),
        round: rnd() < 0.55,
        color: palette[i % palette.length],
        curX: 0, curY: 0
      });
    }
    shapes.sort((a, b) => b.distancePx - a.distancePx);

    let pointerNormX = 0, pointerNormY = 0;
    let pointerActive = false;

    function stepSim(dtMs: number) {
      const dtS = dtMs / 1000;
      const rate = Math.min(1, INERTIA_LERP_RATE * dtS);
      for (let i = 0; i < shapes.length; i += 1) {
        const s = shapes[i];
        const mult = distanceMultiplier(s.distancePx);
        const tx = pointerNormX * PARALLAX_MAX_OFFSET_PX * mult;
        const ty = pointerNormY * PARALLAX_MAX_OFFSET_PX * mult * 0.6;
        s.curX += (tx - s.curX) * rate;
        s.curY += (ty - s.curY) * rate;
      }
    }

    let cw = 480, ch = 300;
    function drawScene() {
      const sx = cw / CALC_W, sy = ch / CALC_H;
      ctx!.clearRect(0, 0, cw, ch);
      for (let i = 0; i < shapes.length; i += 1) {
        const s = shapes[i];
        const alpha = Math.max(0.35, Math.min(1, 1 - s.distancePx / 190));
        const dx = (s.baseX + s.curX) * sx, dy = (s.baseY + s.curY) * sy;
        const dr = s.size * ((sx + sy) / 2);
        ctx!.globalAlpha = alpha;
        ctx!.fillStyle = s.color;
        ctx!.beginPath();
        if (s.round) {
          ctx!.arc(dx, dy, dr, 0, Math.PI * 2);
        } else {
          ctx!.save();
          ctx!.translate(dx, dy);
          ctx!.rotate(s.distancePx * 0.01);
          ctx!.fillRect(-dr, -dr * 0.7, dr * 2, dr * 1.4);
          ctx!.restore();
          ctx!.beginPath();
        }
        ctx!.fill();
      }
      ctx!.globalAlpha = 1;
    }

    function fit() {
      const r = wrap.getBoundingClientRect();
      cw = Math.max(1, Math.round(r.width));
      ch = Math.max(1, Math.round(r.height));
      canvas!.width = cw; canvas!.height = ch;
      drawScene();
    }

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) root.classList.remove("is-demo");

    function toNorm(e: PointerEvent) {
      const r = wrap.getBoundingClientRect();
      return {
        x: Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width - 0.5) * 2)),
        y: Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height - 0.5) * 2))
      };
    }
    function onPointerMove(e: PointerEvent) {
      pointerActive = true;
      const n = toNorm(e);
      pointerNormX = n.x; pointerNormY = n.y;
      if (reduce) { stepSim(16); drawScene(); }
    }
    function onPointerLeave() { pointerActive = false; }
    function onKeydown(e: KeyboardEvent) {
      let moved = true;
      if (e.key === "ArrowLeft") pointerNormX = Math.max(-1, pointerNormX - 0.14);
      else if (e.key === "ArrowRight") pointerNormX = Math.min(1, pointerNormX + 0.14);
      else if (e.key === "ArrowUp") pointerNormY = Math.max(-1, pointerNormY - 0.14);
      else if (e.key === "ArrowDown") pointerNormY = Math.min(1, pointerNormY + 0.14);
      else moved = false;
      if (moved) {
        e.preventDefault();
        pointerActive = true;
        if (reduce) { stepSim(16); drawScene(); }
      }
    }
    wrap.addEventListener("pointermove", onPointerMove);
    wrap.addEventListener("pointerleave", onPointerLeave);
    wrap.addEventListener("keydown", onKeydown);

    function virtualPointerPath(t: number) {
      return {
        x: Math.sin(t * 0.00072) * 0.85,
        y: Math.cos(t * 0.00104) * 0.6
      };
    }

    let elapsed = 0;
    const warmSteps = reduce ? 160 : 120;
    for (let w = 0; w < warmSteps; w += 1) {
      elapsed += 20;
      if (!pointerActive) { const v0 = virtualPointerPath(elapsed); pointerNormX = v0.x; pointerNormY = v0.y; }
      stepSim(20);
    }

    let lastTs: number | null = null;
    let raf = 0;
    function tick(ts: number) {
      if (lastTs === null) lastTs = ts;
      const dt = Math.min(ts - lastTs, 48);
      lastTs = ts;
      if (!reduce) {
        elapsed += dt;
        if (!pointerActive) {
          const v = virtualPointerPath(elapsed);
          pointerNormX = v.x; pointerNormY = v.y;
        }
        stepSim(dt);
        drawScene();
      }
      raf = requestAnimationFrame(tick);
    }
    fit();
    window.addEventListener("resize", fit);
    drawScene();
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", fit);
      wrap.removeEventListener("pointermove", onPointerMove);
      wrap.removeEventListener("pointerleave", onPointerLeave);
      wrap.removeEventListener("keydown", onKeydown);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={`${styles.d3} is-demo`} ref={rootRef} tabIndex={0}>
        <canvas className={styles.d3__canvas} ref={canvasRef} width={480} height={300} />
        <p className={styles.d3__caption}>도형마다 가상의 거리값을 부여해 포인터 이동량에 그 거리에 반비례하는 배수를 곱하고, 가까운 도형은 크게 밀리고 먼 도형은 조금만 밀린다</p>
      </div>
    </main>
  );
}
