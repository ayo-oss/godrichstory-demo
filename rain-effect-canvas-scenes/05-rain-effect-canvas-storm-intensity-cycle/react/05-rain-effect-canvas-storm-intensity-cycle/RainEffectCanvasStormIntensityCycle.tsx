import { useEffect, useRef } from "react";
import styles from "./RainEffectCanvasStormIntensityCycle.module.scss";

type Streak = { x: number; y: number; thresh: number; speed: number; thick: number };

export default function RainEffectCanvasStormIntensityCycle() {
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
    const STORM_CYCLE_MS = 9000;
    const RAIN_SPAWN_RATE_BASE = 18;
    const RAIN_POOL_SIZE = 110;

    function seedRand(seed: number) {
      let s = seed >>> 0;
      return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    }
    const rRand = seedRand(431052);

    function stormIntensity(nowMs: number) {
      return Math.sin((nowMs / STORM_CYCLE_MS) * Math.PI * 2 - Math.PI / 2) * 0.5 + 0.5;
    }

    const streaks: Streak[] = [];
    for (let i = 0; i < RAIN_POOL_SIZE; i += 1) {
      streaks.push({ x: rRand() * CALC_W, y: rRand() * CALC_H, thresh: rRand(), speed: 90 + rRand() * 90, thick: 0.7 + rRand() * 1.3 });
    }

    function stepSim(dtS: number, nowMs: number) {
      const inten = stormIntensity(nowMs);
      const wind = (inten - 0.5) * 20;
      for (let i = 0; i < streaks.length; i += 1) {
        const s = streaks[i];
        const visible = inten >= s.thresh * (1 - RAIN_SPAWN_RATE_BASE / 100);
        if (!visible) continue;
        s.y += s.speed * (0.6 + inten * 0.7) * dtS;
        s.x += wind * dtS;
        if (s.y > CALC_H + 6) { s.y = -6 - rRand() * 8; s.x = rRand() * CALC_W; }
        if (s.x < -6) s.x = CALC_W + 6;
        if (s.x > CALC_W + 6) s.x = -6;
      }
    }

    let cw = 480, ch = 300;
    function draw(nowMs: number) {
      const sx = cw / CALC_W, sy = ch / CALC_H;
      const inten = stormIntensity(nowMs);
      ctx!.clearRect(0, 0, cw, ch);
      ctx!.fillStyle = "rgba(6,8,20," + (inten * 0.4).toFixed(3) + ")";
      ctx!.fillRect(0, 0, cw, ch);
      for (let i = 0; i < streaks.length; i += 1) {
        const s = streaks[i];
        const visible = inten >= s.thresh * (1 - RAIN_SPAWN_RATE_BASE / 100);
        if (!visible) continue;
        const alpha = 0.35 + inten * 0.55;
        const x = s.x * sx, y0 = s.y * sy, y1 = (s.y - s.thick * 5) * sy;
        ctx!.strokeStyle = "rgba(214,228,255," + alpha + ")";
        ctx!.lineWidth = Math.max(0.6, s.thick * ((sx + sy) / 2));
        ctx!.beginPath();
        ctx!.moveTo(x, y0);
        ctx!.lineTo(x, y1);
        ctx!.stroke();
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
    let elapsed = 2200;
    if (reduce) root.classList.remove("is-demo");
    const warmSteps = reduce ? 0 : 40;
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
        <p className={styles.rn__caption}>느린 주기 함수 하나로 폭풍의 세기를 계속 오르내리게 하고, 그 값에 맞춰 빗줄기 개수와 바람 세기를 매 프레임 다시 계산해 장면 전체가 함께 약해지고 세진다</p>
      </div>
    </main>
  );
}
