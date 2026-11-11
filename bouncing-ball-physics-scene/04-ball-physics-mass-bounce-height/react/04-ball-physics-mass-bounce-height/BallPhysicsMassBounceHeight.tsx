import { useEffect, useRef } from "react";
import styles from "./BallPhysicsMassBounceHeight.module.scss";

type Ball = { x: number; y: number; vy: number; mass: number; r: number; color: string; rest: number; squash: number; settled: boolean };

export default function BallPhysicsMassBounceHeight() {
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
    const GRAVITY = 900;
    const BALL_MASS_BOUNCE_FACTOR = 1.4;
    const BASE_MASS_REST = 6;
    const SLEEP_THRESHOLD = 24;
    const SLEEP_HOLD_MS = 300;

    const MASSES = [10, 16, 22, 30];
    const COLORS = ["#6ec8ff", "#4cd4a6", "#b9a0ff", "#ff9ebb"];
    const XPOS = [0.16, 0.4, 0.64, 0.86];

    function restitutionFor(mass: number) {
      return Math.max(0.22, Math.min(0.95, (BASE_MASS_REST * BALL_MASS_BOUNCE_FACTOR) / mass));
    }

    let balls: Ball[] = [];
    let impacts: { x: number; y: number; born: number; strength: number }[] = [];
    function reset() {
      balls = MASSES.map((mass, i) => ({
        x: CALC_W * XPOS[i], y: 26, vy: 0, mass, r: mass * 0.5,
        color: COLORS[i], rest: restitutionFor(mass), squash: 0, settled: false
      }));
      impacts = [];
    }
    reset();

    function stepSim(dtMs: number, nowMs: number) {
      const dtS = dtMs / 1000;
      for (const b of balls) {
        if (b.settled) { b.squash = Math.max(0, b.squash - dtS * 6); continue; }
        b.vy += GRAVITY * dtS;
        b.y += b.vy * dtS;
        const floor = CALC_H - b.r;
        if (b.y >= floor) {
          b.y = floor;
          if (Math.abs(b.vy) < SLEEP_THRESHOLD) {
            b.vy = 0; b.settled = true; b.squash = 0.5;
          } else {
            impacts.push({ x: b.x, y: floor, born: nowMs, strength: Math.min(1, Math.abs(b.vy) / 320) });
            b.squash = Math.max(b.squash, Math.min(0.85, Math.abs(b.vy) / 300));
            b.vy = -b.vy * b.rest;
          }
        }
        b.squash = Math.max(0, b.squash - dtS * 3.5);
      }
      impacts = impacts.filter((im) => nowMs - im.born < 260);
    }

    function allSettled() { return balls.every((b) => b.settled); }

    let cw = 480, ch = 300;
    function draw() {
      const sx = cw / CALC_W, sy = ch / CALC_H;
      ctx!.clearRect(0, 0, cw, ch);
      ctx!.strokeStyle = "rgba(23,20,26,0.08)";
      ctx!.lineWidth = 1;
      ctx!.beginPath();
      ctx!.moveTo(0, (CALC_H - 2) * sy);
      ctx!.lineTo(cw, (CALC_H - 2) * sy);
      ctx!.stroke();
      for (const b of balls) {
        const px = b.x * sx, py = b.y * sy, pr = b.r * ((sx + sy) / 2);
        const shf = Math.max(0, 1 - (CALC_H - b.r - b.y) / 130);
        const shw = pr * (0.9 + shf * 0.4);
        ctx!.beginPath();
        ctx!.ellipse(px, (CALC_H - 3) * sy, shw, shw * 0.24, 0, 0, Math.PI * 2);
        ctx!.fillStyle = "rgba(23,20,26," + (0.08 + shf * 0.14) + ")";
        ctx!.fill();
        const sqX = 1 + b.squash * 0.5, sqY = 1 - b.squash * 0.35;
        ctx!.save();
        ctx!.translate(px, py + pr * b.squash * 0.35);
        ctx!.scale(sqX, sqY);
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
      draw();
    }

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let elapsed = 0;
    if (reduce) root.classList.remove("is-demo");

    let lastTs: number | null = null;
    let acc = 0;
    const FIXED_DT = 16;
    let settledAt: number | null = null;
    let raf = 0;
    function tick(ts: number) {
      if (lastTs === null) lastTs = ts;
      const frameDt = Math.min(ts - lastTs, 48);
      lastTs = ts;
      if (!reduce) {
        acc += frameDt;
        while (acc >= FIXED_DT) {
          elapsed += FIXED_DT;
          stepSim(FIXED_DT, elapsed);
          if (allSettled()) {
            if (settledAt === null) settledAt = elapsed;
            else if (elapsed - settledAt > SLEEP_HOLD_MS) { settledAt = null; elapsed = 0; reset(); }
          }
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
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={`${styles.bp} is-demo`} ref={rootRef}>
        <canvas className={styles.bp__canvas} ref={canvasRef} width={480} height={300} />
        <p className={styles.bp__caption}>공마다 다른 크기를 질량값으로 써서 떨어질 때 힘을 계산해, 같은 높이에서 떨어져도 가벼운 공은 높이 튀어 오르고 무거운 공은 낮게 튄다</p>
      </div>
    </main>
  );
}
