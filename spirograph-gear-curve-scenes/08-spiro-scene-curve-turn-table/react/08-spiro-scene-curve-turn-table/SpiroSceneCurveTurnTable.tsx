import { useEffect, useRef } from "react";
import styles from "./SpiroSceneCurveTurnTable.module.scss";

type Pt = { x: number; y: number };

export default function SpiroSceneCurveTurnTable() {
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
    const GEAR_RING_TEETH = 48;
    const GEAR_ROLL_TEETH = 18;
    const PEN_TIP_RATIO = 0.58;
    const TOOTH_UNIT = 1.6;
    const SEGMENTS_PER_TURN = 180;
    const ROTATE_SPEED = (2 * Math.PI) / 9;
    const GLOSS_SWEEP_SECONDS = 3.4;
    const DISC_RATIO = 0.82;

    function gcd(a: number, b: number): number { while (b) { const t = b; b = a % b; a = t; } return a; }
    const g = gcd(GEAR_RING_TEETH, GEAR_ROLL_TEETH);
    const TURNS = GEAR_ROLL_TEETH / g;

    const R = GEAR_RING_TEETH * TOOTH_UNIT;
    const r = GEAR_ROLL_TEETH * TOOTH_UNIT;
    const d = r * PEN_TIP_RATIO;
    const K = (R - r) / r;

    const pathData: Pt[] = (function () {
      const maxT = 2 * Math.PI * TURNS;
      const step = (2 * Math.PI) / SEGMENTS_PER_TURN;
      const pts: Pt[] = [];
      for (let t = 0; t <= maxT; t += step) {
        pts.push({
          x: (R - r) * Math.cos(t) + d * Math.cos(K * t),
          y: (R - r) * Math.sin(t) - d * Math.sin(K * t)
        });
      }
      return pts;
    })();
    const patternRadius = R + d;

    let cw = 480, ch = 300, scale = 1, cx = 240, cy = 150;
    function fit() {
      const rect = wrap.getBoundingClientRect();
      cw = Math.max(1, Math.round(rect.width));
      ch = Math.max(1, Math.round(rect.height));
      canvas!.width = cw; canvas!.height = ch;
      const targetDiscPx = Math.min(cw, ch) / 2 * DISC_RATIO;
      scale = targetDiscPx / (patternRadius * 1.08);
      cx = cw / 2; cy = ch / 2;
    }

    function render(rot: number, sweepProgress: number) {
      ctx!.fillStyle = "#ffffff";
      ctx!.fillRect(0, 0, cw, ch);

      const discR = patternRadius * scale * 1.08;

      const plate = ctx!.createRadialGradient(cx, cy, discR * 0.15, cx, cy, discR);
      plate.addColorStop(0, "#fff7e6");
      plate.addColorStop(0.75, "#f4ead4");
      plate.addColorStop(1, "#e6d8ba");
      ctx!.beginPath();
      ctx!.arc(cx, cy, discR, 0, Math.PI * 2);
      ctx!.fillStyle = plate;
      ctx!.fill();

      ctx!.save();
      ctx!.translate(cx, cy);
      ctx!.rotate(rot);
      ctx!.beginPath();
      for (let i = 0; i < pathData.length; i += 1) {
        const p = pathData[i];
        const sx = p.x * scale, sy = p.y * scale;
        if (i === 0) { ctx!.moveTo(sx, sy); } else { ctx!.lineTo(sx, sy); }
      }
      ctx!.closePath();
      ctx!.strokeStyle = "rgba(10,79,232,.82)";
      ctx!.lineWidth = Math.max(1.6, scale * 0.022);
      ctx!.lineJoin = "round";
      ctx!.stroke();
      ctx!.restore();

      ctx!.save();
      ctx!.beginPath();
      ctx!.arc(cx, cy, discR, 0, Math.PI * 2);
      ctx!.clip();
      const bandCenter = (sweepProgress * 2 - 0.5) * discR * 2.2;
      ctx!.translate(cx, cy);
      ctx!.rotate(-0.5);
      const glossGrad = ctx!.createLinearGradient(bandCenter - discR * 0.35, 0, bandCenter + discR * 0.35, 0);
      glossGrad.addColorStop(0, "rgba(255,255,255,0)");
      glossGrad.addColorStop(0.5, "rgba(255,255,255,.32)");
      glossGrad.addColorStop(1, "rgba(255,255,255,0)");
      ctx!.fillStyle = glossGrad;
      ctx!.fillRect(bandCenter - discR * 0.4, -discR * 1.5, discR * 0.8, discR * 3);
      ctx!.restore();
    }

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    fit();

    let raf = 0;
    if (reduce) {
      root.classList.remove("is-demo");
      render(0, 0.5);
    } else {
      let startTs: number | null = null;
      const onResize = () => { fit(); };
      function tick(ts: number) {
        if (startTs === null) startTs = ts;
        const elapsed = (ts - startTs) / 1000;
        const rot = elapsed * ROTATE_SPEED;
        const sweepProgress = (elapsed % GLOSS_SWEEP_SECONDS) / GLOSS_SWEEP_SECONDS;
        render(rot, sweepProgress);
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
      <div className={`${styles.sp8} is-demo`} ref={rootRef} tabIndex={0}>
        <canvas className={styles.sp8__canvas} ref={canvasRef} width={480} height={300} />
        <p className={styles.sp8__caption}>곡선이 다 그려진 뒤 캔버스 전체를 회전 변환으로 천천히 돌려 무늬의 대칭 축을 지나가는 순간마다 겹쳐 보이는 착시가 생기고, 회전 각도 값이 그 리듬을 정한다</p>
      </div>
    </main>
  );
}
