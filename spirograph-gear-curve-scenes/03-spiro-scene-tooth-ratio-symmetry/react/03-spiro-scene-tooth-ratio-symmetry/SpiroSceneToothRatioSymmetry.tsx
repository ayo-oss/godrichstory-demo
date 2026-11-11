import { useEffect, useRef } from "react";
import styles from "./SpiroSceneToothRatioSymmetry.module.scss";

type Pt = { x: number; y: number };

export default function SpiroSceneToothRatioSymmetry() {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const badgeRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    const badge = badgeRef.current;
    if (!root || !canvas || !badge) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const wrap = canvas.parentElement as HTMLElement;

    const CALC_DIM = 200;
    const GEAR_RING_TEETH = 90;
    const GEAR_ROLL_TEETH = 24;
    const PEN_RADIUS_RATIO = 0.6;
    const TOOTH_UNIT = 0.8;
    const SEGMENTS_PER_TURN = 220;

    function gcd(a: number, b: number): number {
      a = Math.abs(a); b = Math.abs(b);
      while (b) { const t = b; b = a % b; a = t; }
      return a;
    }

    const R = GEAR_RING_TEETH * TOOTH_UNIT;
    const r = GEAR_ROLL_TEETH * TOOTH_UNIT;
    const d = r * PEN_RADIUS_RATIO;
    const g = gcd(GEAR_RING_TEETH, GEAR_ROLL_TEETH);
    const AXIS_COUNT = GEAR_RING_TEETH / g;
    const TURN_COUNT = GEAR_ROLL_TEETH / g;
    const TOTAL_T = TURN_COUNT * Math.PI * 2;
    const CYCLE_SECONDS = 6;
    const SPEED = TOTAL_T / CYCLE_SECONDS;

    badge.textContent = "대칭 축 " + AXIS_COUNT + "개 · " + TURN_COUNT + "바퀴 닫힘";

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
      const wash = ctx!.createRadialGradient(tipW.x, tipW.y, 0, tipW.x, tipW.y, Math.max(cw, ch) * 0.9);
      wash.addColorStop(0, 'rgba(255,255,255,.60)');
      wash.addColorStop(0.5, 'rgba(255,225,170,.32)');
      wash.addColorStop(1, 'rgba(200,190,255,.16)');
      ctx!.fillStyle = wash;
      ctx!.fillRect(0, 0, cw, ch);
      const fillSteps = Math.max(2, Math.round((tMax / (Math.PI * 2)) * SEGMENTS_PER_TURN));
      ctx!.beginPath();
      for (let fi = 0; fi <= fillSteps; fi += 1) {
        const fs = toScreen(point((fi / fillSteps) * tMax));
        if (fi === 0) ctx!.moveTo(fs.x, fs.y); else ctx!.lineTo(fs.x, fs.y);
      }
      ctx!.closePath();
      ctx!.fillStyle = 'rgba(255,247,230,.18)';
      ctx!.fill('evenodd');
      ctx!.lineWidth = Math.max(3, scale * 0.04);
      ctx!.strokeStyle = "rgba(255,247,230,.94)";
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
      <div className={`${styles.sp3} is-demo`} ref={rootRef} tabIndex={0}>
        <canvas className={styles.sp3__canvas} ref={canvasRef} width={480} height={300} />
        <p className={styles.sp3__badge} ref={badgeRef} />
        <p className={styles.sp3__caption}>두 톱니 이빨 수의 최대공약수로 무늬의 꽃잎 수를 계산해, 비율이 바뀌면 대칭 축 수가 그 값에 맞춰 다시 정해지고 곡선이 닫히는 바퀴 수도 함께 바뀐다</p>
      </div>
    </main>
  );
}
