import { useEffect, useRef } from "react";
import styles from "./BallPhysicsMouseRepelScatter.module.scss";

type Ball = { hx: number; hy: number; x: number; y: number; vx: number; vy: number; r: number; color: string; phase: number; squash: number };

export default function BallPhysicsMouseRepelScatter() {
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
    const POINTER_REPEL_RADIUS = 90;
    const REPEL_FORCE = 5200;
    const DRIFT_SPEED = 0.55;
    const DAMPING = 3.4;

    function seedRand(seed: number) {
      let s = seed >>> 0;
      return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    }
    const rand = seedRand(427051);

    const COLORS = ["#6ec8ff", "#4cd4a6", "#b9a0ff", "#ff9ebb", "#ffcf7a", "#8fd7ff"];
    const balls: Ball[] = [];
    for (let i = 0; i < 6; i += 1) {
      const hx = 30 + rand() * (CALC_W - 60);
      const hy = 30 + rand() * (CALC_H - 60);
      balls.push({ hx, hy, x: hx, y: hy, vx: 0, vy: 0, r: 9 + rand() * 7, color: COLORS[i % COLORS.length], phase: rand() * Math.PI * 2, squash: 0 });
    }

    const pointer = { x: CALC_W * 0.5, y: CALC_H * 0.5 };
    let pointerActive = false;

    function demoPointerPos(t: number) {
      const tt = t / 1000;
      return {
        x: CALC_W * 0.5 + Math.cos(tt * 1.15) * (CALC_W * 0.36),
        y: CALC_H * 0.5 + Math.sin(tt * 1.7) * (CALC_H * 0.34)
      };
    }

    function applyPointer(px: number, py: number, dtS: number) {
      for (const b of balls) {
        const dx = b.x - px, dy = b.y - py;
        const dist = Math.hypot(dx, dy) || 0.001;
        if (dist < POINTER_REPEL_RADIUS) {
          const force = (REPEL_FORCE * (1 - dist / POINTER_REPEL_RADIUS)) / dist;
          b.vx += dx * force * dtS;
          b.vy += dy * force * dtS;
          b.squash = Math.min(1, b.squash + (1 - dist / POINTER_REPEL_RADIUS) * 0.6);
        }
      }
    }

    function stepSim(dtMs: number, nowMs: number, px: number, py: number) {
      const dtS = dtMs / 1000;
      applyPointer(px, py, dtS);
      for (const b of balls) {
        const homeX = b.hx + Math.cos((nowMs / 1000) * DRIFT_SPEED + b.phase) * 10;
        const homeY = b.hy + Math.sin((nowMs / 1000) * DRIFT_SPEED * 0.8 + b.phase) * 10;
        const pull = 0.9;
        b.vx += (homeX - b.x) * pull * dtS;
        b.vy += (homeY - b.y) * pull * dtS;
        b.vx -= b.vx * Math.min(1, DAMPING * dtS);
        b.vy -= b.vy * Math.min(1, DAMPING * dtS);
        b.x += b.vx * dtS;
        b.y += b.vy * dtS;
        if (b.x < b.r) { b.x = b.r; b.vx *= -0.5; }
        if (b.x > CALC_W - b.r) { b.x = CALC_W - b.r; b.vx *= -0.5; }
        if (b.y < b.r) { b.y = b.r; b.vy *= -0.5; }
        if (b.y > CALC_H - b.r) { b.y = CALC_H - b.r; b.vy *= -0.5; }
        b.squash = Math.max(0, b.squash - dtS * 2.6);
      }
    }

    let cw = 480, ch = 300;
    function draw(px: number, py: number) {
      const sx = cw / CALC_W, sy = ch / CALC_H;
      ctx!.clearRect(0, 0, cw, ch);
      ctx!.beginPath();
      ctx!.arc(px * sx, py * sy, POINTER_REPEL_RADIUS * ((sx + sy) / 2), 0, Math.PI * 2);
      ctx!.strokeStyle = "rgba(255,255,255,0.18)";
      ctx!.lineWidth = 1.5;
      ctx!.stroke();
      for (const b of balls) {
        const ppx = b.x * sx, ppy = b.y * sy, pr = b.r * ((sx + sy) / 2);
        const speed = Math.hypot(b.vx, b.vy);
        const ang = Math.atan2(b.vy, b.vx);
        const stretch = 1 + Math.min(0.5, speed / 500) + b.squash * 0.2;
        ctx!.save();
        ctx!.translate(ppx, ppy);
        ctx!.rotate(ang);
        ctx!.scale(stretch, 1 / stretch);
        ctx!.beginPath();
        ctx!.arc(0, 0, pr, 0, Math.PI * 2);
        ctx!.fillStyle = b.color;
        ctx!.fill();
        ctx!.restore();
      }
      ctx!.beginPath();
      ctx!.arc(px * sx, py * sy, 3, 0, Math.PI * 2);
      ctx!.fillStyle = "rgba(255,255,255,0.7)";
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
        <p className={styles.bp__caption}>포인터가 다가오면 거리에 반비례하는 힘으로 공들을 밀어내 흩어지게 하고, 멀어지면 다시 제자리 근처를 천천히 떠돈다</p>
      </div>
    </main>
  );
}
