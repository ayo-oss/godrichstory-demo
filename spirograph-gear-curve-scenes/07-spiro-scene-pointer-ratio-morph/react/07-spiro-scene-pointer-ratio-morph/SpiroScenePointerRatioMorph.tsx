import { useEffect, useRef } from "react";
import styles from "./SpiroScenePointerRatioMorph.module.scss";

type Pt = { x: number; y: number };

export default function SpiroScenePointerRatioMorph() {
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
    const RING_TEETH = 60;
    const ROLL_TEETH_MIN = 14;
    const ROLL_TEETH_MAX = 34;
    const PEN_TIP_RATIO = 0.6;
    const TOOTH_UNIT = 1.2;
    const SEGMENTS_PER_TURN = 170;
    const POINTER_MAX_DIST = 90;
    const ROTATE_SPEED = 0.15;
    const DEMO_CYCLE = 10;
    const KEY_STEP = 0.08;

    function gcd(a: number, b: number): number { while (b) { const t = b; b = a % b; a = t; } return a; }

    function computePath(rollTeeth: number): Pt[] {
      const R = RING_TEETH * TOOTH_UNIT;
      const r = rollTeeth * TOOTH_UNIT;
      const d = r * PEN_TIP_RATIO;
      const K = (R - r) / r;
      const g = gcd(RING_TEETH, rollTeeth);
      const turns = rollTeeth / g;
      const maxT = 2 * Math.PI * turns;
      const step = (2 * Math.PI) / SEGMENTS_PER_TURN;
      const pts: Pt[] = [];
      for (let t = 0; t <= maxT; t += step) {
        pts.push({
          x: (R - r) * Math.cos(t) + d * Math.cos(K * t),
          y: (R - r) * Math.sin(t) - d * Math.sin(K * t)
        });
      }
      return pts;
    }

    let ratioParam = 0.5;
    let currentRoll = -1;
    let pathData: Pt[] = [];
    let markerAngle = -Math.PI / 2;
    let markerDist = POINTER_MAX_DIST * 0.5;

    function rebuildForRatio(ratio: number) {
      ratioParam = Math.max(0, Math.min(1, ratio));
      const newRoll = Math.round(ROLL_TEETH_MIN + ratioParam * (ROLL_TEETH_MAX - ROLL_TEETH_MIN));
      if (newRoll !== currentRoll) {
        currentRoll = newRoll;
        pathData = computePath(currentRoll);
      }
    }

    function handlePointer(px: number, py: number) {
      const dist = Math.hypot(px, py);
      markerAngle = Math.atan2(py, px);
      markerDist = Math.min(POINTER_MAX_DIST, dist);
      rebuildForRatio(dist / POINTER_MAX_DIST);
    }

    rebuildForRatio(ratioParam);

    let cw = 480, ch = 300, scale = 1, cx = 240, cy = 150;
    function fit() {
      const rect = wrap.getBoundingClientRect();
      cw = Math.max(1, Math.round(rect.width));
      ch = Math.max(1, Math.round(rect.height));
      canvas!.width = cw; canvas!.height = ch;
      scale = Math.min(cw, ch) / CALC_DIM * 0.86;
      cx = cw / 2; cy = ch / 2;
    }

    let rot = 0;

    function render() {
      ctx!.fillStyle = "#ff4d1f";
      ctx!.fillRect(0, 0, cw, ch);

      ctx!.beginPath();
      ctx!.arc(cx, cy, POINTER_MAX_DIST * scale, 0, Math.PI * 2);
      ctx!.strokeStyle = "rgba(255,247,230,.28)";
      ctx!.lineWidth = Math.max(1, scale * 0.014);
      ctx!.setLineDash([scale * 0.05, scale * 0.06]);
      ctx!.stroke();
      ctx!.setLineDash([]);

      const cosR = Math.cos(rot), sinR = Math.sin(rot);
      ctx!.beginPath();
      for (let i = 0; i < pathData.length; i += 1) {
        const p = pathData[i];
        const rx = p.x * cosR - p.y * sinR;
        const ry = p.x * sinR + p.y * cosR;
        const sx = cx + rx * scale, sy = cy + ry * scale;
        if (i === 0) { ctx!.moveTo(sx, sy); } else { ctx!.lineTo(sx, sy); }
      }
      ctx!.strokeStyle = "rgba(255,247,230,.95)";
      ctx!.lineWidth = Math.max(2, scale * 0.026);
      ctx!.lineJoin = "round"; ctx!.lineCap = "round";
      ctx!.stroke();

      const mx = cx + Math.cos(markerAngle) * markerDist * scale;
      const my = cy + Math.sin(markerAngle) * markerDist * scale;
      ctx!.beginPath();
      ctx!.arc(mx, my, Math.max(4, scale * 0.06), 0, Math.PI * 2);
      ctx!.fillStyle = "rgba(23,20,26,.9)";
      ctx!.fill();
    }

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function onPointerMove(e: PointerEvent) {
      root!.classList.remove("is-demo");
      const rect = canvas!.getBoundingClientRect();
      const localX = (e.clientX - rect.left) - cw / 2;
      const localY = (e.clientY - rect.top) - ch / 2;
      handlePointer(localX / scale, localY / scale);
      if (reduce) render();
    }
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerdown", onPointerMove);

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        root!.classList.remove("is-demo");
        e.preventDefault();
        const next = ratioParam + (e.key === "ArrowRight" ? KEY_STEP : -KEY_STEP);
        rebuildForRatio(next);
        markerDist = ratioParam * POINTER_MAX_DIST;
        if (reduce) render();
      }
    }
    root.addEventListener("keydown", onKeyDown);

    fit();

    let raf = 0;
    if (reduce) {
      root.classList.remove("is-demo");
      render();
    } else {
      let startTs: number | null = null;
      let lastTs = 0;
      const onResize = () => { fit(); };
      function tick(ts: number) {
        if (startTs === null) { startTs = ts; lastTs = ts; }
        const dt = Math.min(ts - lastTs, 48);
        lastTs = ts;
        rot += ROTATE_SPEED * (dt / 1000);

        if (root!.classList.contains("is-demo")) {
          const elapsed = (ts - startTs) / 1000;
          const theta = elapsed * (2 * Math.PI / DEMO_CYCLE);
          const wave = (Math.sin(elapsed * (2 * Math.PI / (DEMO_CYCLE * 0.5))) + 1) / 2;
          const vx = Math.cos(theta) * wave * POINTER_MAX_DIST;
          const vy = Math.sin(theta) * wave * POINTER_MAX_DIST;
          handlePointer(vx, vy);
        }

        render();
        raf = requestAnimationFrame(tick);
      }
      window.addEventListener("resize", onResize);
      raf = requestAnimationFrame(tick);
      return () => {
        cancelAnimationFrame(raf);
        window.removeEventListener("resize", onResize);
        canvas!.removeEventListener("pointermove", onPointerMove);
        canvas!.removeEventListener("pointerdown", onPointerMove);
        root!.removeEventListener("keydown", onKeyDown);
      };
    }
    return () => {
      cancelAnimationFrame(raf);
      canvas!.removeEventListener("pointermove", onPointerMove);
      canvas!.removeEventListener("pointerdown", onPointerMove);
      root!.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={`${styles.sp7} is-demo`} ref={rootRef} tabIndex={0}>
        <canvas className={styles.sp7__canvas} ref={canvasRef} width={480} height={300} />
        <p className={styles.sp7__hint}>← →</p>
        <p className={styles.sp7__caption}>포인터가 화면 중심에서 멀어지는 만큼 톱니 이빨 수 값을 다시 계산해, 포인터를 움직이는 동안 무늬의 꽃잎 수와 촘촘함이 그 값에 따라 함께 바뀐다</p>
      </div>
    </main>
  );
}
