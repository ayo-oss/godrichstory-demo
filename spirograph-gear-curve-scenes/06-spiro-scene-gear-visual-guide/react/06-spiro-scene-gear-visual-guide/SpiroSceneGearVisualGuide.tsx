import { useEffect, useRef } from "react";
import styles from "./SpiroSceneGearVisualGuide.module.scss";

type Pt = { x: number; y: number };

export default function SpiroSceneGearVisualGuide() {
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
    const GEAR_RING_TEETH = 60;
    const GEAR_ROLL_TEETH = 24;
    const PEN_TIP_RATIO = 0.62;
    const TOOTH_UNIT = 1.3;
    const SEGMENTS_PER_TURN = 200;
    const CYCLE_SECONDS = 6;
    const HOLD_FRACTION = 0.84;

    function gcd(a: number, b: number): number { while (b) { const t = b; b = a % b; a = t; } return a; }
    const g = gcd(GEAR_RING_TEETH, GEAR_ROLL_TEETH);
    const TURNS = GEAR_ROLL_TEETH / g;
    const AXIS_COUNT = GEAR_RING_TEETH / g;

    const R = GEAR_RING_TEETH * TOOTH_UNIT;
    const r = GEAR_ROLL_TEETH * TOOTH_UNIT;
    const d = r * PEN_TIP_RATIO;
    const K = (R - r) / r;

    function penAt(t: number): Pt {
      return {
        x: (R - r) * Math.cos(t) + d * Math.cos(K * t),
        y: (R - r) * Math.sin(t) - d * Math.sin(K * t)
      };
    }
    function rollCenterAt(t: number): Pt {
      return { x: (R - r) * Math.cos(t), y: (R - r) * Math.sin(t) };
    }

    let cw = 480, ch = 300, scale = 1, cx = 240, cy = 150;
    function fit() {
      const rect = wrap.getBoundingClientRect();
      cw = Math.max(1, Math.round(rect.width));
      ch = Math.max(1, Math.round(rect.height));
      canvas!.width = cw; canvas!.height = ch;
      scale = Math.min(cw, ch) / CALC_DIM * 0.82;
      cx = cw / 2; cy = ch / 2;
    }
    function toScreen(p: Pt): Pt { return { x: cx + p.x * scale, y: cy + p.y * scale }; }

    const maxT = 2 * Math.PI * TURNS;
    const dtSample = (2 * Math.PI) / SEGMENTS_PER_TURN;

    function render(progress: number) {
      const t = maxT * Math.min(progress / HOLD_FRACTION, 1);

      ctx!.fillStyle = "#ffd23f";
      ctx!.fillRect(0, 0, cw, ch);
      const tipW = toScreen(penAt(t));
      const wash = ctx!.createRadialGradient(tipW.x, tipW.y, 0, tipW.x, tipW.y, Math.max(cw, ch) * 0.9);
      wash.addColorStop(0, 'rgba(255,255,255,.62)');
      wash.addColorStop(0.5, 'rgba(255,190,215,.32)');
      wash.addColorStop(1, 'rgba(190,225,255,.14)');
      ctx!.fillStyle = wash;
      ctx!.fillRect(0, 0, cw, ch);
      const rcW = toScreen(rollCenterAt(t));
      ctx!.beginPath();
      ctx!.arc(rcW.x, rcW.y, r * scale, 0, Math.PI * 2);
      ctx!.fillStyle = 'rgba(190,225,255,.38)';
      ctx!.fill();

      const ringCenter = toScreen({ x: 0, y: 0 });
      ctx!.beginPath();
      ctx!.arc(ringCenter.x, ringCenter.y, R * scale, 0, Math.PI * 2);
      ctx!.strokeStyle = "rgba(23,20,26,.22)";
      ctx!.lineWidth = Math.max(1.4, scale * 0.02);
      ctx!.stroke();

      ctx!.beginPath();
      let first = true;
      for (let tt = 0; tt <= t; tt += dtSample) {
        const p = toScreen(penAt(tt));
        if (first) { ctx!.moveTo(p.x, p.y); first = false; } else { ctx!.lineTo(p.x, p.y); }
      }
      ctx!.save();
      ctx!.fillStyle = "rgba(23,20,26,.10)";
      ctx!.fill("evenodd");
      ctx!.restore();
      ctx!.strokeStyle = "rgba(23,20,26,.9)";
      ctx!.lineWidth = Math.max(3, scale * 0.04);
      ctx!.lineJoin = "round"; ctx!.lineCap = "round";
      ctx!.stroke();

      const rc = rollCenterAt(t);
      const rcS = toScreen(rc);
      ctx!.beginPath();
      ctx!.arc(rcS.x, rcS.y, r * scale, 0, Math.PI * 2);
      ctx!.strokeStyle = "rgba(10,79,232,.75)";
      ctx!.lineWidth = Math.max(1.6, scale * 0.024);
      ctx!.stroke();

      const pen = toScreen(penAt(t));
      ctx!.beginPath();
      ctx!.moveTo(rcS.x, rcS.y);
      ctx!.lineTo(pen.x, pen.y);
      ctx!.strokeStyle = "rgba(10,79,232,.75)";
      ctx!.lineWidth = Math.max(1.4, scale * 0.018);
      ctx!.stroke();

      ctx!.beginPath();
      ctx!.arc(pen.x, pen.y, Math.max(3, scale * 0.05), 0, Math.PI * 2);
      ctx!.fillStyle = "rgba(23,20,26,.92)";
      ctx!.fill();

      const deg = Math.round((((t * 180 / Math.PI) % 360) + 360) % 360);
      badge!.textContent = "접점 각도 " + deg + "° · 대칭 축 " + AXIS_COUNT + "개";
    }

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    fit();
    let raf = 0;
    if (reduce) {
      root.classList.remove("is-demo");
      render(HOLD_FRACTION);
    } else {
      let startTs: number | null = null;
      const onResize = () => { fit(); };
      function tick(ts: number) {
        if (startTs === null) startTs = ts;
        const elapsed = (ts - startTs) / 1000;
        const progress = (elapsed % CYCLE_SECONDS) / CYCLE_SECONDS;
        render(progress);
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
      <div className={`${styles.sp6} is-demo`} ref={rootRef} tabIndex={0}>
        <canvas className={styles.sp6__canvas} ref={canvasRef} width={480} height={300} />
        <p className={styles.sp6__badge} ref={badgeRef} />
        <p className={styles.sp6__caption}>굴러가는 톱니바퀴와 펜 위치를 곡선 위에 함께 그려 지금의 각도와 접점을 계속 보여주고, 톱니가 도는 방향과 궤적이 이어지는 관계를 한눈에 따라갈 수 있게 한다</p>
      </div>
    </main>
  );
}
