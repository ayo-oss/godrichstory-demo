import { useEffect, useRef } from "react";
import styles from "./BallPhysicsElasticCollision.module.scss";

type Ball = { x: number; y: number; vx: number; vy: number; r: number; mass: number; color: string; squash: number };
type Impact = { x: number; y: number; born: number; strength: number };

export default function BallPhysicsElasticCollision() {
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
    const BALL_RESTITUTION = 0.82;
    const WALL_RESTITUTION = 1.0;

    function seedRand(seed: number) {
      let s = seed >>> 0;
      return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    }
    const rand = seedRand(427011);

    const RADII = [12, 16, 20, 24];
    const COLORS = ["#ff9ebb", "#4cd4a6", "#b9a0ff", "#6ec8ff"];
    let balls: Ball[] = [];
    function makeBalls() {
      balls = [];
      for (let i = 0; i < RADII.length; i += 1) {
        const r = RADII[i];
        balls.push({
          x: 40 + i * ((CALC_W - 80) / (RADII.length - 1)),
          y: 30 + rand() * (CALC_H - 60),
          vx: (rand() - 0.5) * 160,
          vy: (rand() - 0.5) * 160,
          r, mass: r,
          color: COLORS[i],
          squash: 0
        });
      }
    }
    makeBalls();
    let impacts: Impact[] = [];

    function resolveWalls(b: Ball) {
      let hit = false;
      if (b.x - b.r < 0) { b.x = b.r; b.vx = -b.vx * WALL_RESTITUTION; hit = true; }
      if (b.x + b.r > CALC_W) { b.x = CALC_W - b.r; b.vx = -b.vx * WALL_RESTITUTION; hit = true; }
      if (b.y - b.r < 0) { b.y = b.r; b.vy = -b.vy * WALL_RESTITUTION; hit = true; }
      if (b.y + b.r > CALC_H) { b.y = CALC_H - b.r; b.vy = -b.vy * WALL_RESTITUTION; hit = true; }
      if (hit) b.squash = Math.max(b.squash, Math.min(0.7, Math.hypot(b.vx, b.vy) / 340));
    }

    function resolvePair(a: Ball, b: Ball, nowMs: number) {
      const dx = b.x - a.x, dy = b.y - a.y;
      const dist = Math.hypot(dx, dy);
      const minDist = a.r + b.r;
      if (dist === 0 || dist >= minDist) return;
      const nx = dx / dist, ny = dy / dist;
      const overlap = minDist - dist;
      const totalMass = a.mass + b.mass;
      a.x -= nx * overlap * (b.mass / totalMass);
      a.y -= ny * overlap * (b.mass / totalMass);
      b.x += nx * overlap * (a.mass / totalMass);
      b.y += ny * overlap * (a.mass / totalMass);
      const rvx = b.vx - a.vx, rvy = b.vy - a.vy;
      const velAlongNormal = rvx * nx + rvy * ny;
      if (velAlongNormal > 0) return;
      const j = -(1 + BALL_RESTITUTION) * velAlongNormal / (1 / a.mass + 1 / b.mass);
      const ix = j * nx, iy = j * ny;
      a.vx -= ix / a.mass; a.vy -= iy / a.mass;
      b.vx += ix / b.mass; b.vy += iy / b.mass;
      const strength = Math.min(1, Math.abs(velAlongNormal) / 300);
      a.squash = Math.max(a.squash, strength);
      b.squash = Math.max(b.squash, strength);
      impacts.push({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, born: nowMs, strength });
    }

    function stepSim(dtMs: number, nowMs: number) {
      const dtS = dtMs / 1000;
      for (let i = 0; i < balls.length; i += 1) {
        const b = balls[i];
        b.x += b.vx * dtS;
        b.y += b.vy * dtS;
        resolveWalls(b);
        b.squash = Math.max(0, b.squash - dtS * 3.4);
      }
      for (let a = 0; a < balls.length; a += 1) {
        for (let c = a + 1; c < balls.length; c += 1) resolvePair(balls[a], balls[c], nowMs);
      }
      impacts = impacts.filter((im) => nowMs - im.born < 240);
    }

    function drawBall(sx: number, sy: number, b: Ball) {
      const px = b.x * sx, py = b.y * sy, pr = b.r * ((sx + sy) / 2);
      const ang = Math.atan2(b.vy, b.vx);
      const stretch = 1 + Math.min(0.4, Math.hypot(b.vx, b.vy) / 700) + b.squash * 0.2;
      ctx!.save();
      ctx!.translate(px, py);
      ctx!.rotate(ang);
      ctx!.scale(stretch, 1 / stretch);
      ctx!.beginPath();
      ctx!.arc(0, 0, pr, 0, Math.PI * 2);
      ctx!.fillStyle = b.color;
      ctx!.fill();
      ctx!.restore();
    }

    let cw = 480, ch = 300;
    function draw(nowMs: number) {
      const sx = cw / CALC_W, sy = ch / CALC_H;
      ctx!.fillStyle = "rgba(23,20,26,0.22)";
      ctx!.fillRect(0, 0, cw, ch);
      for (const im of impacts) {
        const f = (nowMs - im.born) / 240;
        ctx!.beginPath();
        ctx!.arc(im.x * sx, im.y * sy, (6 + f * 20) * ((sx + sy) / 2), 0, Math.PI * 2);
        ctx!.strokeStyle = "rgba(255,255,255," + (im.strength * (1 - f) * 0.5) + ")";
        ctx!.lineWidth = 2;
        ctx!.stroke();
      }
      for (const b of balls) drawBall(sx, sy, b);
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
    const warmSteps = 60;
    for (let w = 0; w < warmSteps; w += 1) { elapsed += 16; stepSim(16, elapsed); }

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
      <div className={`${styles.bp} is-demo`} ref={rootRef}>
        <canvas className={styles.bp__canvas} ref={canvasRef} width={480} height={300} />
        <p className={styles.bp__caption}>공과 공이 부딪히는 순간 두 공의 질량과 속도를 계산해 그 값을 서로 맞바꿔, 무거운 공은 적게 밀리고 가벼운 공은 크게 튕겨 나간다</p>
      </div>
    </main>
  );
}
