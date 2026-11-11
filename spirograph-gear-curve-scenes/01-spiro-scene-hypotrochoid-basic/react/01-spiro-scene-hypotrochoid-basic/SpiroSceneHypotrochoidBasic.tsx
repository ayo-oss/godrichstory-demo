import { useEffect, useRef } from "react";
import styles from "./SpiroSceneHypotrochoidBasic.module.scss";

type Pt = { x: number; y: number };

export default function SpiroSceneHypotrochoidBasic() {
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
    const GEAR_RING_TEETH = 72;
    const GEAR_ROLL_TEETH = 27;
    const PEN_TIP_RATIO = 0.6;
    const TOOTH_UNIT = 1.4;
    const SEGMENTS_PER_TURN = 220;

    function gcd(a: number, b: number): number {
      a = Math.abs(a); b = Math.abs(b);
      while (b) { const t = b; b = a % b; a = t; }
      return a;
    }

    const R = GEAR_RING_TEETH * TOOTH_UNIT;
    const r = GEAR_ROLL_TEETH * TOOTH_UNIT;
    const d = r * PEN_TIP_RATIO;
    const g = gcd(GEAR_RING_TEETH, GEAR_ROLL_TEETH);
    const TURNS = GEAR_ROLL_TEETH / g;
    const TOTAL_T = TURNS * Math.PI * 2;
    const CYCLE_SECONDS = 6;
    const SPEED = TOTAL_T / CYCLE_SECONDS;

    function point(t: number): Pt {
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

    function drawFull(tMax: number) {
      ctx!.clearRect(0, 0, cw, ch);
      const tipW = toScreen(point(tMax));
      const wash = ctx!.createRadialGradient(tipW.x, tipW.y, 0, tipW.x, tipW.y, Math.max(cw, ch) * 0.85);
      wash.addColorStop(0, "rgba(255,214,200,.55)");
      wash.addColorStop(0.5, "rgba(200,190,255,.28)");
      wash.addColorStop(1, "rgba(160,230,220,.10)");
      ctx!.fillStyle = wash;
      ctx!.fillRect(0, 0, cw, ch);
      const fillSteps = Math.max(2, Math.round((tMax / (Math.PI * 2)) * SEGMENTS_PER_TURN));
      ctx!.beginPath();
      for (let fi = 0; fi <= fillSteps; fi += 1) {
        const fs = toScreen(point((fi / fillSteps) * tMax));
        if (fi === 0) ctx!.moveTo(fs.x, fs.y); else ctx!.lineTo(fs.x, fs.y);
      }
      ctx!.closePath();
      ctx!.fillStyle = "rgba(255,247,230,.16)";
      ctx!.fill("evenodd");
      ctx!.lineWidth = Math.max(3, scale * 0.04);
      ctx!.strokeStyle = "rgba(255,247,230,.94)";
      ctx!.shadowColor = "rgba(255,247,230,.55)";
      ctx!.shadowBlur = Math.max(8, scale * 0.12);
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
      ctx!.shadowBlur = 0;
      if (tMax > 0.001) {
        const tip = toScreen(point(tMax));
        ctx!.fillStyle = "rgba(255,247,230,1)";
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
      let elapsed = 0.35;
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
      <div className={`${styles.sp1} is-demo`} ref={rootRef} tabIndex={0}>
        <canvas className={styles.sp1__canvas} ref={canvasRef} width={480} height={300} />
        <p className={styles.sp1__caption}>작은 톱니가 큰 링 안쪽을 미끄러지며 도는 동안 펜 위치를 링 중심 기준 각도로 계산해, 안쪽으로 말리는 궤적을 선으로 쌓는다</p>
      </div>
    </main>
  );
}
