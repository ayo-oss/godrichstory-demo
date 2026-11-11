import { useEffect, useRef } from "react";
import styles from "./RainEffectCanvasGroundSplashPhysics.module.scss";

type Streak = { x: number; y: number; speed: number; thick: number };
type Splash = { x: number; y: number; vx: number; vy: number; born: number };

export default function RainEffectCanvasGroundSplashPhysics() {
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
    const GROUND_Y = 88;
    const SPLASH_PARTICLE_COUNT = 6;
    const SPLASH_GRAVITY_PX_S2 = 260;
    const SPLASH_LIFE_MS = 420;
    const RAIN_STREAK_COUNT = 46;

    function seedRand(seed: number) {
      let s = seed >>> 0;
      return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    }
    const rRand = seedRand(431043);
    const sRand = seedRand(431044);

    const streaks: Streak[] = [];
    for (let i = 0; i < RAIN_STREAK_COUNT; i += 1) {
      streaks.push({ x: rRand() * CALC_W, y: rRand() * GROUND_Y, speed: 120 + rRand() * 60, thick: 0.8 + rRand() * 1.2 });
    }

    let splashes: Splash[] = [];
    function splashBurst(x: number, nowMs: number) {
      for (let i = 0; i < SPLASH_PARTICLE_COUNT; i += 1) {
        const ang = Math.PI + sRand() * Math.PI;
        const speed = 16 + sRand() * 26;
        splashes.push({ x, y: GROUND_Y, vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed, born: nowMs });
      }
    }

    function stepSim(dtMs: number, nowMs: number) {
      const dtS = dtMs / 1000;
      for (let i = 0; i < streaks.length; i += 1) {
        const s = streaks[i];
        s.y += s.speed * dtS;
        if (s.y >= GROUND_Y) {
          splashBurst(s.x, nowMs);
          s.y = -4 - rRand() * 10;
          s.x = rRand() * CALC_W;
        }
      }
      const alive: Splash[] = [];
      for (let j = 0; j < splashes.length; j += 1) {
        const p = splashes[j];
        p.vy += SPLASH_GRAVITY_PX_S2 * dtS;
        p.x += p.vx * dtS;
        p.y += p.vy * dtS;
        if (nowMs - p.born < SPLASH_LIFE_MS) alive.push(p);
      }
      splashes = alive;
    }

    let cw = 480, ch = 300;
    function draw(nowMs: number) {
      const sx = cw / CALC_W, sy = ch / CALC_H;
      const sc = (sx + sy) / 2;
      ctx!.clearRect(0, 0, cw, ch);
      ctx!.strokeStyle = "rgba(20,26,54,.22)";
      ctx!.lineWidth = Math.max(1, 1.4 * sc);
      ctx!.beginPath();
      ctx!.moveTo(0, GROUND_Y * sy);
      ctx!.lineTo(cw, GROUND_Y * sy);
      ctx!.stroke();
      for (let i = 0; i < streaks.length; i += 1) {
        const s = streaks[i];
        if (s.y < 0 || s.y > GROUND_Y) continue;
        const x = s.x * sx, y0 = s.y * sy, y1 = (s.y - s.thick * 5) * sy;
        ctx!.strokeStyle = "rgba(20,26,54,.62)";
        ctx!.lineWidth = Math.max(0.6, s.thick * sc);
        ctx!.beginPath();
        ctx!.moveTo(x, y0);
        ctx!.lineTo(x, y1);
        ctx!.stroke();
      }
      for (let k = 0; k < splashes.length; k += 1) {
        const p = splashes[k];
        const f = Math.max(0, Math.min(1, (nowMs - p.born) / SPLASH_LIFE_MS));
        const alpha = (1 - f) * 0.75;
        const dx = p.x * sx, dy = p.y * sy, dr = (0.7 + (1 - f) * 0.7) * sc;
        ctx!.fillStyle = "rgba(20,26,54," + alpha + ")";
        ctx!.beginPath();
        ctx!.arc(dx, dy, dr, 0, Math.PI * 2);
        ctx!.fill();
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
    const warmSteps = reduce ? 60 : 20;
    for (let w = 0; w < warmSteps; w += 1) { elapsed += 20; stepSim(20, elapsed); }

    let lastTs: number | null = null;
    let raf = 0;
    function tick(ts: number) {
      if (lastTs === null) lastTs = ts;
      const dt = Math.min(ts - lastTs, 48);
      lastTs = ts;
      if (!reduce) {
        elapsed += dt;
        stepSim(dt, elapsed);
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
        <p className={styles.rn__caption}>빗방울이 바닥에 닿는 순간 방향과 속도를 무작위로 나눠 튀는 입자 여러 개를 만들고, 그 입자마다 중력을 매 프레임 다시 더해 포물선을 그리며 흩어진다</p>
      </div>
    </main>
  );
}
