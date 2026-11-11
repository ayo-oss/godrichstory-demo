import { useEffect, useRef } from "react";
import styles from "./SpiroSceneTrailFadeDraw.module.scss";

type Pt = { x: number; y: number };

export default function SpiroSceneTrailFadeDraw() {
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
    const GEAR_RING_TEETH = 54;
    const GEAR_ROLL_TEETH = 20;
    const PEN_TIP_RATIO = 0.6;
    const TOOTH_UNIT = 0.9;
    const TRAIL_FADE_FRAMES = 240;
    const STEP_MS = 1000 / 60;
    const ANGLE_SPEED = 4.2;
    const FADE_ALPHA = Math.min(1, 3.0 / TRAIL_FADE_FRAMES);

    const R = GEAR_RING_TEETH * TOOTH_UNIT;
    const r = GEAR_ROLL_TEETH * TOOTH_UNIT;
    const d = r * PEN_TIP_RATIO;

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

    let t = 0;
    let prev: Pt = { x: cx, y: cy };

    function resetCanvas() {
      ctx!.fillStyle = "#17141a";
      ctx!.fillRect(0, 0, cw, ch);
      prev = toScreen(point(t));
    }

    function simStep() {
      ctx!.fillStyle = "rgba(23,20,26," + FADE_ALPHA + ")";
      ctx!.fillRect(0, 0, cw, ch);
      t += ANGLE_SPEED * (STEP_MS / 1000);
      const p = toScreen(point(t));
      ctx!.strokeStyle = "rgba(255,247,230,.95)";
      ctx!.shadowColor = 'rgba(255,214,200,.7)';
      ctx!.shadowBlur = Math.max(8, scale * 0.14);
      ctx!.lineWidth = Math.max(3, scale * 0.045);
      ctx!.lineJoin = "round";
      ctx!.lineCap = "round";
      ctx!.beginPath();
      ctx!.moveTo(prev.x, prev.y);
      ctx!.lineTo(p.x, p.y);
      ctx!.stroke();
      ctx!.shadowBlur = 0;
      const halo = ctx!.createRadialGradient(p.x, p.y, 0, p.x, p.y, Math.max(cw, ch) * 0.34);
      halo.addColorStop(0, 'rgba(255,200,215,.075)');
      halo.addColorStop(0.5, 'rgba(190,225,255,.04)');
      halo.addColorStop(1, 'rgba(190,225,255,0)');
      ctx!.fillStyle = halo;
      ctx!.fillRect(0, 0, cw, ch);
      prev = p;
    }

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) root.classList.remove("is-demo");
    fit();
    resetCanvas();

    let raf = 0;
    if (reduce) {
      const warm = TRAIL_FADE_FRAMES * 2.4;
      for (let w = 0; w < warm; w += 1) simStep();
    } else {
      let acc = 0;
      let lastTs: number | null = null;
      const onResize = () => { fit(); resetCanvas(); };
      function tick(ts: number) {
        if (lastTs === null) lastTs = ts;
        const dt = Math.min(ts - lastTs, 48);
        lastTs = ts;
        acc += dt;
        let guard = 0;
        while (acc >= STEP_MS && guard < 6) {
          simStep();
          acc -= STEP_MS;
          guard += 1;
        }
        raf = requestAnimationFrame(tick);
      }
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
      <div className={`${styles.sp5} is-demo`} ref={rootRef} tabIndex={0}>
        <canvas className={styles.sp5__canvas} ref={canvasRef} width={480} height={300} />
        <p className={styles.sp5__caption}>지난 프레임의 선을 프레임마다 조금씩 투명하게 덮어쓰고 새 궤적을 맨 앞에 얹어, 펜이 지나간 자리가 시간에 따라 옅어지는 그리기 장면을 만든다</p>
      </div>
    </main>
  );
}
