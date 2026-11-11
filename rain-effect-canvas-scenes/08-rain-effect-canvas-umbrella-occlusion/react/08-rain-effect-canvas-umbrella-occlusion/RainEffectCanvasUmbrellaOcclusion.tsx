import { useEffect, useRef } from "react";
import styles from "./RainEffectCanvasUmbrellaOcclusion.module.scss";

type Streak = { x: number; y: number; speed: number; thick: number };
type Bounce = { x: number; y: number; vx: number; vy: number; born: number; life: number };

export default function RainEffectCanvasUmbrellaOcclusion() {
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
    const UMBRELLA_RADIUS_PX = 34;
    const UMBRELLA_HEIGHT_PX = 16;
    const UMBRELLA_BOUNCE_COUNT = 5;
    const UMBRELLA_SWAY_PX = 6;
    const UMBRELLA_SWAY_PERIOD_MS = 4200;
    const UMBRELLA_BOUNCE_GRAVITY = 240;
    const RAIN_STREAK_COUNT = 80;

    function seedRand(seed: number) {
      let s = seed >>> 0;
      return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    }
    const rRand = seedRand(431082);

    const umbY = 58, umbBaseX = CALC_W / 2;

    const streaks: Streak[] = [];
    for (let i = 0; i < RAIN_STREAK_COUNT; i += 1) {
      streaks.push({ x: rRand() * CALC_W, y: rRand() * CALC_H, speed: 110 + rRand() * 80, thick: 0.6 + rRand() * 1 });
    }
    const bounces: Bounce[] = [];

    function umbrellaOcclusion(x: number, y: number, umbX: number) {
      const dx = (x - umbX) / UMBRELLA_RADIUS_PX;
      if (Math.abs(dx) > 1) return false;
      const edgeY = umbY - UMBRELLA_HEIGHT_PX * Math.sqrt(Math.max(0, 1 - dx * dx));
      return y >= edgeY && y <= umbY;
    }

    function umbrellaBounce(x: number, y: number, umbX: number) {
      const dx = (x - umbX) / UMBRELLA_RADIUS_PX;
      const nx = dx;
      for (let i = 0; i < UMBRELLA_BOUNCE_COUNT; i += 1) {
        const spread = (rRand() - 0.5) * 40;
        bounces.push({
          x, y,
          vx: nx * (40 + rRand() * 30) + spread,
          vy: -(30 + rRand() * 40),
          born: 0,
          life: 380 + rRand() * 200,
        });
      }
    }

    function stepSim(dtS: number, nowMs: number) {
      const umbX = umbBaseX + Math.sin((nowMs / UMBRELLA_SWAY_PERIOD_MS) * Math.PI * 2) * UMBRELLA_SWAY_PX;
      for (let i = 0; i < streaks.length; i += 1) {
        const s = streaks[i];
        const prevY = s.y;
        s.y += s.speed * dtS;
        if (!(prevY >= umbY) && umbrellaOcclusion(s.x, s.y, umbX)) {
          umbrellaBounce(s.x, umbY - 1, umbX);
          s.y = -4 - rRand() * 10;
          s.x = rRand() * CALC_W;
        }
        if (s.y > CALC_H + 4) { s.y = -4 - rRand() * 6; s.x = rRand() * CALC_W; }
      }
      for (let b = bounces.length - 1; b >= 0; b -= 1) {
        const p = bounces[b];
        p.born += dtS * 1000;
        p.vy += UMBRELLA_BOUNCE_GRAVITY * dtS;
        p.x += p.vx * dtS;
        p.y += p.vy * dtS;
        if (p.born > p.life) bounces.splice(b, 1);
      }
    }

    let cw = 480, ch = 300, elapsedGlobal = 0;
    function draw(nowMs: number) {
      const sx = cw / CALC_W, sy = ch / CALC_H;
      const umbX = umbBaseX + Math.sin((nowMs / UMBRELLA_SWAY_PERIOD_MS) * Math.PI * 2) * UMBRELLA_SWAY_PX;
      ctx!.clearRect(0, 0, cw, ch);
      ctx!.fillStyle = "#eef1ef";
      ctx!.fillRect(0, 0, cw, ch);

      ctx!.strokeStyle = "rgba(90,110,140,0.5)";
      for (let i = 0; i < streaks.length; i += 1) {
        const s = streaks[i];
        const x = s.x * sx, y = s.y * sy;
        ctx!.lineWidth = Math.max(0.6, s.thick * ((sx + sy) / 2));
        ctx!.beginPath();
        ctx!.moveTo(x, y);
        ctx!.lineTo(x, y - s.thick * 4 * sy);
        ctx!.stroke();
      }

      for (let b = 0; b < bounces.length; b += 1) {
        const p = bounces[b];
        const f = 1 - p.born / p.life;
        ctx!.fillStyle = "rgba(90,110,140," + Math.max(0, f * 0.8).toFixed(3) + ")";
        ctx!.beginPath();
        ctx!.arc(p.x * sx, p.y * sy, Math.max(0.8, 1.6 * f * ((sx + sy) / 2)), 0, Math.PI * 2);
        ctx!.fill();
      }

      const cx = umbX * sx, cy = umbY * sy, rx = UMBRELLA_RADIUS_PX * sx, ry = UMBRELLA_HEIGHT_PX * sy;
      ctx!.fillStyle = "#2c2430";
      ctx!.beginPath();
      ctx!.ellipse(cx, cy, rx, ry, 0, Math.PI, Math.PI * 2);
      ctx!.lineTo(cx + rx, cy);
      ctx!.closePath();
      ctx!.fill();

      ctx!.strokeStyle = "rgba(255,255,255,0.18)";
      ctx!.lineWidth = 1;
      for (let k = -2; k <= 2; k += 1) {
        const t = k / 2.4;
        const ex = cx + t * rx;
        const ey = cy - Math.sqrt(Math.max(0, 1 - t * t)) * ry;
        ctx!.beginPath();
        ctx!.moveTo(cx, cy - ry * 0.2);
        ctx!.lineTo(ex, ey);
        ctx!.stroke();
      }

      ctx!.strokeStyle = "#2c2430";
      ctx!.lineWidth = Math.max(1.2, 1.4 * ((sx + sy) / 2));
      ctx!.beginPath();
      ctx!.moveTo(cx, cy);
      ctx!.lineTo(cx, cy + ry * 3.2);
      ctx!.quadraticCurveTo(cx, cy + ry * 4.2, cx + rx * 0.22, cy + ry * 4);
      ctx!.stroke();
      elapsedGlobal = nowMs;
    }

    function fit() {
      const r = wrap.getBoundingClientRect();
      cw = Math.max(1, Math.round(r.width));
      ch = Math.max(1, Math.round(r.height));
      canvas!.width = cw; canvas!.height = ch;
      draw(elapsedGlobal);
    }

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let elapsed = 0;
    if (reduce) root.classList.remove("is-demo");
    const warmSteps = reduce ? 30 : 45;
    for (let w = 0; w < warmSteps; w += 1) { elapsed += 20; stepSim(0.02, elapsed); }
    elapsedGlobal = elapsed;

    let lastTs: number | null = null;
    let raf = 0;
    function tick(ts: number) {
      if (lastTs === null) lastTs = ts;
      const dt = Math.min(ts - lastTs, 48);
      lastTs = ts;
      if (!reduce) {
        elapsed += dt;
        elapsedGlobal = elapsed;
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
        <p className={styles.rn__caption}>우산 모양의 경계 안에 빗줄기 좌표가 들어오는지 매 프레임 판정해, 경계 안쪽에 들어온 부분만 그리지 않아 우산이 실제로 비를 막는 것처럼 보인다</p>
      </div>
    </main>
  );
}
