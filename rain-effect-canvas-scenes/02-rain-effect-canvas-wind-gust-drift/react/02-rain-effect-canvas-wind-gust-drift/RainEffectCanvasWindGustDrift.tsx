import { useEffect, useRef } from "react";
import styles from "./RainEffectCanvasWindGustDrift.module.scss";

type Streak = { x: number; y: number; speed: number; thick: number };

export default function RainEffectCanvasWindGustDrift() {
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
    const WIND_GUST_MAX_DEG = 8;
    const RAIN_WIND_CYCLE_MS = 5200;
    const RAIN_STREAK_COUNT = 70;
    const RAIN_FALL_SPEED_PX_S = 130;

    function seedRand(seed: number) {
      let s = seed >>> 0;
      return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    }
    const rRand = seedRand(431022);

    function windGustAngle(nowMs: number) {
      const a = Math.sin((nowMs / RAIN_WIND_CYCLE_MS) * Math.PI * 2) * 0.62;
      const b = Math.sin((nowMs / (RAIN_WIND_CYCLE_MS * 1.73)) * Math.PI * 2 + 1.3) * 0.38;
      return (a + b) * WIND_GUST_MAX_DEG;
    }

    const streaks: Streak[] = [];
    for (let i = 0; i < RAIN_STREAK_COUNT; i += 1) {
      streaks.push({
        x: rRand() * CALC_W,
        y: rRand() * CALC_H,
        speed: RAIN_FALL_SPEED_PX_S * (0.6 + rRand() * 0.7),
        thick: 0.8 + rRand() * 1.4
      });
    }

    let elapsed = 0;
    function stepSim(dtS: number, nowMs: number) {
      const deg = windGustAngle(nowMs);
      const rad = (deg * Math.PI) / 180;
      const sinA = Math.sin(rad), cosA = Math.cos(rad);
      for (let i = 0; i < streaks.length; i += 1) {
        const s = streaks[i];
        s.y += s.speed * cosA * dtS;
        s.x += s.speed * sinA * dtS;
        if (s.y > CALC_H + 6) { s.y = -6 - rRand() * 8; s.x = rRand() * CALC_W; }
        if (s.x < -6) s.x = CALC_W + 6;
        if (s.x > CALC_W + 6) s.x = -6;
      }
    }

    let cw = 480, ch = 300;
    function draw(nowMs: number) {
      const sx = cw / CALC_W, sy = ch / CALC_H;
      const deg = windGustAngle(nowMs);
      const rad = (deg * Math.PI) / 180;
      const lx = Math.sin(rad), ly = Math.cos(rad);
      ctx!.clearRect(0, 0, cw, ch);
      for (let i = 0; i < streaks.length; i += 1) {
        const s = streaks[i];
        const len = 5 + s.speed * 0.03;
        const x0 = s.x * sx, y0 = s.y * sy;
        const x1 = (s.x - lx * len) * sx, y1 = (s.y - ly * len) * sy;
        ctx!.strokeStyle = "rgba(20,26,54,.7)";
        ctx!.lineWidth = Math.max(0.6, s.thick * ((sx + sy) / 2));
        ctx!.beginPath();
        ctx!.moveTo(x0, y0);
        ctx!.lineTo(x1, y1);
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
    if (reduce) root.classList.remove("is-demo");
    const warmSteps = reduce ? 130 : 40;
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
        <p className={styles.rn__caption}>느리게 흔들리는 파형 값으로 바람의 세기와 각도를 계속 다시 계산해, 빗줄기 전체의 기울기와 낙하 속도가 같은 바람 값을 따라 함께 기운다</p>
      </div>
    </main>
  );
}
