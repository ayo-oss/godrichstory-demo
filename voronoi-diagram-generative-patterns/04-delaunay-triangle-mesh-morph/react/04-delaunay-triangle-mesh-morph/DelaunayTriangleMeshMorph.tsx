import { useEffect, useRef } from "react";
import styles from "./DelaunayTriangleMeshMorph.module.scss";

type Point = { bx: number; by: number; phaseX: number; phaseY: number };
type Circum = { x: number; y: number; r2: number };

export default function DelaunayTriangleMeshMorph() {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    if (!root || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const wrap = canvas.parentElement as HTMLElement;

    const LOOP_MS = 2000;
    const VERTEX_JITTER_PX = 10;
    const JITTER_FREQ = (Math.PI * 2) / LOOP_MS;

    function seedRand(seed: number) {
      let s = seed >>> 0;
      return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    }
    const rand = seedRand(409041);

    const meshPalette = ["#2f6df6", "#b9a0ff", "#6ec8ff", "#4cd4a6", "#ff9ebb"];

    const BASE_W = 480, BASE_H = 300;
    const points: Point[] = [];
    const GRID_X = 7, GRID_Y = 5;
    for (let gy = 0; gy < GRID_Y; gy += 1) {
      for (let gx = 0; gx < GRID_X; gx += 1) {
        const jx = (rand() - 0.5) * (BASE_W / GRID_X) * 0.7;
        const jy = (rand() - 0.5) * (BASE_H / GRID_Y) * 0.7;
        points.push({
          bx: (gx + 0.5) * (BASE_W / GRID_X) + jx,
          by: (gy + 0.5) * (BASE_H / GRID_Y) + jy,
          phaseX: rand() * Math.PI * 2, phaseY: rand() * Math.PI * 2
        });
      }
    }

    function circumcircle(a: [number, number], b: [number, number], c: [number, number]): Circum | null {
      const ax = a[0], ay = a[1], bx = b[0], by = b[1], cx = c[0], cy = c[1];
      const d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
      if (Math.abs(d) < 1e-6) return null;
      const ux = ((ax * ax + ay * ay) * (by - cy) + (bx * bx + by * by) * (cy - ay) + (cx * cx + cy * cy) * (ay - by)) / d;
      const uy = ((ax * ax + ay * ay) * (cx - bx) + (bx * bx + by * by) * (ax - cx) + (cx * cx + cy * cy) * (bx - ax)) / d;
      const r2 = (ux - ax) * (ux - ax) + (uy - ay) * (uy - ay);
      return { x: ux, y: uy, r2: r2 };
    }

    function delaunayTriangulate(pts: [number, number][]): [number, number, number][] {
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      pts.forEach((p) => {
        minX = Math.min(minX, p[0]); minY = Math.min(minY, p[1]);
        maxX = Math.max(maxX, p[0]); maxY = Math.max(maxY, p[1]);
      });
      const dx = maxX - minX, dy = maxY - minY, dmax = Math.max(dx, dy) || 1;
      const midx = (minX + maxX) / 2, midy = (minY + maxY) / 2;
      const work: [number, number][] = pts.slice();
      const s0 = work.length, s1 = work.length + 1, s2 = work.length + 2;
      work.push([midx - 20 * dmax, midy - dmax], [midx, midy + 20 * dmax], [midx + 20 * dmax, midy - dmax]);
      let tris: [number, number, number][] = [[s0, s1, s2]];
      for (let i = 0; i < pts.length; i += 1) {
        const p = work[i];
        const bad: number[] = [];
        for (let t = 0; t < tris.length; t += 1) {
          const tri = tris[t];
          const cc = circumcircle(work[tri[0]], work[tri[1]], work[tri[2]]);
          if (!cc) continue;
          const ddx = p[0] - cc.x, ddy = p[1] - cc.y;
          if (ddx * ddx + ddy * ddy <= cc.r2) bad.push(t);
        }
        const edgeCount: Record<string, { e: [number, number]; n: number }> = {};
        bad.forEach((t2) => {
          const tri = tris[t2];
          const edges: [number, number][] = [[tri[0], tri[1]], [tri[1], tri[2]], [tri[2], tri[0]]];
          edges.forEach((e) => {
            const key = Math.min(e[0], e[1]) + "_" + Math.max(e[0], e[1]);
            if (!edgeCount[key]) edgeCount[key] = { e: e, n: 0 };
            edgeCount[key].n += 1;
          });
        });
        const boundary: [number, number][] = [];
        Object.keys(edgeCount).forEach((k) => { if (edgeCount[k].n === 1) boundary.push(edgeCount[k].e); });
        bad.sort((a2, b2) => b2 - a2).forEach((t3) => { tris.splice(t3, 1); });
        boundary.forEach((e) => { tris.push([e[0], e[1], i]); });
      }
      return tris.filter((tri) => tri[0] < pts.length && tri[1] < pts.length && tri[2] < pts.length);
    }

    let cw = 480, ch = 300, scaleX = 1, scaleY = 1;
    function fit() {
      const r = wrap.getBoundingClientRect();
      cw = Math.max(1, Math.round(r.width));
      ch = Math.max(1, Math.round(r.height));
      canvas!.width = cw; canvas!.height = ch;
      scaleX = cw / BASE_W; scaleY = ch / BASE_H;
      draw(lastElapsed);
    }

    let lastElapsed = 0;
    function draw(elapsed: number) {
      lastElapsed = elapsed;
      const jittered: [number, number][] = points.map((p) => [
        p.bx + Math.sin(elapsed * JITTER_FREQ + p.phaseX) * VERTEX_JITTER_PX,
        p.by + Math.cos(elapsed * JITTER_FREQ * 0.85 + p.phaseY) * VERTEX_JITTER_PX
      ]);
      const tris = delaunayTriangulate(jittered);
      ctx!.clearRect(0, 0, cw, ch);
      ctx!.fillStyle = "#ffffff";
      ctx!.fillRect(0, 0, cw, ch);
      tris.forEach((tri, ti) => {
        const a = jittered[tri[0]], b = jittered[tri[1]], c = jittered[tri[2]];
        ctx!.beginPath();
        ctx!.moveTo(a[0] * scaleX, a[1] * scaleY);
        ctx!.lineTo(b[0] * scaleX, b[1] * scaleY);
        ctx!.lineTo(c[0] * scaleX, c[1] * scaleY);
        ctx!.closePath();
        ctx!.fillStyle = meshPalette[ti % meshPalette.length];
        ctx!.globalAlpha = 0.55;
        ctx!.fill();
        ctx!.globalAlpha = 1;
        ctx!.strokeStyle = "rgba(23,20,26,.5)";
        ctx!.lineWidth = 1;
        ctx!.stroke();
      });
    }

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const playing = !reduce;
    let elapsed = reduce ? LOOP_MS * 0.5 : 0;
    if (reduce) { root.classList.remove("is-demo"); }

    let lastTs: number | null = null;
    let raf = 0;
    function tick(ts: number) {
      if (lastTs === null) lastTs = ts;
      const dt = ts - lastTs;
      lastTs = ts;
      if (playing) { elapsed += dt; if (elapsed >= LOOP_MS) elapsed -= LOOP_MS; }
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
        <p className={styles.vd__caption}>정점 흔들림 값으로 모핑하는 들로네 삼각 메쉬</p>
      </div>
    </main>
  );
}
