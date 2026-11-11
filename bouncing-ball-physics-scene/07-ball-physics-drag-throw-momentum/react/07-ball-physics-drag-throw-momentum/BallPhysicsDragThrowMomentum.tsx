import { useEffect, useRef } from "react";
import styles from "./BallPhysicsDragThrowMomentum.module.scss";

type Sample = { x: number; y: number; t: number };

export default function BallPhysicsDragThrowMomentum() {
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
    const WALL_BOUNCE = 0.72;
    const AIR_DRAG = 0.55;
    const SAMPLE_WINDOW_MS = 140;
    const KEY_IMPULSE = 130;
    const THROW_IMPULSE = 260;

    const ball = { x: CALC_W * 0.5, y: CALC_H * 0.5, vx: 90, vy: -60, r: 18, color: "#ffcf7a", squash: 0, heading: -0.9 };
    let dragging = false;
    let samples: Sample[] = [];

    function recordSample(x: number, y: number, t: number) {
      samples.push({ x, y, t });
      while (samples.length && t - samples[0].t > SAMPLE_WINDOW_MS) samples.shift();
    }

    function releaseVelocity() {
      if (samples.length < 2) return { vx: 0, vy: 0 };
      const a = samples[0], b = samples[samples.length - 1];
      const dt = Math.max(16, b.t - a.t) / 1000;
      return { vx: (b.x - a.x) / dt, vy: (b.y - a.y) / dt };
    }

    function throwBall(vx: number, vy: number) {
      ball.vx = vx; ball.vy = vy;
      if (Math.hypot(vx, vy) > 1) ball.heading = Math.atan2(vy, vx);
    }

    function stepSim(dtMs: number) {
      const dtS = dtMs / 1000;
      if (dragging) return;
      ball.vx -= ball.vx * AIR_DRAG * dtS;
      ball.vy -= ball.vy * AIR_DRAG * dtS;
      ball.x += ball.vx * dtS;
      ball.y += ball.vy * dtS;
      let hit = false;
      if (ball.x - ball.r < 0) { ball.x = ball.r; ball.vx = -ball.vx * WALL_BOUNCE; hit = true; }
      if (ball.x + ball.r > CALC_W) { ball.x = CALC_W - ball.r; ball.vx = -ball.vx * WALL_BOUNCE; hit = true; }
      if (ball.y - ball.r < 0) { ball.y = ball.r; ball.vy = -ball.vy * WALL_BOUNCE; hit = true; }
      if (ball.y + ball.r > CALC_H) { ball.y = CALC_H - ball.r; ball.vy = -ball.vy * WALL_BOUNCE; hit = true; }
      if (hit) ball.squash = Math.min(1, Math.hypot(ball.vx, ball.vy) / 260 + 0.2);
      ball.squash = Math.max(0, ball.squash - dtS * 3.4);
    }

    let cw = 480, ch = 300;
    function draw() {
      const sx = cw / CALC_W, sy = ch / CALC_H;
      ctx!.fillStyle = "rgba(255,110,46,0.24)";
      ctx!.fillRect(0, 0, cw, ch);
      ctx!.strokeStyle = "rgba(255,255,255,0.3)";
      ctx!.lineWidth = 2;
      ctx!.strokeRect(2, 2, cw - 4, ch - 4);
      const px = ball.x * sx, py = ball.y * sy, pr = ball.r * ((sx + sy) / 2);
      const speed = Math.hypot(ball.vx, ball.vy);
      const stretch = dragging ? 1.08 : 1 + Math.min(0.4, speed / 600);
      ctx!.save();
      ctx!.translate(px, py);
      ctx!.rotate(ball.heading);
      ctx!.scale(stretch, (1 - ball.squash * 0.3) / stretch);
      ctx!.beginPath();
      ctx!.arc(0, 0, pr, 0, Math.PI * 2);
      ctx!.fillStyle = ball.color;
      ctx!.fill();
      ctx!.restore();
      if (dragging) {
        ctx!.beginPath();
        ctx!.arc(px, py, pr + 6, 0, Math.PI * 2);
        ctx!.strokeStyle = "rgba(255,255,255,0.6)";
        ctx!.lineWidth = 2;
        ctx!.stroke();
      }
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

    function toCalc(clientX: number, clientY: number) {
      const rect = canvas!.getBoundingClientRect();
      const nx = (clientX - rect.left) / rect.width;
      const ny = (clientY - rect.top) / rect.height;
      return { x: nx * CALC_W, y: ny * CALC_H };
    }

    function startDrag(cx: number, cy: number) {
      root!.classList.remove("is-demo");
      const p = toCalc(cx, cy);
      if (Math.hypot(p.x - ball.x, p.y - ball.y) > ball.r * 2.2) return;
      dragging = true;
      samples = [];
      recordSample(p.x, p.y, performance.now());
    }
    function moveDrag(cx: number, cy: number) {
      if (!dragging) return;
      const p = toCalc(cx, cy);
      ball.x = Math.max(ball.r, Math.min(CALC_W - ball.r, p.x));
      ball.y = Math.max(ball.r, Math.min(CALC_H - ball.r, p.y));
      recordSample(ball.x, ball.y, performance.now());
      if (reduce) draw();
    }
    function endDrag() {
      if (!dragging) return;
      dragging = false;
      const v = releaseVelocity();
      const mag = Math.hypot(v.vx, v.vy);
      const maxSpeed = 420;
      if (mag > maxSpeed) { v.vx = (v.vx / mag) * maxSpeed; v.vy = (v.vy / mag) * maxSpeed; }
      throwBall(v.vx, v.vy);
      if (reduce) { stepSim(16); draw(); }
    }

    function onMouseDown(e: MouseEvent) { startDrag(e.clientX, e.clientY); }
    function onMouseMove(e: MouseEvent) { moveDrag(e.clientX, e.clientY); }
    function onMouseUp() { endDrag(); }
    function onTouchStart(e: TouchEvent) { if (e.touches[0]) startDrag(e.touches[0].clientX, e.touches[0].clientY); }
    function onTouchMove(e: TouchEvent) { if (e.touches[0]) moveDrag(e.touches[0].clientX, e.touches[0].clientY); }
    function onTouchEnd() { endDrag(); }
    canvas.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    canvas.addEventListener("touchstart", onTouchStart, { passive: true });
    canvas.addEventListener("touchmove", onTouchMove, { passive: true });
    canvas.addEventListener("touchend", onTouchEnd);

    function onKeyDown(e: KeyboardEvent) {
      let handled = true;
      if (e.key === "ArrowLeft") throwBall(ball.vx - KEY_IMPULSE, ball.vy);
      else if (e.key === "ArrowRight") throwBall(ball.vx + KEY_IMPULSE, ball.vy);
      else if (e.key === "ArrowUp") throwBall(ball.vx, ball.vy - KEY_IMPULSE);
      else if (e.key === "ArrowDown") throwBall(ball.vx, ball.vy + KEY_IMPULSE);
      else if (e.key === " " || e.code === "Space") {
        const ang = ball.heading;
        throwBall(Math.cos(ang) * THROW_IMPULSE, Math.sin(ang) * THROW_IMPULSE);
      } else handled = false;
      if (handled) {
        e.preventDefault();
        root!.classList.remove("is-demo");
        if (reduce) { stepSim(16); draw(); }
      }
    }
    root.addEventListener("keydown", onKeyDown);

    let demoState = "idle";
    function demoDrive(nowMs: number) {
      const cyc = nowMs % 1600;
      if (cyc < 480) {
        if (demoState !== "drag") { demoState = "drag"; dragging = true; samples = []; }
        const f = cyc / 480;
        const sx0 = CALC_W * 0.28, sy0 = CALC_H * 0.7;
        const ex0 = CALC_W * 0.62, ey0 = CALC_H * 0.32;
        ball.x = sx0 + (ex0 - sx0) * f;
        ball.y = sy0 + (ey0 - sy0) * f;
        recordSample(ball.x, ball.y, nowMs);
      } else if (demoState !== "thrown") {
        demoState = "thrown";
        dragging = false;
        const v = releaseVelocity();
        const mag = Math.hypot(v.vx, v.vy) || 1;
        const target = 300;
        throwBall((v.vx / mag) * target, (v.vy / mag) * target);
      }
    }

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
          if (root!.classList.contains("is-demo")) demoDrive(elapsed);
          stepSim(FIXED_DT);
          acc -= FIXED_DT;
        }
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
      canvas!.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      canvas!.removeEventListener("touchstart", onTouchStart);
      canvas!.removeEventListener("touchmove", onTouchMove);
      canvas!.removeEventListener("touchend", onTouchEnd);
      root!.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={`${styles.bp} is-demo`} ref={rootRef} tabIndex={0}>
        <canvas className={styles.bp__canvas} ref={canvasRef} width={480} height={300} />
        <p className={styles.bp__caption}>공을 쥐고 움직인 최근 몇 프레임의 이동량으로 속도를 계산해, 놓는 순간 그 속도 그대로 던져지고 벽에 부딪히면 반사된다</p>
      </div>
    </main>
  );
}
