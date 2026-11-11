import { useEffect, useRef } from "react";
import styles from "./BrickBreakerClearParticleBurst.module.scss";

export default function BrickBreakerClearParticleBurst() {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    if (!root || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const wrap = canvas.parentElement as HTMLElement;

    const LW = 320, LH = 200, WALL = 6;
    const PADDLE_H = 8, PADDLE_Y = LH - 18, PADDLE_W = 46;
    const BALL_R = 4;
    const BRICK_COLS = 6, BRICK_ROWS = 3, BRICK_W = 44, BRICK_H = 12, BRICK_GAP = 4, BRICK_TOP = 22;
    const BASE_SPEED = 130;
    const BIAS_PERIOD = 560;
    const STAGE_BG = "#17141a";
    const BRICK_ROW_COLORS = ["#2f6df6", "#ff9ebb", "#4cd4a6"];
    const PADDLE_COLOR = "#fff7e6";
    const BALL_COLOR = "#fff7e6";
    const FLASH_LIFE = 0.4, FLASH_MAX_R = 130;

    function seedRand(seed: number) {
      let s = seed >>> 0;
      return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    }
    const rand = seedRand(41009);

    function clamp(v: number, a: number, b: number): number { return v < a ? a : (v > b ? b : v); }
    function aabb(ax: number, ay: number, aw: number, ah: number, bx: number, by: number, bw: number, bh: number): boolean {
      return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
    }

    const PADDLE_LERP = 0.32;
    const MAX_REFLECT_ANGLE = Math.PI / 180 * 48;
    const PARTICLE_COUNT = 36;
    const PARTICLE_GRAVITY = 180;

    type Brick = { x: number; y: number; w: number; h: number; alive: boolean; hits: number };
    function buildBricks(): Brick[] {
      const totalW = BRICK_COLS * BRICK_W + (BRICK_COLS - 1) * BRICK_GAP;
      const startX = (LW - totalW) / 2;
      const arr: Brick[] = [];
      for (let r = 0; r < BRICK_ROWS; r += 1) {
        for (let c = 0; c < BRICK_COLS; c += 1) {
          arr.push({ x: startX + c * (BRICK_W + BRICK_GAP), y: BRICK_TOP + r * (BRICK_H + BRICK_GAP), w: BRICK_W, h: BRICK_H, alive: true, hits: 0 });
        }
      }
      return arr;
    }
    let bricks: Brick[] = buildBricks();
    let cleared = 0;
    type Particle = { x: number; y: number; vx: number; vy: number; life: number };
    let particles: Particle[] = [];
    let burstPending = false;

    function rebuildLevel(): void {
      bricks = buildBricks();
      cleared = 0;
      
    }

    type Flash = { x: number; y: number; t: number };
    const flashes: Flash[] = [];
    function spawnFlash(x: number, y: number): void { flashes.push({ x: x, y: y, t: 0.001 }); }
    function stepFlashes(dt: number): void {
      for (let i = flashes.length - 1; i >= 0; i -= 1) {
        flashes[i].t += dt;
        if (flashes[i].t > FLASH_LIFE) flashes.splice(i, 1);
      }
    }
    function drawFlashes(): void {
      for (let i = 0; i < flashes.length; i += 1) {
        const f = flashes[i];
        const p = f.t / FLASH_LIFE;
        const r = 14 + FLASH_MAX_R * p;
        const a = (1 - p) * 0.42;
        const g = ctx!.createRadialGradient(f.x, f.y, 0, f.x, f.y, r);
        g.addColorStop(0, "rgba(255,247,230," + a + ")");
        g.addColorStop(0.6, "rgba(255,209,63," + (a * 0.6) + ")");
        g.addColorStop(1, "rgba(255,209,63,0)");
        ctx!.fillStyle = g;
        ctx!.beginPath();
        ctx!.arc(f.x, f.y, r, 0, Math.PI * 2);
        ctx!.fill();
      }
    }

    const paddle = { x: LW / 2 - PADDLE_W / 2, w: PADDLE_W, target: LW / 2 };
    const ball = { x: LW / 2, y: PADDLE_Y - 40, vx: 0, vy: 0 };
    function resetBall(): void {
      const ang = rand() * 0.5 - 0.25;
      ball.x = LW / 2; ball.y = PADDLE_Y - 40;
      ball.vx = Math.sin(ang) * BASE_SPEED;
      ball.vy = -Math.cos(ang) * BASE_SPEED;
    }
    resetBall();

    let pointerActive = false;
    const keys = { left: false, right: false };
    const biasSchedule = [0, 0.75, -0.75, 0.35, -0.35, 0.6];
    function autoplay(tMs: number): void {
      if (pointerActive || reduce) return;
      const slot = Math.floor(tMs / BIAS_PERIOD) % biasSchedule.length;
      const bias = biasSchedule[slot] * (paddle.w / 2);
      paddle.target = ball.x + bias;
    }

    function paddleStep(dt: number): void {
      if (keys.left) paddle.target -= 160 * dt;
      if (keys.right) paddle.target += 160 * dt;
      paddle.target = clamp(paddle.target, WALL + paddle.w / 2, LW - WALL - paddle.w / 2);
      const goal = paddle.target - paddle.w / 2;
      const k = 1 - Math.pow(1 - PADDLE_LERP, dt * 60);
      paddle.x += (goal - paddle.x) * k;
      paddle.x = clamp(paddle.x, WALL, LW - WALL - paddle.w);
    }

    function onWallHit(side: string): void { spawnFlash(ball.x, ball.y);  }
    function mirrorWallBounce(side: string): void {
      ball.vx = side === "left" ? Math.abs(ball.vx) : -Math.abs(ball.vx);
      onWallHit(side);
    }
    function onPaddleHit(): void {
      const hitPos = clamp((ball.x - (paddle.x + paddle.w / 2)) / (paddle.w / 2), -1, 1);
      const angle = hitPos * MAX_REFLECT_ANGLE;
      const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
      ball.vx = Math.sin(angle) * speed;
      ball.vy = -Math.abs(Math.cos(angle)) * speed;
      ball.y = PADDLE_Y - BALL_R - 0.5;
      spawnFlash(ball.x, PADDLE_Y);
      
    }
    function onLevelClear(): void { spawnFlash(LW / 2, LH / 2); spawnBurst();
      burstPending = true; }
    function onBrickHit(b: Brick): void {
      spawnFlash(b.x + b.w / 2, b.y + b.h / 2);
      b.alive = false; cleared += 1;
      if (cleared >= bricks.length) { onLevelClear(); }
    }
    function onMiss(): void {
      spawnFlash(ball.x, LH - 4);
      
      resetBall();
    }

    function ballStep(dt: number): void {
      ball.x += ball.vx * dt;
      ball.y += ball.vy * dt;
      if (ball.x - BALL_R <= WALL) { ball.x = WALL + BALL_R; mirrorWallBounce("left"); }
      else if (ball.x + BALL_R >= LW - WALL) { ball.x = LW - WALL - BALL_R; mirrorWallBounce("right"); }
      if (ball.y - BALL_R <= WALL) { ball.y = WALL + BALL_R; ball.vy = Math.abs(ball.vy); }
      if (ball.vy > 0 && aabb(ball.x - BALL_R, ball.y - BALL_R, BALL_R * 2, BALL_R * 2, paddle.x, PADDLE_Y, paddle.w, PADDLE_H)) {
        onPaddleHit();
      }
      for (let i = 0; i < bricks.length; i += 1) {
        const b = bricks[i];
        if (b.alive && aabb(ball.x - BALL_R, ball.y - BALL_R, BALL_R * 2, BALL_R * 2, b.x, b.y, b.w, b.h)) {
          ball.vy = -ball.vy;
          onBrickHit(b);
          break;
        }
      }
      if (ball.y - BALL_R > LH) onMiss();
    }

    function spawnBurst(): void {
      for (let i = 0; i < PARTICLE_COUNT; i += 1) {
        const ang = (i / PARTICLE_COUNT) * Math.PI * 2 + rand() * 0.3;
        const sp = 60 + rand() * 90;
        particles.push({ x: LW / 2, y: LH / 2 - 20, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, life: 1 });
      }
    }
    function stepExtra(dt: number): void {
      for (let i = particles.length - 1; i >= 0; i -= 1) {
        const p = particles[i];
        p.vy += PARTICLE_GRAVITY * dt;
        p.vx *= (1 - 0.6 * dt);
        p.x += p.vx * dt; p.y += p.vy * dt;
        p.life -= dt * 0.7;
        if (p.life <= 0) particles.splice(i, 1);
      }
      if (burstPending && particles.length === 0) {
        burstPending = false;
        rebuildLevel();
      }
    }

    function update(dt: number, tMs: number): void {
      autoplay(tMs);
      paddleStep(dt);
      ballStep(dt);
      stepFlashes(dt);
      stepExtra(dt);
    }

    function drawCourt(): void {
      ctx!.fillStyle = STAGE_BG;
      ctx!.fillRect(0, 0, LW, LH);
    }
    function drawBrick(b: Brick): void {
      ctx!.fillStyle = BRICK_ROW_COLORS[Math.floor((b.y - BRICK_TOP) / (BRICK_H + BRICK_GAP)) % BRICK_ROW_COLORS.length];
      ctx!.fillRect(b.x, b.y, b.w, b.h);
    }
    function drawBricks(): void {
      for (let i = 0; i < bricks.length; i += 1) {
        if (bricks[i].alive) drawBrick(bricks[i]);
      }
    }
    function drawPaddle(): void {
      ctx!.fillStyle = PADDLE_COLOR;
      const r = 3;
      ctx!.beginPath();
      ctx!.moveTo(paddle.x + r, PADDLE_Y);
      ctx!.arcTo(paddle.x + paddle.w, PADDLE_Y, paddle.x + paddle.w, PADDLE_Y + PADDLE_H, r);
      ctx!.arcTo(paddle.x + paddle.w, PADDLE_Y + PADDLE_H, paddle.x, PADDLE_Y + PADDLE_H, r);
      ctx!.arcTo(paddle.x, PADDLE_Y + PADDLE_H, paddle.x, PADDLE_Y, r);
      ctx!.arcTo(paddle.x, PADDLE_Y, paddle.x + paddle.w, PADDLE_Y, r);
      ctx!.closePath();
      ctx!.fill();
    }
    function drawBall(): void {
      ctx!.fillStyle = BALL_COLOR;
      ctx!.beginPath();
      ctx!.arc(ball.x, ball.y, BALL_R, 0, Math.PI * 2);
      ctx!.fill();
    }
    function drawExtraBelow(): void {
      for (let i = 0; i < particles.length; i += 1) {
        const p = particles[i];
        ctx!.fillStyle = "rgba(255,209,63," + Math.max(p.life, 0) + ")";
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, 2.4, 0, Math.PI * 2);
        ctx!.fill();
      }
    }
    function drawExtraAbove(): void {}

    let cw = 480, ch = 300, sx = 1, sy = 1;
    function fit(): void {
      const r = wrap.getBoundingClientRect();
      cw = Math.max(1, Math.round(r.width));
      ch = Math.max(1, Math.round(r.height));
      canvas!.width = cw; canvas!.height = ch;
      sx = cw / LW; sy = ch / LH;
      render();
    }

    function render(): void {
      ctx!.setTransform(1, 0, 0, 1, 0, 0);
      ctx!.clearRect(0, 0, cw, ch);
      ctx!.save();
      ctx!.scale(sx, sy);
      drawCourt();
      drawFlashes();
      drawBricks();
      drawExtraBelow();
      drawPaddle();
      drawBall();
      drawExtraAbove();
      ctx!.restore();
    }

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const playing = !reduce;
    if (reduce) { root.classList.remove("is-demo"); }

    function calcFromEvent(e: PointerEvent): void {
      const r = wrap.getBoundingClientRect();
      const relX = ((e.clientX - r.left) / r.width) * LW;
      paddle.target = clamp(relX, WALL + paddle.w / 2, LW - WALL - paddle.w / 2);
    }
    function onPointerDown(e: PointerEvent): void { pointerActive = true; calcFromEvent(e); if (reduce) { paddleStep(0); render(); } }
    function onPointerMove(e: PointerEvent): void { pointerActive = true; calcFromEvent(e); if (reduce) { paddleStep(0); render(); } }
    function onPointerUp(): void { pointerActive = false; }
    function onPointerLeave(): void { pointerActive = false; }
    wrap.addEventListener("pointerdown", onPointerDown);
    wrap.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    wrap.addEventListener("pointerleave", onPointerLeave);

    function onKeyDown(e: KeyboardEvent): void {
      if (e.key === "ArrowLeft") { keys.left = true; pointerActive = true; }
      else if (e.key === "ArrowRight") { keys.right = true; pointerActive = true; }
      else return;
      if (reduce) { paddleStep(0.05); render(); }
    }
    function onKeyUp(e: KeyboardEvent): void {
      if (e.key === "ArrowLeft") keys.left = false;
      else if (e.key === "ArrowRight") keys.right = false;
      if (!keys.left && !keys.right) pointerActive = false;
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    let lastTs: number | null = null;
    let raf = 0;
    function tick(ts: number): void {
      if (lastTs === null) lastTs = ts;
      const dt = Math.min((ts - lastTs) / 1000, 0.05);
      lastTs = ts;
      if (playing) update(dt, ts);
      render();
      raf = requestAnimationFrame(tick);
    }
    fit();
    window.addEventListener("resize", fit);
    render();
    if (playing) raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", fit);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("pointerup", onPointerUp);
      wrap.removeEventListener("pointerdown", onPointerDown);
      wrap.removeEventListener("pointermove", onPointerMove);
      wrap.removeEventListener("pointerleave", onPointerLeave);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={`${styles.vd} is-demo`} ref={rootRef}>
        <canvas className={styles.vd__canvas} ref={canvasRef} width={480} height={300} />
        <p className={styles.vd__caption}>벽돌이 모두 사라지면 터지는 입자</p>
      </div>
    </main>
  );
}
