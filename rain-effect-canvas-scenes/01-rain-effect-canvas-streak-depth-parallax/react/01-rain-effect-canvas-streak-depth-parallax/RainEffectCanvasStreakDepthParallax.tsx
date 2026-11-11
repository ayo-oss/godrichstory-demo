import { useEffect, useRef } from "react";
import styles from "./RainEffectCanvasStreakDepthParallax.module.scss";

type Streak = { x: number; y: number; z: number; speed: number; thick: number; alpha: number; len: number };

export default function RainEffectCanvasStreakDepthParallax() {
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
    const RAIN_LAYER_COUNT = 4;
    const RAIN_NEAR_SPEED_PX_S = 150;
    const RAIN_FAR_SPEED_PX_S = 40;

    function seedRand(seed: number) {
      let s = seed >>> 0;
      return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    }
    const rRand = seedRand(431012);

    function streakDepthZ(layerIndex: number) {
      return RAIN_LAYER_COUNT <= 1 ? 1 : layerIndex / (RAIN_LAYER_COUNT - 1);
    }

    const streaks: Streak[] = [];
    for (let li = 0; li < RAIN_LAYER_COUNT; li += 1) {
      const z = streakDepthZ(li);
      const count = Math.round(32 - z * 18);
      const speed = RAIN_FAR_SPEED_PX_S + (RAIN_NEAR_SPEED_PX_S - RAIN_FAR_SPEED_PX_S) * z;
      const thick = 0.5 + z * 2.1;
      const alpha = 0.28 + z * 0.62;
      for (let i = 0; i < count; i += 1) {
        streaks.push({
          x: rRand() * CALC_W,
          y: rRand() * CALC_H,
          z, speed, thick, alpha,
          len: 4 + z * 12
        });
      }
    }
    streaks.sort((a, b) => a.z - b.z);

    function stepSim(dtS: number) {
      for (let i = 0; i < streaks.length; i += 1) {
        const s = streaks[i];
        s.y += s.speed * dtS;
        if (s.y - s.len > CALC_H + 4) {
          s.y = -4 - rRand() * 10;
          s.x = rRand() * CALC_W;
        }
      }
    }

    let cw = 480, ch = 300;
    function draw() {
      const sx = cw / CALC_W, sy = ch / CALC_H;
      ctx!.clearRect(0, 0, cw, ch);
      for (let i = 0; i < streaks.length; i += 1) {
        const s = streaks[i];
        const x = s.x * sx;
        const y0 = s.y * sy, y1 = (s.y - s.len) * sy;
        ctx!.strokeStyle = "rgba(214,232,255," + s.alpha + ")";
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
      draw();
    }

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) root.classList.remove("is-demo");
    const warmSteps = reduce ? 90 : 40;
    for (let w = 0; w < warmSteps; w += 1) stepSim(0.02);

    let lastTs: number | null = null;
    let raf = 0;
    function tick(ts: number) {
      if (lastTs === null) lastTs = ts;
      const dt = Math.min(ts - lastTs, 48);
      lastTs = ts;
      if (!reduce) {
        stepSim(dt / 1000);
        draw();
      }
      raf = requestAnimationFrame(tick);
    }
    fit();
    window.addEventListener("resize", fit);
    draw();
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
        <p className={styles.rn__caption}>빗줄기마다 가상의 거리를 부여해 굵기와 떨어지는 속도를 거리에 반비례하게 정하고, 가까운 줄기는 굵고 빠르게, 먼 줄기는 가늘고 느리게 떨어진다</p>
      </div>
    </main>
  );
}
