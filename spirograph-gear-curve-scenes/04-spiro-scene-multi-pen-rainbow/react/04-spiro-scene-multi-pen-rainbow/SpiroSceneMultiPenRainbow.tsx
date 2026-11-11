import { useEffect, useRef } from "react";
import styles from "./SpiroSceneMultiPenRainbow.module.scss";

type Pt = { x: number; y: number };

export default function SpiroSceneMultiPenRainbow() {
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

    const CALC_DIM = 200;
    const GEAR_RING_TEETH = 78;
    const GEAR_ROLL_TEETH = 21;
    const TOOTH_UNIT = 0.7;
    const SEGMENTS_PER_TURN = 260;
    const PEN_RATIOS = [0.35, 0.5, 0.65, 0.8];
    const PEN_COLORS = ["rgba(230,90,120,.85)", "rgba(50,175,135,.85)", "rgba(70,130,230,.85)", "rgba(228,150,45,.85)"];

    function gcd(a: number, b: number): number {
      a = Math.abs(a); b = Math.abs(b);
      while (b) { const t = b; b = a % b; a = t; }
      return a;
    }

    const R = GEAR_RING_TEETH * TOOTH_UNIT;
    const r = GEAR_ROLL_TEETH * TOOTH_UNIT;
    const g = gcd(GEAR_RING_TEETH, GEAR_ROLL_TEETH);
    const TURNS = GEAR_ROLL_TEETH / g;
    const TOTAL_T = TURNS * Math.PI * 2;
    const CYCLE_SECONDS = 7;
    const SPEED = TOTAL_T / CYCLE_SECONDS;

    const phaseRand = seedRand(43304);
    const PEN_PHASE = PEN_RATIOS.map(function () { return phaseRand() * Math.PI * 2; });

    function point(t: number, d: number): Pt {
      const k = (R - r) / r;
      return {
        x: (R - r) * Math.cos(t) + d * Math.cos(k * t),
        y: (R - r) * Math.sin(t) - d * Math.sin(k * t)
      };
    }

    let cw = 480, ch = 300, scale = 1, cx = 240, cy = 150;
    function fit() {
      const rect = wrap.getBoundingClientRect();
      cw = Math.max(1, Math.round(rect.width));
      ch = Math.max(1, Math.round(rect.height));
      canvas!.width = cw; canvas!.height = ch;
      scale = Math.min(cw, ch) / CALC_DIM * 0.92;
      cx = cw / 2; cy = ch / 2;
    }

    function toScreen(p: Pt): Pt { return { x: cx + p.x * scale, y: cy + p.y * scale }; }

    function drawPen(idx: number, tMax: number) {
      const d = r * PEN_RATIOS[idx];
      const phase = PEN_PHASE[idx];
      ctx!.strokeStyle = PEN_COLORS[idx];
      ctx!.lineWidth = Math.max(2.4, scale * 0.032);
      ctx!.lineJoin = "round";
      ctx!.lineCap = "round";
      const steps = Math.max(2, Math.round((tMax / (Math.PI * 2)) * SEGMENTS_PER_TURN));
      ctx!.beginPath();
      for (let i = 0; i <= steps; i += 1) {
        const t = (i / steps) * tMax;
        const s = toScreen(point(t + phase, d));
        if (i === 0) ctx!.moveTo(s.x, s.y); else ctx!.lineTo(s.x, s.y);
      }
      ctx!.stroke();
      ctx!.save();
      ctx!.fillStyle = PEN_COLORS[idx].replace('.85', '.13');
      ctx!.fill('evenodd');
      ctx!.restore();
      if (tMax > 0.001) {
        const tip = toScreen(point(tMax + phase, d));
        ctx!.fillStyle = PEN_COLORS[idx];
        ctx!.beginPath();
        ctx!.arc(tip.x, tip.y, Math.max(2.6, scale * 0.042), 0, Math.PI * 2);
        ctx!.fill();
      }
    }

    function drawFull(tMax: number) {
      ctx!.clearRect(0, 0, cw, ch);
      const tipW = toScreen(point(tMax + PEN_PHASE[0], r * PEN_RATIOS[0]));
      const wash = ctx!.createRadialGradient(tipW.x, tipW.y, 0, tipW.x, tipW.y, Math.max(cw, ch) * 0.9);
      wash.addColorStop(0, 'rgba(255,200,215,.55)');
      wash.addColorStop(0.5, 'rgba(190,225,255,.32)');
      wash.addColorStop(1, 'rgba(200,240,215,.16)');
      ctx!.fillStyle = wash;
      ctx!.fillRect(0, 0, cw, ch);
      for (let i = 0; i < PEN_RATIOS.length; i += 1) drawPen(i, tMax);
    }

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) root.classList.remove("is-demo");
    fit();

    let raf = 0;
    if (reduce) {
      drawFull(TOTAL_T);
    } else {
      let elapsed = 0.3;
      let lastTs: number | null = null;
      const onResize = () => { fit(); drawFull(elapsed * SPEED); };
      function tick(ts: number) {
        if (lastTs === null) lastTs = ts;
        const dt = Math.min(ts - lastTs, 48);
        lastTs = ts;
        elapsed += dt / 1000;
        let t = elapsed * SPEED;
        if (t > TOTAL_T) { elapsed = 0; t = 0; }
        drawFull(t);
        raf = requestAnimationFrame(tick);
      }
      drawFull(elapsed * SPEED);
      window.addEventListener("resize", onResize);
      raf = requestAnimationFrame(tick);
      return () => {
        cancelAnimationFrame(raf);
        window.removeEventListener("resize", onResize);
      };
    }
    return () => { cancelAnimationFrame(raf); };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={`${styles.sp4} is-demo`} ref={rootRef} tabIndex={0}>
        <canvas className={styles.sp4__canvas} ref={canvasRef} width={480} height={300} />
        <p className={styles.sp4__caption}>같은 톱니의 펜 구멍 여러 개에 저마다 다른 색을 배정하고 각 구멍의 좌표를 따로 계산해, 한 번의 회전으로 색이 어긋나 겹치는 여러 겹의 무늬를 동시에 그린다</p>
      </div>
    </main>
  );
}
