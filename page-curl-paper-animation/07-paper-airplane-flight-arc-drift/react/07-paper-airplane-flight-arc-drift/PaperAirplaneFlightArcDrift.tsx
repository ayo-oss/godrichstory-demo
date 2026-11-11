import { useEffect, useRef } from "react";
import styles from "./PaperAirplaneFlightArcDrift.module.scss";

export default function PaperAirplaneFlightArcDrift() {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    if (!root || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const wrap = canvas.parentElement as HTMLElement;

    const LW = 320, LH = 200;
    const LAUNCH = { x: 30, y: 158 };
    const LAND = { x: 296, y: 66 };
    const ARC_HEIGHT = 60;
    const DRIFT_AMPLITUDE_PX = 8;
    const DRIFT_CYCLES = 2.4;
    const FLIGHT_MS = 900;
    const SCENE_BG = "#17141a";
    const PAPER = "#fff7e6";
    const PLANE_SCALE = 4.5;
    const FLOOR_Y = 184;

    function seedRand(seed: number) {
      let s = seed >>> 0;
      return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    }
    const rand = seedRand(41307);
    function clamp(v: number, a: number, b: number): number { return v < a ? a : v > b ? b : v; }
    function lerp(a: number, b: number, t: number): number { return a + (b - a) * t; }

    function driftFlight(t: number): { x: number; y: number } {
      const x = lerp(LAUNCH.x, LAND.x, t) + Math.sin(t * DRIFT_CYCLES * Math.PI * 2) * DRIFT_AMPLITUDE_PX;
      const y = lerp(LAUNCH.y, LAND.y, t) - ARC_HEIGHT * 4 * t * (1 - t);
      return { x, y };
    }

    let pos = driftFlight(0), heading = 0, curT = 0;
    let trail: { x: number; y: number }[] = [];
    const TRAIL_MAX = 18;

    function drawShadow(x: number, t: number): void {
      const alt = ARC_HEIGHT * 4 * t * (1 - t);
      const rx = clamp(34 - alt * 0.28, 8, 34);
      const ry = rx * 0.36;
      const alpha = clamp(0.32 - alt * 0.003, 0.06, 0.32);
      ctx!.fillStyle = "rgba(10,8,12," + alpha + ")";
      ctx!.beginPath();
      ctx!.ellipse(x, FLOOR_Y, rx, ry, 0, 0, Math.PI * 2);
      ctx!.fill();
    }

    function drawPlane(x: number, y: number, angle: number): void {
      ctx!.save();
      ctx!.translate(x, y);
      ctx!.rotate(angle);
      ctx!.scale(PLANE_SCALE, PLANE_SCALE);
      ctx!.fillStyle = PAPER;
      ctx!.beginPath();
      ctx!.moveTo(14, 0);
      ctx!.lineTo(-10, -7);
      ctx!.lineTo(-4, 0);
      ctx!.lineTo(-10, 7);
      ctx!.closePath();
      ctx!.fill();
      ctx!.fillStyle = "rgba(23,20,26,.22)";
      ctx!.beginPath();
      ctx!.moveTo(14, 0);
      ctx!.lineTo(-4, -0.5);
      ctx!.lineTo(-4, 0.5);
      ctx!.closePath();
      ctx!.fill();
      ctx!.restore();
    }

    function draw(): void {
      ctx!.fillStyle = SCENE_BG;
      ctx!.fillRect(0, 0, LW, LH);

      ctx!.strokeStyle = "rgba(255,247,230,.14)";
      ctx!.lineWidth = 1.5;
      ctx!.beginPath();
      for (let i = 0; i <= 30; i += 1) {
        const p = driftFlight(i / 30);
        if (i === 0) ctx!.moveTo(p.x, p.y); else ctx!.lineTo(p.x, p.y);
      }
      ctx!.stroke();

      drawShadow(pos.x, curT);

      for (let j = 0; j < trail.length; j += 1) {
        const tp = trail[j];
        const a = ((j + 1) / trail.length) * 0.55;
        ctx!.fillStyle = "rgba(255,247,230," + a + ")";
        ctx!.beginPath(); ctx!.arc(tp.x, tp.y, 3.4, 0, Math.PI * 2); ctx!.fill();
      }
      drawPlane(pos.x, pos.y, heading);
    }

    function update(dt: number, tMs: number): void {
      if (reduce) return;
      const t = (tMs % FLIGHT_MS) / FLIGHT_MS;
      curT = t;
      const next = driftFlight(t);
      const ahead = driftFlight(Math.min(1, t + 0.01));
      heading = Math.atan2(ahead.y - next.y, ahead.x - next.x);
      pos = next;
      trail.push({ x: pos.x, y: pos.y });
      if (trail.length > TRAIL_MAX) trail.shift();
      if (t < 0.02) trail = [];
    }

    let cw = 480, ch = 300, sx = 1, sy = 1;
    function fit(): void {
      const r = wrap.getBoundingClientRect();
      cw = Math.max(1, Math.round(r.width));
      ch = Math.max(1, Math.round(r.height));
      canvas!.width = cw; canvas!.height = ch;
      sx = cw / LW; sy = ch / LH;
      render();
    }
    function render(): void {
      ctx!.setTransform(1, 0, 0, 1, 0, 0);
      ctx!.clearRect(0, 0, cw, ch);
      ctx!.save();
      ctx!.scale(sx, sy);
      draw();
      ctx!.restore();
    }

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const playing = !reduce;
    if (reduce) {
      root.classList.remove("is-demo");
      pos = driftFlight(0.5);
      curT = 0.5;
      const a2 = driftFlight(0.51);
      heading = Math.atan2(a2.y - pos.y, a2.x - pos.x);
    }

    let lastTs: number | null = null;
    let raf = 0;
    function tick(ts: number): void {
      if (lastTs === null) lastTs = ts;
      const dt = Math.min((ts - lastTs) / 1000, 0.05);
      lastTs = ts;
      if (playing) update(dt, ts);
      render();
      raf = requestAnimationFrame(tick);
    }
    fit();
    window.addEventListener("resize", fit);
    render();
    if (playing) raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", fit);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={`${styles.vd} is-demo`} ref={rootRef}>
        <canvas className={styles.vd__canvas} ref={canvasRef} width={480} height={300} />
        <p className={styles.vd__caption}>포물선과 흔들림 값으로 나는 종이비행기</p>
      </div>
    </main>
  );
}
