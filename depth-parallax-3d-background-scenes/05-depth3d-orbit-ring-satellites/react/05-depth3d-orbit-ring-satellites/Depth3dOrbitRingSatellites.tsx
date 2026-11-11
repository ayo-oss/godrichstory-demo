import { useEffect, useRef } from "react";
import styles from "./Depth3dOrbitRingSatellites.module.scss";

type Satellite = {
  baseAngle: number;
  radiusScale: number;
  size: number;
  color: string;
};

export default function Depth3dOrbitRingSatellites() {
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
    const CX = CALC_W * 0.5, CY = CALC_H * 0.52;
    const RING_RADIUS = 40;
    const ORBIT_TILT_MAX_DEG = 18;
    const SAT_COUNT = 9;
    const ANGULAR_SPEED = 0.00062;

    function seedRand(seed: number) {
      let s = seed >>> 0;
      return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    }
    const rnd = seedRand(429051);
    const palette = ["#6ec8ff", "#b9a0ff", "#ff9ebb", "#4cd4a6", "#ffd23f"];

    const satellites: Satellite[] = [];
    for (let i = 0; i < SAT_COUNT; i += 1) {
      satellites.push({
        baseAngle: (Math.PI * 2 / SAT_COUNT) * i + rnd() * 0.3,
        radiusScale: 0.72 + rnd() * 0.32,
        size: 3.2 + rnd() * 3.4,
        color: palette[i % palette.length]
      });
    }

    function satelliteAngleAt(sat: Satellite, t: number) {
      return sat.baseAngle + t * ANGULAR_SPEED;
    }

    let tiltDeg = 0, azimuthOffset = 0;
    let pointerActive = false;

    function computeTransformed(sat: Satellite, t: number) {
      const ang = satelliteAngleAt(sat, t) + azimuthOffset;
      const r = RING_RADIUS * sat.radiusScale;
      const lx = Math.cos(ang) * r;
      const lz = Math.sin(ang) * r;
      const tiltRad = tiltDeg * Math.PI / 180;
      const ry = -lz * Math.sin(tiltRad);
      const rz = lz * Math.cos(tiltRad);
      return { x: lx, y: ry, z: rz };
    }

    function zSortSatellites(list: Satellite[], t: number) {
      const withZ = list.map((sat) => ({ sat, p: computeTransformed(sat, t) }));
      withZ.sort((a, b) => a.p.z - b.p.z);
      return withZ;
    }

    let elapsed = 0;
    let cw = 480, ch = 300;

    function drawScene(nowMs: number) {
      const sx = cw / CALC_W, sy = ch / CALC_H;
      const savg = (sx + sy) / 2;
      ctx!.clearRect(0, 0, cw, ch);

      ctx!.fillStyle = "rgba(150,170,255,.14)";
      ctx!.beginPath();
      ctx!.arc(CX * sx, CY * sy, RING_RADIUS * 0.5 * savg, 0, Math.PI * 2);
      ctx!.fill();

      const ordered = zSortSatellites(satellites, nowMs);
      for (let i = 0; i < ordered.length; i += 1) {
        const p = ordered[i].p;
        const sat = ordered[i].sat;
        const perspScale = Math.max(0.55, Math.min(1.5, 1 + p.z / RING_RADIUS * 0.45));
        const alpha = Math.max(0.4, Math.min(1, 0.62 + p.z / RING_RADIUS * 0.4));
        const dx = (CX + p.x) * sx, dy = (CY + p.y) * sy;
        const dr = sat.size * perspScale * savg;
        ctx!.globalAlpha = alpha;
        ctx!.fillStyle = sat.color;
        ctx!.beginPath();
        ctx!.arc(dx, dy, dr, 0, Math.PI * 2);
        ctx!.fill();
      }
      ctx!.globalAlpha = 1;
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
      pointerActive = true;
      const r = wrap.getBoundingClientRect();
      const ny = ((e.clientY - r.top) / r.height - 0.5) * 2;
      const nx = ((e.clientX - r.left) / r.width - 0.5) * 2;
      tiltDeg = Math.max(-ORBIT_TILT_MAX_DEG, Math.min(ORBIT_TILT_MAX_DEG, ny * ORBIT_TILT_MAX_DEG));
      azimuthOffset = nx * 0.9;
      if (reduce) drawScene(elapsed);
    }
    function onPointerLeave() { pointerActive = false; }
    function onKeydown(e: KeyboardEvent) {
      let moved = true;
      if (e.key === "ArrowUp") tiltDeg = Math.max(-ORBIT_TILT_MAX_DEG, tiltDeg - 3);
      else if (e.key === "ArrowDown") tiltDeg = Math.min(ORBIT_TILT_MAX_DEG, tiltDeg + 3);
      else if (e.key === "ArrowLeft") azimuthOffset -= 0.16;
      else if (e.key === "ArrowRight") azimuthOffset += 0.16;
      else moved = false;
      if (moved) {
        e.preventDefault();
        pointerActive = true;
        if (reduce) drawScene(elapsed);
      }
    }
    wrap.addEventListener("pointermove", onPointerMove);
    wrap.addEventListener("pointerleave", onPointerLeave);
    wrap.addEventListener("keydown", onKeydown);

    function virtualTiltAt(t: number) {
      return Math.sin(t * 0.00058) * ORBIT_TILT_MAX_DEG;
    }

    const warmSteps = reduce ? 0 : 100;
    for (let w = 0; w < warmSteps; w += 1) {
      elapsed += 20;
      if (!pointerActive) tiltDeg = virtualTiltAt(elapsed);
    }

    let lastTs: number | null = null;
    let raf = 0;
    function tick(ts: number) {
      if (lastTs === null) lastTs = ts;
      const dt = Math.min(ts - lastTs, 48);
      lastTs = ts;
      if (!reduce) {
        elapsed += dt;
        if (!pointerActive) tiltDeg = virtualTiltAt(elapsed);
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
      wrap.removeEventListener("pointermove", onPointerMove);
      wrap.removeEventListener("pointerleave", onPointerLeave);
      wrap.removeEventListener("keydown", onKeydown);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={`${styles.d3} is-demo`} ref={rootRef} tabIndex={0}>
        <canvas className={styles.d3__canvas} ref={canvasRef} width={480} height={300} />
        <p className={styles.d3__caption}>작은 도형들의 위치를 구면 좌표식으로 매 프레임 계산하고 z값 순서로 다시 그려, 포인터 위치에 따라 고리 전체가 기울면서도 앞뒤 가림이 맞는다</p>
      </div>
    </main>
  );
}
