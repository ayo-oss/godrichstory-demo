import { useEffect, useRef } from "react";
import styles from "./BallPhysicsHeroScene.module.scss";

type Ball = { x: number; y: number; vx: number; vy: number; r: number; mass: number; color: string; squash: number };
type Impact = { x: number; y: number; born: number; strength: number };

export default function BallPhysicsHeroScene() {
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
    const HERO_GRAVITY = 620;
    const HERO_RESTITUTION = 0.78;
    const HERO_WALL_RESTITUTION = 0.6;
    const HERO_POINTER_REPEL_RADIUS = 78;
    const HERO_POINTER_FORCE = 3600;

    function seedRand(seed: number) {
      let s = seed >>> 0;
      return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    }
    const rand = seedRand(427091);

    const COLORS = ["#6ec8ff", "#4cd4a6", "#b9a0ff", "#ff9ebb", "#ffcf7a"];
    const RADII = [12, 15, 18, 13, 16];
    let balls: Ball[] = [];
    function initBalls() {
      balls = RADII.map((r, i) => ({
        x: 40 + i * ((CALC_W - 80) / (RADII.length - 1)),
        y: 20 + rand() * 40,
        vx: (rand() - 0.5) * 60,
        vy: 0,
        r, mass: r, color: COLORS[i], squash: 0
      }));
    }
    initBalls();

    const pointer = { x: CALC_W * 0.5, y: CALC_H * 0.35 };
    let pointerActive = false;
    let impacts: Impact[] = [];

    function demoPointerPos(t: number) {
      const tt = t / 1000;
      return {
        x: CALC_W * 0.5 + Math.cos(tt * 0.9) * (CALC_W * 0.32),
        y: CALC_H * 0.38 + Math.sin(tt * 1.3) * (CALC_H * 0.2)
      };
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
      const j = -(1 + HERO_RESTITUTION) * velAlongNormal / (1 / a.mass + 1 / b.mass);
      const ix = j * nx, iy = j * ny;
      a.vx -= ix / a.mass; a.vy -= iy / a.mass;
      b.vx += ix / b.mass; b.vy += iy / b.mass;
      const strength = Math.min(1, Math.abs(velAlongNormal) / 300);
      a.squash = Math.max(a.squash, strength);
      b.squash = Math.max(b.squash, strength);
      impacts.push({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, born: nowMs, strength });
    }

    function stepSim(dtMs: number, nowMs: number, px: number, py: number) {
      const dtS = dtMs / 1000;
      for (const b of balls) {
        b.vy += HERO_GRAVITY * dtS;
        const dx = b.x - px, dy = b.y - py;
        const dist = Math.hypot(dx, dy) || 0.001;
        if (dist < HERO_POINTER_REPEL_RADIUS) {
          const force = (HERO_POINTER_FORCE * (1 - dist / HERO_POINTER_REPEL_RADIUS)) / dist;
          b.vx += dx * force * dtS;
          b.vy += dy * force * dtS;
        }
        b.x += b.vx * dtS;
        b.y += b.vy * dtS;
        let hit = false;
        if (b.x - b.r < 0) { b.x = b.r; b.vx = -b.vx * HERO_WALL_RESTITUTION; hit = true; }
        if (b.x + b.r > CALC_W) { b.x = CALC_W - b.r; b.vx = -b.vx * HERO_WALL_RESTITUTION; hit = true; }
        if (b.y - b.r < 0) { b.y = b.r; b.vy = -b.vy * HERO_WALL_RESTITUTION; hit = true; }
        if (b.y + b.r > CALC_H) {
          b.y = CALC_H - b.r;
          b.vy = -b.vy * HERO_WALL_RESTITUTION;
          if (Math.abs(b.vy) < 24) b.vy = 0;
          hit = true;
        }
        if (hit) b.squash = Math.max(b.squash, Math.min(0.75, Math.hypot(b.vx, b.vy) / 300));
        b.squash = Math.max(0, b.squash - dtS * 3.2);
      }
      for (let a = 0; a < balls.length; a += 1) {
        for (let c = a + 1; c < balls.length; c += 1) resolvePair(balls[a], balls[c], nowMs);
      }
      impacts = impacts.filter((im) => nowMs - im.born < 240);
    }

    let cw = 480, ch = 300;
    function draw(px: number, py: number) {
      const sx = cw / CALC_W, sy = ch / CALC_H;
      ctx!.fillStyle = "rgba(23,20,26,0.22)";
      ctx!.fillRect(0, 0, cw, ch);
      for (const im of impacts) {
        ctx!.beginPath();
        ctx!.arc(im.x * sx, im.y * sy, (6 + im.strength * 14) * ((sx + sy) / 2), 0, Math.PI * 2);
        ctx!.strokeStyle = "rgba(255,255,255," + (im.strength * 0.4) + ")";
        ctx!.lineWidth = 2;
        ctx!.stroke();
      }
      for (const b of balls) {
        const ppx = b.x * sx, ppy = b.y * sy, pr = b.r * ((sx + sy) / 2);
        const shf = Math.max(0, 1 - (CALC_H - b.r - b.y) / 110);
        ctx!.beginPath();
        ctx!.ellipse(ppx, (CALC_H - 3) * sy, pr * (0.9 + shf * 0.3), pr * 0.22, 0, 0, Math.PI * 2);
        ctx!.fillStyle = "rgba(0,0,0," + (0.1 + shf * 0.14) + ")";
        ctx!.fill();
        const sqX = 1 + b.squash * 0.45, sqY = 1 - b.squash * 0.32;
        ctx!.save();
        ctx!.translate(ppx, ppy);
        ctx!.scale(sqX, sqY);
        ctx!.beginPath();
        ctx!.arc(0, 0, pr, 0, Math.PI * 2);
        ctx!.fillStyle = b.color;
        ctx!.fill();
        ctx!.restore();
      }
      ctx!.beginPath();
      ctx!.arc(px * sx, py * sy, 3, 0, Math.PI * 2);
      ctx!.fillStyle = "rgba(255,255,255,0.65)";
      ctx!.fill();
    }

    function fit() {
      const r = wrap.getBoundingClientRect();
      cw = Math.max(1, Math.round(r.width));
      ch = Math.max(1, Math.round(r.height));
      canvas!.width = cw; canvas!.height = ch;
      draw(pointer.x, pointer.y);
    }

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let elapsed = 0;
    if (reduce) root.classList.remove("is-demo");

    function toCalc(clientX: number, clientY: number) {
      const rect = canvas!.getBoundingClientRect();
      const nx = (clientX - rect.left) / rect.width;
      const ny = (clientY - rect.top) / rect.height;
      return { x: Math.max(0, Math.min(CALC_W, nx * CALC_W)), y: Math.max(0, Math.min(CALC_H, ny * CALC_H)) };
    }

    function onRealPointer(cx: number, cy: number) {
      pointerActive = true;
      root!.classList.remove("is-demo");
      const p = toCalc(cx, cy);
      pointer.x = p.x; pointer.y = p.y;
      if (reduce) { stepSim(16, elapsed, pointer.x, pointer.y); draw(pointer.x, pointer.y); }
    }
    function onMouseMove(e: MouseEvent) { onRealPointer(e.clientX, e.clientY); }
    function onTouchMove(e: TouchEvent) { if (e.touches[0]) onRealPointer(e.touches[0].clientX, e.touches[0].clientY); }
    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("touchmove", onTouchMove, { passive: true });

    function onKeyDown(e: KeyboardEvent) {
      const step = 14;
      let moved = true;
      if (e.key === "ArrowLeft") pointer.x -= step;
      else if (e.key === "ArrowRight") pointer.x += step;
      else if (e.key === "ArrowUp") pointer.y -= step;
      else if (e.key === "ArrowDown") pointer.y += step;
      else moved = false;
      if (moved) {
        e.preventDefault();
        pointerActive = true;
        root!.classList.remove("is-demo");
        pointer.x = Math.max(0, Math.min(CALC_W, pointer.x));
        pointer.y = Math.max(0, Math.min(CALC_H, pointer.y));
        if (reduce) { stepSim(16, elapsed, pointer.x, pointer.y); draw(pointer.x, pointer.y); }
      }
    }
    root.addEventListener("keydown", onKeyDown);

    let lastTs: number | null = null;
    let acc = 0;
    const FIXED_DT = 16;
    let cycleStart = 0;
    let raf = 0;
    function tick(ts: number) {
      if (lastTs === null) lastTs = ts;
      const frameDt = Math.min(ts - lastTs, 48);
      lastTs = ts;
      if (!reduce) {
        acc += frameDt;
        while (acc >= FIXED_DT) {
          elapsed += FIXED_DT;
          const pp = pointerActive ? pointer : demoPointerPos(elapsed);
          if (!pointerActive) { pointer.x = pp.x; pointer.y = pp.y; }
          stepSim(FIXED_DT, elapsed, pointer.x, pointer.y);
          if (elapsed - cycleStart > 2600) { cycleStart = elapsed; initBalls(); }
          acc -= FIXED_DT;
        }
        draw(pointer.x, pointer.y);
      }
      raf = requestAnimationFrame(tick);
    }
    fit();
    window.addEventListener("resize", fit);
    draw(pointer.x, pointer.y);
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", fit);
      canvas!.removeEventListener("mousemove", onMouseMove);
      canvas!.removeEventListener("touchmove", onTouchMove);
      root!.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={`${styles.bp} is-demo`} ref={rootRef} tabIndex={0}>
        <canvas className={styles.bp__canvas} ref={canvasRef} width={480} height={300} />
        <p className={styles.bp__caption}>중력·바닥 반발·공끼리 탄성 충돌·포인터 밀어내기를 한 장면에 합쳐, 공들이 떨어지고 튕기고 부딪히고 흩어진다</p>
      </div>
    </main>
  );
}
