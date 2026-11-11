import { useEffect, useRef } from "react";
import styles from "./BallPhysicsMouseAttractOrbit.module.scss";

type Ball = { x: number; y: number; vx: number; vy: number; r: number; color: string; squash: number };

export default function BallPhysicsMouseAttractOrbit() {
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
    const ATTRACT_K = 5200;
    const DAMPING = 0.12;
    const MIN_DIST = 14;

    function seedRand(seed: number) {
      let s = seed >>> 0;
      return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    }
    const rand = seedRand(427061);

    const COLORS = ["#6ec8ff", "#4cd4a6", "#b9a0ff", "#ff9ebb", "#ffcf7a"];
    const orbitSpeed = Math.sqrt(ATTRACT_K);

    const pointer = { x: CALC_W * 0.5, y: CALC_H * 0.5 };
    let pointerActive = false;

    let balls: Ball[] = [];
    function initBalls() {
      balls = [];
      for (let i = 0; i < 5; i += 1) {
        const r0 = 46 + rand() * 74;
        const th0 = rand() * Math.PI * 2;
        const px = pointer.x + Math.cos(th0) * r0;
        const py = pointer.y + Math.sin(th0) * r0;
        const dirx = -Math.sin(th0), diry = Math.cos(th0);
        const speed = orbitSpeed * (0.85 + rand() * 0.3);
        balls.push({ x: px, y: py, vx: dirx * speed, vy: diry * speed, r: 8 + rand() * 6, color: COLORS[i % COLORS.length], squash: 0 });
      }
    }
    initBalls();

    function demoPointerPos(t: number) {
      const tt = t / 1000;
      return {
        x: CALC_W * 0.5 + Math.cos(tt * 0.5) * (CALC_W * 0.14),
        y: CALC_H * 0.5 + Math.sin(tt * 0.7) * (CALC_H * 0.14)
      };
    }

    function stepSim(dtMs: number, px: number, py: number) {
      const dtS = dtMs / 1000;
      for (const b of balls) {
        const dx = px - b.x, dy = py - b.y;
        const dist = Math.max(MIN_DIST, Math.hypot(dx, dy));
        const accel = ATTRACT_K / dist;
        const ax = (dx / dist) * accel, ay = (dy / dist) * accel;
        b.vx += ax * dtS;
        b.vy += ay * dtS;
        b.vx -= b.vx * DAMPING * dtS;
        b.vy -= b.vy * DAMPING * dtS;
        b.x += b.vx * dtS;
        b.y += b.vy * dtS;
        const speed = Math.hypot(b.vx, b.vy);
        b.squash = Math.min(0.5, speed / 900);
      }
    }

    let cw = 480, ch = 300;
    function draw(px: number, py: number) {
      const sx = cw / CALC_W, sy = ch / CALC_H;
      ctx!.fillStyle = "rgba(255,247,224,0.26)";
      ctx!.fillRect(0, 0, cw, ch);
      ctx!.beginPath();
      ctx!.arc(px * sx, py * sy, 4, 0, Math.PI * 2);
      ctx!.fillStyle = "rgba(23,20,26,0.55)";
      ctx!.fill();
      for (const b of balls) {
        const ppx = b.x * sx, ppy = b.y * sy, pr = b.r * ((sx + sy) / 2);
        const ang = Math.atan2(b.vy, b.vx);
        const stretch = 1 + b.squash;
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
    }

    function fit() {
      const r = wrap.getBoundingClientRect();
      cw = Math.max(1, Math.round(r.width));
      ch = Math.max(1, Math.round(r.height));
      canvas!.width = cw; canvas!.height = ch;
      ctx!.fillStyle = "#fff7e0";
      ctx!.fillRect(0, 0, cw, ch);
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
      if (reduce) { stepSim(16, pointer.x, pointer.y); draw(pointer.x, pointer.y); }
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
        if (reduce) { stepSim(16, pointer.x, pointer.y); draw(pointer.x, pointer.y); }
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
          stepSim(FIXED_DT, pointer.x, pointer.y);
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
        <p className={styles.bp__caption}>포인터를 향해 당기는 인력에 처음부터 접선 방향 속도를 얹어 공이 빨려들지 않고 궤도를 그리며 돈다</p>
      </div>
    </main>
  );
}
