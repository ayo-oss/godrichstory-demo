import { useEffect, useRef } from "react";
import styles from "./BallPhysicsSpawnCascadeStack.module.scss";

type Ball = { x: number; y: number; vy: number; vx: number; r: number; color: string; squash: number };

export default function BallPhysicsSpawnCascadeStack() {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    if (!root || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const wrap = canvas.parentElement as HTMLElement;

    const CALC_W = 320, CALC_H = 200;
    const GRAVITY = 640;
    const FLOOR_RESTITUTION = 0.28;
    const SPAWN_INTERVAL_MS = 190;
    const MAX_BALLS = 13;
    const HOLD_MS = 480;
    const SEPARATE_ITERS = 4;

    function seedRand(seed: number) {
      let s = seed >>> 0;
      return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    }
    const rand = seedRand(427081);

    const COLORS = ["#6ec8ff", "#4cd4a6", "#b9a0ff", "#ff9ebb", "#ffcf7a", "#8fd7ff"];
    let balls: Ball[] = [];
    let lastSpawn = -SPAWN_INTERVAL_MS;
    let holdSince: number | null = null;

    function spawn() {
      const r = 9 + rand() * 8;
      balls.push({
        x: r + rand() * (CALC_W - r * 2),
        y: -r - rand() * 20,
        vy: 40,
        vx: (rand() - 0.5) * 20,
        r, color: COLORS[balls.length % COLORS.length], squash: 0
      });
    }

    function resetAll() {
      balls = [];
      lastSpawn = -SPAWN_INTERVAL_MS;
      holdSince = null;
    }
    resetAll();

    function stepSim(dtMs: number, nowMs: number) {
      const dtS = dtMs / 1000;
      if (balls.length < MAX_BALLS && holdSince === null && nowMs - lastSpawn >= SPAWN_INTERVAL_MS) {
        spawn();
        lastSpawn = nowMs;
      }
      for (const b of balls) {
        b.vy += GRAVITY * dtS;
        b.x += b.vx * dtS;
        b.y += b.vy * dtS;
        b.vx -= b.vx * 0.6 * dtS;
        if (b.x - b.r < 0) { b.x = b.r; b.vx = -b.vx * 0.5; }
        if (b.x + b.r > CALC_W) { b.x = CALC_W - b.r; b.vx = -b.vx * 0.5; }
        const floor = CALC_H - b.r;
        if (b.y > floor) {
          b.y = floor;
          if (Math.abs(b.vy) > 30) b.squash = Math.min(0.8, Math.abs(b.vy) / 320);
          b.vy = -b.vy * FLOOR_RESTITUTION;
          if (Math.abs(b.vy) < 22) b.vy = 0;
        }
        b.squash = Math.max(0, b.squash - dtS * 3);
      }
      for (let iter = 0; iter < SEPARATE_ITERS; iter += 1) {
        for (let a = 0; a < balls.length; a += 1) {
          for (let c = a + 1; c < balls.length; c += 1) {
            const ba = balls[a], bc = balls[c];
            const dx = bc.x - ba.x, dy = bc.y - ba.y;
            const dist = Math.hypot(dx, dy) || 0.001;
            const minDist = ba.r + bc.r;
            if (dist < minDist) {
              const overlap = (minDist - dist) / 2;
              const nx = dx / dist, ny = dy / dist;
              ba.x -= nx * overlap; ba.y -= ny * overlap;
              bc.x += nx * overlap; bc.y += ny * overlap;
              if (ba.y + ba.r > CALC_H) ba.y = CALC_H - ba.r;
              if (bc.y + bc.r > CALC_H) bc.y = CALC_H - bc.r;
            }
          }
        }
      }
      if (balls.length >= MAX_BALLS) {
        if (holdSince === null) holdSince = nowMs;
        else if (nowMs - holdSince > HOLD_MS) resetAll();
      }
    }

    let cw = 480, ch = 300;
    function draw() {
      const sx = cw / CALC_W, sy = ch / CALC_H;
      ctx!.clearRect(0, 0, cw, ch);
      for (const b of balls) {
        const px = b.x * sx, py = b.y * sy, pr = b.r * ((sx + sy) / 2);
        const sqY = 1 - b.squash * 0.4, sqX = 1 + b.squash * 0.55;
        ctx!.save();
        ctx!.translate(px, py + pr * b.squash * 0.4);
        ctx!.scale(sqX, sqY);
        ctx!.beginPath();
        ctx!.arc(0, 0, pr, 0, Math.PI * 2);
        ctx!.fillStyle = b.color;
        ctx!.fill();
        ctx!.restore();
      }
      ctx!.fillStyle = "rgba(23,20,26,0.5)";
      ctx!.font = "11px sans-serif";
      ctx!.fillText(balls.length + " / " + MAX_BALLS, 8, ch - 8);
    }

    function fit() {
      const r = wrap.getBoundingClientRect();
      cw = Math.max(1, Math.round(r.width));
      ch = Math.max(1, Math.round(r.height));
      canvas!.width = cw; canvas!.height = ch;
      draw();
    }

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let elapsed = 0;
    if (reduce) root.classList.remove("is-demo");

    let lastTs: number | null = null;
    let acc = 0;
    const FIXED_DT = 16;
    let raf = 0;
    function tick(ts: number) {
      if (lastTs === null) lastTs = ts;
      const frameDt = Math.min(ts - lastTs, 48);
      lastTs = ts;
      if (!reduce) {
        acc += frameDt;
        while (acc >= FIXED_DT) { elapsed += FIXED_DT; stepSim(FIXED_DT, elapsed); acc -= FIXED_DT; }
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
      <div className={`${styles.bp} is-demo`} ref={rootRef}>
        <canvas className={styles.bp__canvas} ref={canvasRef} width={480} height={300} />
        <p className={styles.bp__caption}>일정 간격으로 공을 위에서 계속 떨어뜨리고, 겹친 두 공은 서로 밀어내는 계산으로 떼어놓아 바닥에 쌓인다</p>
      </div>
    </main>
  );
}
