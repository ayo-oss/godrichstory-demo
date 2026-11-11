import { useEffect, useRef } from "react";
import styles from "./SpiroSceneHeroGalleryWall.module.scss";

type Pt = { x: number; y: number };
type Curve = { R: number; r: number; d: number; K: number; turns: number; maxT: number; patternRadius: number };
type Cell = { x: number; y: number; w: number; h: number; scale: number };

export default function SpiroSceneHeroGalleryWall() {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    if (!root || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const wrap = canvas.parentElement as HTMLElement;

    const HERO_CELL_COUNT = 4;
    const HERO_RING_TEETH = [60, 54, 48, 66];
    const HERO_ROLL_TEETH = [23, 19, 17, 25];
    const HERO_PEN_RATIO = 0.6;
    const HERO_TOOTH_UNIT = 0.62;
    const HERO_SPEED = [2.8, 3.4, 3.2, 3.8];
    const HERO_TRAIL_FADE_FRAMES = 180;
    const HERO_PEN_RATIOS = [0.35, 0.5, 0.65, 0.8];
    const HERO_PEN_COLORS = ["rgba(230,90,120,.85)", "rgba(50,175,135,.85)", "rgba(70,130,230,.85)", "rgba(228,150,45,.85)"];
    const HERO_STEP_MS = 1000 / 60;
    const HERO_FADE_ALPHA = Math.min(1, 3.0 / HERO_TRAIL_FADE_FRAMES);
    const HERO_GAP_FRACTION = 0.03;

    function gcd(a: number, b: number): number { while (b) { const t = b; b = a % b; a = t; } return a; }

    function makeCurve(ringTeeth: number, rollTeeth: number, penRatio: number): Curve {
      const R = ringTeeth * HERO_TOOTH_UNIT;
      const r = rollTeeth * HERO_TOOTH_UNIT;
      const d = r * penRatio;
      const K = (R - r) / r;
      const g = gcd(ringTeeth, rollTeeth);
      const turns = rollTeeth / g;
      return { R, r, d, K, turns, maxT: 2 * Math.PI * turns, patternRadius: R + d };
    }
    function pointOn(curve: Curve, t: number): Pt {
      return {
        x: (curve.R - curve.r) * Math.cos(t) + curve.d * Math.cos(curve.K * t),
        y: (curve.R - curve.r) * Math.sin(t) - curve.d * Math.sin(curve.K * t)
      };
    }

    const curveA = makeCurve(HERO_RING_TEETH[0], HERO_ROLL_TEETH[0], HERO_PEN_RATIO);
    const curveB = makeCurve(HERO_RING_TEETH[1], HERO_ROLL_TEETH[1], HERO_PEN_RATIO);
    const curveC = makeCurve(HERO_RING_TEETH[2], HERO_ROLL_TEETH[2], HERO_PEN_RATIO);
    const curveD = makeCurve(HERO_RING_TEETH[3], HERO_ROLL_TEETH[3], HERO_PEN_RATIO);

    function seedRand(seed: number) {
      let s = seed >>> 0;
      return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    }
    const randB = seedRand(43309);
    const penPhasesB: number[] = [];
    for (let pb = 0; pb < 4; pb += 1) penPhasesB.push(randB() * Math.PI * 2);

    let cw = 480, ch = 300;
    let cellW = 240, cellH = 150, gap = 6;
    let cellPix: Cell[] = [];
    const trailCanvas = document.createElement("canvas");
    const trailCtx = trailCanvas.getContext("2d")!;

    function fit() {
      const rect = wrap.getBoundingClientRect();
      cw = Math.max(1, Math.round(rect.width));
      ch = Math.max(1, Math.round(rect.height));
      canvas!.width = cw; canvas!.height = ch;
      cellW = cw / 2; cellH = ch / 2;
      gap = Math.min(cw, ch) * HERO_GAP_FRACTION;
      cellPix = [];
      const curves = [curveA, curveB, curveC, curveD];
      for (let k = 0; k < HERO_CELL_COUNT; k += 1) {
        const col = k % 2, row = Math.floor(k / 2);
        const pw = cellW - gap * 2, ph = cellH - gap * 2;
        const target = Math.min(pw, ph) / 2 * 0.88;
        const sc = target / (curves[k].patternRadius * 1.05);
        cellPix.push({ x: col * cellW + cellW / 2, y: row * cellH + cellH / 2, w: pw, h: ph, scale: sc });
      }
      trailCanvas.width = Math.max(1, Math.round(cellPix[2].w));
      trailCanvas.height = Math.max(1, Math.round(cellPix[2].h));
      trailCtx.fillStyle = "#17141a";
      trailCtx.fillRect(0, 0, trailCanvas.width, trailCanvas.height);
    }

    function drawProgressive(curve: Curve, cell: Cell, t: number, strokeStyle: string) {
      ctx!.save();
      ctx!.translate(cell.x, cell.y);
      ctx!.beginPath();
      const step = (2 * Math.PI) / 140;
      let first = true;
      for (let tt = 0; tt <= t; tt += step) {
        const p = pointOn(curve, tt);
        const sx = p.x * cell.scale, sy = p.y * cell.scale;
        if (first) { ctx!.moveTo(sx, sy); first = false; } else { ctx!.lineTo(sx, sy); }
      }
      const tipP = pointOn(curve, t);
      const wg = ctx!.createRadialGradient(tipP.x * cell.scale, tipP.y * cell.scale, 0, tipP.x * cell.scale, tipP.y * cell.scale, Math.max(cell.w, cell.h) * 0.8);
      wg.addColorStop(0, 'rgba(255,200,215,.42)');
      wg.addColorStop(0.5, 'rgba(190,225,255,.24)');
      wg.addColorStop(1, 'rgba(190,225,255,.06)');
      ctx!.save();
      ctx!.fillStyle = wg;
      ctx!.fillRect(-cell.w / 2, -cell.h / 2, cell.w, cell.h);
      ctx!.fillStyle = 'rgba(255,247,230,.14)';
      ctx!.fill('evenodd');
      ctx!.restore();
      ctx!.strokeStyle = strokeStyle;
      ctx!.lineWidth = Math.max(2.4, cell.scale * 0.045);
      ctx!.lineJoin = "round"; ctx!.lineCap = "round";
      ctx!.stroke();
      ctx!.restore();
    }

    function drawMultiPen(curve: Curve, cell: Cell, t: number) {
      ctx!.save();
      ctx!.translate(cell.x, cell.y);
      const step = (2 * Math.PI) / 140;
      const wb = ctx!.createRadialGradient(0, 0, 0, 0, 0, Math.max(cellPix[1].w, cellPix[1].h) * (0.45 + 0.2 * Math.sin(t * 0.9)));
      wb.addColorStop(0, 'rgba(255,200,215,.40)');
      wb.addColorStop(1, 'rgba(190,225,255,.08)');
      ctx!.fillStyle = wb;
      ctx!.fillRect(-cellPix[1].w / 2, -cellPix[1].h / 2, cellPix[1].w, cellPix[1].h);
      for (let pIdx = 0; pIdx < HERO_PEN_RATIOS.length; pIdx += 1) {
        const localCurve = { R: curve.R, r: curve.r, d: curve.r * HERO_PEN_RATIOS[pIdx], K: curve.K };
        const phase = penPhasesB[pIdx];
        ctx!.beginPath();
        let first = true;
        for (let tt = 0; tt <= t; tt += step) {
          const tp = tt + phase;
          const px = (localCurve.R - localCurve.r) * Math.cos(tp) + localCurve.d * Math.cos(localCurve.K * tp);
          const py = (localCurve.R - localCurve.r) * Math.sin(tp) - localCurve.d * Math.sin(localCurve.K * tp);
          const sx = px * cell.scale, sy = py * cell.scale;
          if (first) { ctx!.moveTo(sx, sy); first = false; } else { ctx!.lineTo(sx, sy); }
        }
        ctx!.strokeStyle = HERO_PEN_COLORS[pIdx];
        ctx!.lineWidth = Math.max(2.2, cell.scale * 0.04);
        ctx!.lineJoin = "round"; ctx!.lineCap = "round";
        ctx!.stroke();
      }
      ctx!.restore();
    }

    let trailAngle = 0;
    let trailPrev: Pt | null = null;
    function trailStep() {
      trailCtx.fillStyle = "rgba(23,20,26," + HERO_FADE_ALPHA + ")";
      trailCtx.fillRect(0, 0, trailCanvas.width, trailCanvas.height);
      trailAngle += HERO_SPEED[2] * (HERO_STEP_MS / 1000);
      const p = pointOn(curveC, trailAngle);
      const cell = cellPix[2];
      const sx = trailCanvas.width / 2 + p.x * cell.scale;
      const sy = trailCanvas.height / 2 + p.y * cell.scale;
      if (!trailPrev) trailPrev = { x: sx, y: sy };
      trailCtx.strokeStyle = "rgba(255,247,230,.95)";
      trailCtx.lineWidth = Math.max(2.6, cell.scale * 0.05);
      trailCtx.lineJoin = "round"; trailCtx.lineCap = "round";
      trailCtx.beginPath();
      trailCtx.moveTo(trailPrev.x, trailPrev.y);
      trailCtx.lineTo(sx, sy);
      trailCtx.stroke();
      const th = trailCtx.createRadialGradient(sx, sy, 0, sx, sy, Math.max(trailCanvas.width, trailCanvas.height) * 0.4);
      th.addColorStop(0, "rgba(255,200,215,.09)");
      th.addColorStop(1, "rgba(190,225,255,0)");
      trailCtx.fillStyle = th;
      trailCtx.fillRect(0, 0, trailCanvas.width, trailCanvas.height);
      trailPrev = { x: sx, y: sy };
    }

    let accMs = 0;
    function render(elapsed: number, dtMs: number | null) {
      ctx!.fillStyle = "#17141a";
      ctx!.fillRect(0, 0, cw, ch);

      const tA = (elapsed * HERO_SPEED[0]) % curveA.maxT;
      drawProgressive(curveA, cellPix[0], tA, "rgba(255,247,230,.95)");

      const tB = (elapsed * HERO_SPEED[1]) % curveB.maxT;
      drawMultiPen(curveB, cellPix[1], tB);

      if (dtMs !== null) {
        accMs += dtMs;
        let guard = 0;
        while (accMs >= HERO_STEP_MS && guard < 6) { trailStep(); accMs -= HERO_STEP_MS; guard += 1; }
      }
      ctx!.drawImage(trailCanvas, cellPix[2].x - cellPix[2].w / 2, cellPix[2].y - cellPix[2].h / 2, cellPix[2].w, cellPix[2].h);

      const tD = (elapsed * HERO_SPEED[3]) % curveD.maxT;
      drawProgressive(curveD, cellPix[3], tD, "rgba(91,140,248,.95)");
    }

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    fit();

    let raf = 0;
    if (reduce) {
      root.classList.remove("is-demo");
      for (let warm = 0; warm < HERO_TRAIL_FADE_FRAMES * 1.4; warm += 1) trailStep();
      render(curveA.maxT * 0.94, null);
    } else {
      let startTs: number | null = null;
      let lastTs = 0;
      const onResize = () => { fit(); };
      function tick(ts: number) {
        if (startTs === null) { startTs = ts; lastTs = ts; }
        const dt = Math.min(ts - lastTs, 48);
        lastTs = ts;
        const elapsed = (ts - startTs) / 1000;
        render(elapsed, dt);
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
      <div className={`${styles.sp9} is-demo`} ref={rootRef} tabIndex={0}>
        <canvas className={styles.sp9__canvas} ref={canvasRef} width={480} height={300} />
        <p className={styles.sp9__caption}>이빨 비율이 다른 곡선 여러 개를 같은 화면 격자에 놓고 각자 다른 속도로 그리게 해, 한눈에 무늬 사이의 차이를 비교하는 히어로 장면을 만든다</p>
      </div>
    </main>
  );
}
