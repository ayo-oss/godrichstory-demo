import { useEffect, useRef } from "react";
import styles from "./SpiroSceneEpitrochoidOuterRoll.module.scss";

type Pt = { x: number; y: number };

export default function SpiroSceneEpitrochoidOuterRoll() {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    if (!root || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const wrap = canvas.parentElement as HTMLElement;

    const CALC_DIM = 200;
    const GEAR_TEETH_OUTER = 96;
    const GEAR_ROLL_TEETH = 36;
    const PEN_TIP_RATIO = 0.6;
    const TOOTH_UNIT = 0.6;
    const SEGMENTS_PER_TURN = 240;

    function gcd(a: number, b: number): number {
      a = Math.abs(a); b = Math.abs(b);
      while (b) { const t = b; b = a % b; a = t; }
      return a;
    }

    const R = GEAR_TEETH_OUTER * TOOTH_UNIT;
    const r = GEAR_ROLL_TEETH * TOOTH_UNIT;
    const d = r * PEN_TIP_RATIO;
    const g = gcd(GEAR_TEETH_OUTER, GEAR_ROLL_TEETH);
    const TURNS = GEAR_ROLL_TEETH / g;
    const TOTAL_T = TURNS * Math.PI * 2;
    const CYCLE_SECONDS = 6;
    const SPEED = TOTAL_T / CYCLE_SECONDS;

    function point(t: number): Pt {
      const k = (R + r) / r;
      return {
        x: (R + r) * Math.cos(t) - d * Math.cos(k * t),
        y: (R + r) * Math.sin(t) - d * Math.sin(k * t)
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

    function drawFull(tMax: number) {
      ctx!.clearRect(0, 0, cw, ch);
      const tipW = toScreen(point(tMax));
      const wash = ctx!.createRadialGradient(tipW.x, tipW.y, 0, tipW.x, tipW.y, Math.max(cw, ch) * 0.9);
      wash.addColorStop(0, 'rgba(255,255,255,.60)');
      wash.addColorStop(0.5, 'rgba(255,190,215,.32)');
      wash.addColorStop(1, 'rgba(190,225,255,.14)');
      ctx!.fillStyle = wash;
      ctx!.fillRect(0, 0, cw, ch);
      const fillSteps = Math.max(2, Math.round((tMax / (Math.PI * 2)) * SEGMENTS_PER_TURN));
      ctx!.beginPath();
      for (let fi = 0; fi <= fillSteps; fi += 1) {
        const fs = toScreen(point((fi / fillSteps) * tMax));
        if (fi === 0) ctx!.moveTo(fs.x, fs.y); else ctx!.lineTo(fs.x, fs.y);
      }
      ctx!.closePath();
      ctx!.fillStyle = 'rgba(23,20,26,.12)';
      ctx!.fill('evenodd');
      ctx!.beginPath();
      ctx!.strokeStyle = "rgba(23,20,26,.16)";
      ctx!.lineWidth = Math.max(1, scale * 0.012);
      ctx!.arc(cx, cy, R * scale, 0, Math.PI * 2);
      ctx!.stroke();

      ctx!.lineWidth = Math.max(3, scale * 0.04);
      ctx!.strokeStyle = "rgba(23,20,26,.92)";
      ctx!.lineJoin = "round";
      ctx!.lineCap = "round";
      const steps = Math.max(2, Math.round((tMax / (Math.PI * 2)) * SEGMENTS_PER_TURN));
      ctx!.beginPath();
      for (let i = 0; i <= steps; i += 1) {
        const t = (i / steps) * tMax;
        const s = toScreen(point(t));
        if (i === 0) ctx!.moveTo(s.x, s.y); else ctx!.lineTo(s.x, s.y);
      }
      ctx!.stroke();
      if (tMax > 0.001) {
        const tip = toScreen(point(tMax));
        ctx!.fillStyle = "rgba(23,20,26,1)";
        ctx!.beginPath();
        ctx!.arc(tip.x, tip.y, Math.max(3, scale * 0.05), 0, Math.PI * 2);
        ctx!.fill();
      }
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
      <div className={`${styles.sp2} is-demo`} ref={rootRef} tabIndex={0}>
        <canvas className={styles.sp2__canvas} ref={canvasRef} width={480} height={300} />
        <p className={styles.sp2__caption}>작은 톱니가 링 바깥을 돌 때의 접점 각도를 매 프레임 다시 계산해, 안쪽 곡선과 반대로 바깥으로 뻗는 꽃잎 모양 궤적을 그린다</p>
      </div>
    </main>
  );
}
