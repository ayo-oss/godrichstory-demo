import { useEffect, useRef } from "react";
import styles from "./Depth3dHeroSceneComposite.module.scss";

type Satellite = { baseAngle: number; radiusScale: number; size: number; color: string };
type Shape = {
  baseX: number; baseY: number; depthNorm: number; size: number;
  bobSpeed: number; bobPhase: number; zSpeed: number; zPhase: number; color: string;
};

export default function Depth3dHeroSceneComposite() {
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
    const HORIZON_Y = CALC_H * 0.36;
    const HERO_PARALLAX_REF_DISTANCE_PX = 200;
    const HERO_BLUR_MAX_PX = 10;
    const HERO_ORBIT_TILT_MAX_DEG = 16;
    const camHeight = 40;
    const GRID_PERSPECTIVE_PX = 760;
    const ROW_SPACING = 16, ROW_COUNT = 7, COL_SPACING = 15, COL_COUNT = 9;

    function seedRand(seed: number) {
      let s = seed >>> 0;
      return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    }
    const rnd = seedRand(429091);

    const RING_RADIUS = 26, SAT_COUNT = 6, ANGULAR_SPEED = 0.00058;
    const satellites: Satellite[] = [];
    for (let i = 0; i < SAT_COUNT; i += 1) {
      satellites.push({
        baseAngle: (Math.PI * 2 / SAT_COUNT) * i + rnd() * 0.3,
        radiusScale: 0.75 + rnd() * 0.28,
        size: 2.6 + rnd() * 2.2,
        color: ["#6ec8ff", "#b9a0ff", "#ff9ebb", "#4cd4a6"][i % 4]
      });
    }

    const SHAPE_COUNT = 6;
    const shapes: Shape[] = [];
    for (let j = 0; j < SHAPE_COUNT; j += 1) {
      shapes.push({
        baseX: 22 + (CALC_W - 44) * (j / (SHAPE_COUNT - 1)),
        baseY: CALC_H * 0.68 + (rnd() - 0.5) * 14,
        depthNorm: (j % 3) / 2,
        size: 6 + rnd() * 4,
        bobSpeed: 0.001 + rnd() * 0.0007,
        bobPhase: rnd() * Math.PI * 2,
        zSpeed: 0.0012 + rnd() * 0.0008,
        zPhase: rnd() * Math.PI * 2,
        color: ["#ffd23f", "#ff9ebb", "#6ec8ff", "#4cd4a6", "#b9a0ff", "#ffffff"][j]
      });
    }

    let nx = 0, ny = 0;
    let offsetCur = 0, offsetCurY = 0;
    const INERTIA_LERP_RATE = 5;

    function distanceMultiplier(distancePx: number) {
      const m = HERO_PARALLAX_REF_DISTANCE_PX / Math.max(20, distancePx);
      return Math.max(0.2, Math.min(2.6, m));
    }

    function projectGridPoint(xWorld: number, zWorld: number, viewOffsetX: number) {
      const z = Math.max(4, zWorld);
      const scale = GRID_PERSPECTIVE_PX / (z * 40);
      return { x: CALC_W * 0.5 + (xWorld - viewOffsetX) * scale, y: HORIZON_Y + camHeight * scale };
    }

    let elapsed = 0, scrollZ = 0;
    let cw = 480, ch = 300;

    function drawScene(t: number, dtS: number) {
      const sx = cw / CALC_W, sy = ch / CALC_H;
      const viewOffsetX = nx * 42;
      const tiltDeg = ny * HERO_ORBIT_TILT_MAX_DEG;
      const azimuthOffset = nx * 0.7;

      const targetOffsetX = nx * 14, targetOffsetY = ny * 9;
      const rate = Math.min(1, INERTIA_LERP_RATE * dtS);
      offsetCur += (targetOffsetX - offsetCur) * rate;
      offsetCurY += (targetOffsetY - offsetCurY) * rate;
      const pointerDistancePx = Math.max(20, Math.hypot(offsetCur, offsetCurY) * 6 + 60);
      const mult = distanceMultiplier(pointerDistancePx);

      ctx!.clearRect(0, 0, cw, ch);

      ctx!.strokeStyle = "rgba(140,150,230,.5)";
      ctx!.lineWidth = 1;
      for (let r = 1; r <= ROW_COUNT; r += 1) {
        const z = r * ROW_SPACING - scrollZ;
        if (z <= 2) continue;
        const pL = projectGridPoint(-COL_COUNT * COL_SPACING * 0.5, z, viewOffsetX);
        const pR = projectGridPoint(COL_COUNT * COL_SPACING * 0.5, z, viewOffsetX);
        ctx!.beginPath();
        ctx!.moveTo(pL.x * sx, pL.y * sy);
        ctx!.lineTo(pR.x * sx, pR.y * sy);
        ctx!.stroke();
      }

      const withZ = satellites.map((sat) => {
        const ang = sat.baseAngle + t * ANGULAR_SPEED + azimuthOffset;
        const rr = RING_RADIUS * sat.radiusScale;
        const lx = Math.cos(ang) * rr, lz = Math.sin(ang) * rr;
        const tiltRad = tiltDeg * Math.PI / 180;
        const ry = -lz * Math.sin(tiltRad), rz = lz * Math.cos(tiltRad);
        return { sat, x: lx, y: ry, z: rz };
      });
      withZ.sort((a, b) => a.z - b.z);
      for (let k = 0; k < withZ.length; k += 1) {
        const p = withZ[k];
        const perspScale = Math.max(0.55, Math.min(1.5, 1 + p.z / RING_RADIUS * 0.45));
        const alpha = Math.max(0.4, Math.min(1, 0.6 + p.z / RING_RADIUS * 0.4));
        const cx2 = (CALC_W * 0.5 + p.x) * sx, cy2 = (CALC_H * 0.42 + p.y) * sy;
        ctx!.globalAlpha = alpha;
        ctx!.fillStyle = p.sat.color;
        ctx!.beginPath();
        ctx!.arc(cx2, cy2, p.sat.size * perspScale * sx, 0, Math.PI * 2);
        ctx!.fill();
      }
      ctx!.globalAlpha = 1;

      for (let m2 = 0; m2 < shapes.length; m2 += 1) {
        const shape = shapes[m2];
        const blurPx = HERO_BLUR_MAX_PX * shape.depthNorm;
        const bobH = (Math.sin(t * shape.bobSpeed + shape.bobPhase) * 0.5 + 0.5) * 16;
        const zVar = 1 + Math.sin(t * shape.zSpeed + shape.zPhase) * 0.22;
        const shX = (shape.baseX + offsetCur * (1 - shape.depthNorm) * mult) * sx;
        const shY = (shape.baseY - bobH + offsetCurY * (1 - shape.depthNorm) * mult) * sy;

        ctx!.save();
        ctx!.filter = `blur(${2 * sx}px)`;
        ctx!.fillStyle = `rgba(20,16,24,${0.32 - shape.depthNorm * 0.12})`;
        ctx!.beginPath();
        ctx!.ellipse(shX, (shape.baseY + 10) * sy, shape.size * 0.7 * sx, shape.size * 0.22 * sy, 0, 0, Math.PI * 2);
        ctx!.fill();
        ctx!.restore();

        ctx!.save();
        ctx!.filter = `blur(${blurPx * sx}px)`;
        ctx!.fillStyle = shape.color;
        ctx!.beginPath();
        ctx!.arc(shX, shY, shape.size * zVar * sx, 0, Math.PI * 2);
        ctx!.fill();
        ctx!.restore();
      }
    }

    function fit() {
      const r = wrap.getBoundingClientRect();
      cw = Math.max(1, Math.round(r.width));
      ch = Math.max(1, Math.round(r.height));
      canvas!.width = cw; canvas!.height = ch;
      drawScene(elapsed, 0.016);
    }

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) root.classList.remove("is-demo");

    let pointerActive = false;
    function onPointerMove(e: PointerEvent) {
      pointerActive = true;
      const r = wrap.getBoundingClientRect();
      nx = ((e.clientX - r.left) / r.width - 0.5) * 2;
      ny = ((e.clientY - r.top) / r.height - 0.5) * 2;
      if (reduce) drawScene(elapsed, 0.016);
    }
    function onPointerLeave() { pointerActive = false; }
    function onKeydown(e: KeyboardEvent) {
      let moved = true;
      if (e.key === "ArrowLeft") nx = Math.max(-1, nx - 0.12);
      else if (e.key === "ArrowRight") nx = Math.min(1, nx + 0.12);
      else if (e.key === "ArrowUp") ny = Math.max(-1, ny - 0.12);
      else if (e.key === "ArrowDown") ny = Math.min(1, ny + 0.12);
      else moved = false;
      if (moved) {
        e.preventDefault();
        pointerActive = true;
        if (reduce) drawScene(elapsed, 0.016);
      }
    }
    wrap.addEventListener("pointermove", onPointerMove);
    wrap.addEventListener("pointerleave", onPointerLeave);
    wrap.addEventListener("keydown", onKeydown);

    function virtualPointerAt(t: number) {
      return { nx: Math.sin(t * 0.00046) * 0.85, ny: Math.cos(t * 0.00033) * 0.7 };
    }

    const warmSteps = reduce ? 0 : 110;
    for (let w = 0; w < warmSteps; w += 1) {
      elapsed += 20;
      scrollZ = (scrollZ + 18 * 0.02) % ROW_SPACING;
      if (!pointerActive) { const vp = virtualPointerAt(elapsed); nx = vp.nx; ny = vp.ny; }
    }

    let lastTs: number | null = null;
    let raf = 0;
    function tick(ts: number) {
      if (lastTs === null) lastTs = ts;
      const dt = Math.min(ts - lastTs, 48);
      lastTs = ts;
      if (!reduce) {
        elapsed += dt;
        scrollZ = (scrollZ + 18 * (dt / 1000)) % ROW_SPACING;
        if (!pointerActive) { const vp = virtualPointerAt(elapsed); nx = vp.nx; ny = vp.ny; }
        drawScene(elapsed, dt / 1000);
      }
      raf = requestAnimationFrame(tick);
    }
    fit();
    window.addEventListener("resize", fit);
    drawScene(elapsed, 0.016);
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
        <p className={styles.d3__caption}>시차·흐림·원근 격자·궤도·그림자·크기 변화를 같은 배경 위에서 동시에 계산해, 포인터가 움직이면 여러 층이 한 몸처럼 함께 반응한다</p>
      </div>
    </main>
  );
}
