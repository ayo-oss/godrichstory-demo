import { useEffect, useRef } from "react";
import styles from "./BallPhysicsWallRestitutionBounce.module.scss";

type Ball = { x: number; y: number; vx: number; vy: number; r: number; color: string; squash: number; hits: number };

export default function BallPhysicsWallRestitutionBounce() {
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
    const WALL_RESTITUTION = 0.86;
    const MIN_SPEED = 46;
    const KICK_SPEED = 210;
    const STAGE_BG = "255,77,31";

    function seedRand(seed: number) {
      let s = seed >>> 0;
      return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    }
    const rand = seedRand(427031);

    const COLORS = ["#b9a0ff", "#6ec8ff", "#ff9ebb"];
    const radii = [11, 15, 19];
    const balls: Ball[] = [];
    function kick(b: Ball) {
      const ang = rand() * Math.PI * 2;
      const spd = KICK_SPEED * (0.7 + rand() * 0.5);
      b.vx = Math.cos(ang) * spd;
      b.vy = Math.sin(ang) * spd;
      b.hits = 0;
    }
    for (let i = 0; i < radii.length; i += 1) {
      const r = radii[i];
      const b: Ball = { x: r + rand() * (CALC_W - r * 2), y: r + rand() * (CALC_H - r * 2), vx: 0, vy: 0, r, color: COLORS[i], squash: 0, hits: 0 };
      kick(b);
      balls.push(b);
    }

    function stepSim(dtMs: number) {
      const dtS = dtMs / 1000;
      for (const b of balls) {
        b.x += b.vx * dtS;
        b.y += b.vy * dtS;
        let hit = false;
        if (b.x - b.r < 0) { b.x = b.r; b.vx = -b.vx * WALL_RESTITUTION; hit = true; }
        if (b.x + b.r > CALC_W) { b.x = CALC_W - b.r; b.vx = -b.vx * WALL_RESTITUTION; hit = true; }
        if (b.y - b.r < 0) { b.y = b.r; b.vy = -b.vy * WALL_RESTITUTION; hit = true; }
        if (b.y + b.r > CALC_H) { b.y = CALC_H - b.r; b.vy = -b.vy * WALL_RESTITUTION; hit = true; }
        if (hit) {
          b.hits += 1;
          b.squash = Math.min(1, Math.hypot(b.vx, b.vy) / 260 + 0.25);
        }
        b.squash = Math.max(0, b.squash - dtS * 3.4);
        const speed = Math.hypot(b.vx, b.vy);
        if (speed < MIN_SPEED) kick(b);
      }
    }

    let cw = 480, ch = 300;
    function drawBall(sx: number, sy: number, b: Ball) {
      const px = b.x * sx, py = b.y * sy, pr = b.r * ((sx + sy) / 2);
      const ang = Math.atan2(b.vy, b.vx);
      const speed = Math.hypot(b.vx, b.vy);
      const stretch = 1 + Math.min(0.4, speed / 900);
      ctx!.save();
      ctx!.translate(px, py);
      ctx!.rotate(ang);
      ctx!.scale(stretch, (1 - b.squash * 0.3) / stretch);
      ctx!.beginPath();
      ctx!.arc(0, 0, pr, 0, Math.PI * 2);
      ctx!.fillStyle = b.color;
      ctx!.fill();
      ctx!.restore();
    }

    function draw() {
      const sx = cw / CALC_W, sy = ch / CALC_H;
      ctx!.fillStyle = "rgba(" + STAGE_BG + ",0.24)";
      ctx!.fillRect(0, 0, cw, ch);
      ctx!.strokeStyle = "rgba(255,255,255,0.35)";
      ctx!.lineWidth = 2;
      ctx!.strokeRect(2, 2, cw - 4, ch - 4);
      for (const b of balls) drawBall(sx, sy, b);
    }

    function fit() {
      const r = wrap.getBoundingClientRect();
      cw = Math.max(1, Math.round(r.width));
      ch = Math.max(1, Math.round(r.height));
      canvas!.width = cw; canvas!.height = ch;
      ctx!.fillStyle = "rgb(" + STAGE_BG + ")";
      ctx!.fillRect(0, 0, cw, ch);
      draw();
    }

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let elapsed = 0;
    if (reduce) root.classList.remove("is-demo");
    const warmSteps = reduce ? 50 : 40;
    for (let w = 0; w < warmSteps; w += 1) { elapsed += 16; stepSim(16); }

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
        while (acc >= FIXED_DT) { elapsed += FIXED_DT; stepSim(FIXED_DT); acc -= FIXED_DT; }
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
        <p className={styles.bp__caption}>화면 가장자리에 닿는 순간 방향을 반대로 뒤집고 그 속도에 반발계수를 곱해 줄여, 튕길수록 공의 움직임이 조금씩 잦아든다</p>
      </div>
    </main>
  );
}
