import { useEffect, useRef } from "react";
import styles from "./Depth3dGradientMeshDrift.module.scss";

type MeshLayer = {
  depthIndex: number;
  period: number;
  centerX: number;
  centerY: number;
  reachPx: number;
  radius: number;
  phaseX: number;
  phaseY: number;
  color: string;
};

export default function Depth3dGradientMeshDrift() {
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
    const MESH_DRIFT_PERIOD_BASE_MS = 3200;
    const MESH_LAYER_COUNT = 5;

    function seedRand(seed: number) {
      let s = seed >>> 0;
      return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    }
    const rnd = seedRand(429031);
    const palette = ["#ff9ebb", "#ffb37a", "#ffd23f", "#ff8a5c", "#ffcf99"];

    const meshLayers: MeshLayer[] = [];
    for (let i = 0; i < MESH_LAYER_COUNT; i += 1) {
      const depthIndex = i;
      meshLayers.push({
        depthIndex,
        period: MESH_DRIFT_PERIOD_BASE_MS * (1 + depthIndex * 0.62),
        centerX: 20 + rnd() * (CALC_W - 40),
        centerY: 18 + rnd() * (CALC_H - 36),
        reachPx: Math.max(10, 42 - depthIndex * 6),
        radius: Math.max(14, 46 - depthIndex * 7),
        phaseX: rnd() * Math.PI * 2,
        phaseY: rnd() * Math.PI * 2,
        color: palette[i % palette.length]
      });
    }
    meshLayers.sort((a, b) => b.depthIndex - a.depthIndex);

    function blobPositionAt(layer: MeshLayer, t: number) {
      const ax = Math.sin(t / layer.period * Math.PI * 2 + layer.phaseX) * layer.reachPx;
      const ay = Math.cos(t / layer.period * Math.PI * 2.3 + layer.phaseY) * layer.reachPx * 0.7;
      return { x: layer.centerX + ax, y: layer.centerY + ay };
    }

    let elapsed = 0;
    let cw = 480, ch = 300;

    function drawScene(nowMs: number) {
      const sx = cw / CALC_W, sy = ch / CALC_H;
      const savg = (sx + sy) / 2;
      ctx!.clearRect(0, 0, cw, ch);
      ctx!.globalCompositeOperation = "lighter";
      for (let i = 0; i < meshLayers.length; i += 1) {
        const layer = meshLayers[i];
        const pos = blobPositionAt(layer, nowMs);
        const alpha = Math.max(0.3, 0.72 - layer.depthIndex * 0.1);
        const dx = pos.x * sx, dy = pos.y * sy, dr = layer.radius * savg;
        const g = ctx!.createRadialGradient(dx, dy, 0, dx, dy, dr);
        g.addColorStop(0, layer.color);
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx!.globalAlpha = alpha;
        ctx!.fillStyle = g;
        ctx!.beginPath();
        ctx!.arc(dx, dy, dr, 0, Math.PI * 2);
        ctx!.fill();
      }
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

    const warmSteps = reduce ? 0 : 90;
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
      <div className={`${styles.d3} is-demo`} ref={rootRef}>
        <canvas className={styles.d3__canvas} ref={canvasRef} width={480} height={300} />
        <p className={styles.d3__caption}>여러 겹의 흐린 그라데이션 덩어리에 서로 다른 이동 주기를 줘 겹쳐 그리고, 가까운 층일수록 더 크고 빠르게, 먼 층일수록 작고 느리게 흐른다</p>
      </div>
    </main>
  );
}
