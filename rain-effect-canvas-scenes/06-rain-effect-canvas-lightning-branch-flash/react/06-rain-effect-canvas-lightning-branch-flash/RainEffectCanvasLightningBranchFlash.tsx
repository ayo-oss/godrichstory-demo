import { useEffect, useRef } from "react";
import styles from "./RainEffectCanvasLightningBranchFlash.module.scss";

type Streak = { x: number; y: number; speed: number; thick: number };
type Seg = { x0: number; y0: number; x1: number; y1: number; depth: number };

export default function RainEffectCanvasLightningBranchFlash() {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    if (!root || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const wrap = canvas.parentElement as HTMLElement;

    const CALC_W = 160, CALC_H = 100;
    const LIGHTNING_STRIKE_PERIOD_MS = 1500;
    const LIGHTNING_FLASH_DECAY_MS = 220;
    const LIGHTNING_BOLT_FADE_MS = 900;
    const LIGHTNING_BRANCH_DEPTH = 4;
    const RAIN_STREAK_COUNT = 50;

    function seedRand(seed: number) {
      let s = seed >>> 0;
      return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    }
    const rRand = seedRand(431062);

    const streaks: Streak[] = [];
    for (let i = 0; i < RAIN_STREAK_COUNT; i += 1) {
      streaks.push({ x: rRand() * CALC_W, y: rRand() * CALC_H, speed: 110 + rRand() * 70, thick: 0.6 + rRand() * 1 });
    }

    function branchLightning(segs: Seg[], x: number, y: number, ang: number, len: number, depth: number) {
      if (depth <= 0 || len < 3) return;
      const steps = 3 + Math.floor(rRand() * 2);
      let cx = x, cy = y, cang = ang;
      for (let i = 0; i < steps; i += 1) {
        cang += (rRand() - 0.5) * 0.9;
        const stepLen = len / steps;
        const nx = cx + Math.sin(cang) * stepLen;
        const ny = cy + Math.cos(cang) * stepLen;
        segs.push({ x0: cx, y0: cy, x1: nx, y1: ny, depth });
        if (depth > 1 && rRand() < 0.3) {
          const side = rRand() < 0.5 ? -1 : 1;
          branchLightning(segs, nx, ny, cang + side * (0.6 + rRand() * 0.5), len * 0.5, depth - 1);
        }
        cx = nx; cy = ny;
      }
    }

    function makeBolt() {
      const segs: Seg[] = [];
      const startX = 24 + rRand() * 112;
      branchLightning(segs, startX, 0, 0, CALC_H * 0.94, LIGHTNING_BRANCH_DEPTH);
      return segs;
    }

    let bolt: Seg[] = [];
    let strikeAtMs = -99999;
    let lastStrikeIndex = -1;

    function updateStrike(nowMs: number) {
      const idx = Math.floor(nowMs / LIGHTNING_STRIKE_PERIOD_MS);
      if (idx !== lastStrikeIndex) {
        lastStrikeIndex = idx;
        bolt = makeBolt();
        strikeAtMs = nowMs;
      }
    }

    function stepSim(dtS: number, nowMs: number) {
      for (let i = 0; i < streaks.length; i += 1) {
        const s = streaks[i];
        s.y += s.speed * dtS;
        if (s.y > CALC_H + 4) { s.y = -4 - rRand() * 6; s.x = rRand() * CALC_W; }
      }
      updateStrike(nowMs);
    }

    let cw = 480, ch = 300;
    function draw(nowMs: number) {
      const sx = cw / CALC_W, sy = ch / CALC_H;
      const sinceStrike = nowMs - strikeAtMs;
      const flash = Math.exp(-Math.max(0, sinceStrike) / LIGHTNING_FLASH_DECAY_MS);
      const boltAlpha = Math.exp(-Math.max(0, sinceStrike) / LIGHTNING_BOLT_FADE_MS);

      ctx!.fillStyle = "rgba(20,17,10,1)";
      ctx!.fillRect(0, 0, cw, ch);

      if (flash > 0.02) {
        ctx!.fillStyle = "rgba(255,250,230," + (flash * 0.55).toFixed(3) + ")";
        ctx!.fillRect(0, 0, cw, ch);
      }

      ctx!.strokeStyle = "rgba(214,228,255,0.45)";
      ctx!.lineWidth = Math.max(0.6, 0.8 * ((sx + sy) / 2));
      for (let i = 0; i < streaks.length; i += 1) {
        const s = streaks[i];
        const x = s.x * sx, y0 = s.y * sy, y1 = (s.y - s.thick * 4) * sy;
        ctx!.beginPath();
        ctx!.moveTo(x, y0);
        ctx!.lineTo(x, y1);
        ctx!.stroke();
      }

      if (boltAlpha > 0.03 && bolt.length) {
        ctx!.save();
        ctx!.strokeStyle = "rgba(255,252,240," + boltAlpha.toFixed(3) + ")";
        ctx!.shadowColor = "rgba(255,246,200," + (boltAlpha * 0.8).toFixed(3) + ")";
        ctx!.shadowBlur = 8 * ((sx + sy) / 2);
        for (let b = 0; b < bolt.length; b += 1) {
          const seg = bolt[b];
          ctx!.lineWidth = Math.max(0.8, seg.depth * ((sx + sy) / 2) * 0.55);
          ctx!.beginPath();
          ctx!.moveTo(seg.x0 * sx, seg.y0 * sy);
          ctx!.lineTo(seg.x1 * sx, seg.y1 * sy);
          ctx!.stroke();
        }
        ctx!.restore();
      }
    }

    function fit() {
      const r = wrap.getBoundingClientRect();
      cw = Math.max(1, Math.round(r.width));
      ch = Math.max(1, Math.round(r.height));
      canvas!.width = cw; canvas!.height = ch;
      draw(elapsed);
    }

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let elapsed = 0;
    if (reduce) root.classList.remove("is-demo");
    const warmSteps = reduce ? 30 : 40;
    for (let w = 0; w < warmSteps; w += 1) { elapsed += 20; stepSim(0.02, elapsed); }

    let lastTs: number | null = null;
    let raf = 0;
    function tick(ts: number) {
      if (lastTs === null) lastTs = ts;
      const dt = Math.min(ts - lastTs, 48);
      lastTs = ts;
      if (!reduce) {
        elapsed += dt;
        stepSim(dt / 1000, elapsed);
        draw(elapsed);
      }
      raf = requestAnimationFrame(tick);
    }
    fit();
    window.addEventListener("resize", fit);
    draw(elapsed);
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", fit);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={`${styles.rn} is-demo`} ref={rootRef}>
        <canvas className={styles.rn__canvas} ref={canvasRef} width={480} height={300} />
        <p className={styles.rn__caption}>번개 줄기의 중간 지점을 반복해서 어긋나게 갈라 가지 모양 경로를 그리고, 동시에 화면 밝기를 빠르게 올렸다가 천천히 내리는 곡선으로 계산해 번쩍이는 순간을 만든다</p>
      </div>
    </main>
  );
}
