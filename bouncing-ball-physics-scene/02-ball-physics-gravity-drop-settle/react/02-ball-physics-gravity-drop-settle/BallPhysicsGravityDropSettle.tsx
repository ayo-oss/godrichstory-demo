import { useEffect, useRef } from "react";
import styles from "./BallPhysicsGravityDropSettle.module.scss";

type Ball = {
  x0: number; x: number; y: number; vy: number; r: number; color: string;
  startAt: number; squash: number; settled: boolean;
};
type Impact = { x: number; y: number; born: number; strength: number };

export default function BallPhysicsGravityDropSettle() {
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
    const FLOOR_RESTITUTION = 0.55;
    const SLEEP_THRESHOLD = 26;
    const REST_MS = 620;

    const DROPS = [
      { x: 0.22, r: 13, color: "#ff9ebb", delay: 0 },
      { x: 0.5, r: 17, color: "#4cd4a6", delay: 200 },
      { x: 0.78, r: 11, color: "#b9a0ff", delay: 420 }
    ];

    let balls: Ball[] = [];
    let impacts: Impact[] = [];
    function reset() {
      balls = DROPS.map((d) => ({
        x0: CALC_W * d.x, x: CALC_W * d.x, y: 30, vy: 0,
        r: d.r, color: d.color, startAt: d.delay, squash: 0, settled: false
      }));
      impacts = [];
    }
    reset();

    function stepSim(dtMs: number, nowMs: number) {
      const dtS = dtMs / 1000;
      for (const b of balls) {
        if (nowMs < b.startAt) continue;
        if (b.settled) { b.squash = Math.max(0, b.squash - dtS * 6); continue; }
        b.vy += GRAVITY * dtS;
        b.y += b.vy * dtS;
        const floor = CALC_H - b.r;
        if (b.y >= floor) {
          b.y = floor;
          if (Math.abs(b.vy) < SLEEP_THRESHOLD) {
            b.vy = 0; b.settled = true; b.squash = 0.5;
            impacts.push({ x: b.x, y: floor, born: nowMs, strength: 0.35 });
          } else {
            impacts.push({ x: b.x, y: floor, born: nowMs, strength: Math.min(1, Math.abs(b.vy) / 320) });
            b.squash = Math.max(b.squash, Math.min(0.85, Math.abs(b.vy) / 300));
            b.vy = -b.vy * FLOOR_RESTITUTION;
          }
        }
        b.squash = Math.max(0, b.squash - dtS * 3.5);
      }
      impacts = impacts.filter((im) => nowMs - im.born < 300);
    }

    function allSettled() { return balls.every((b) => b.settled); }

    let cw = 480, ch = 300;
    function draw(nowMs: number) {
      const sx = cw / CALC_W, sy = ch / CALC_H;
      ctx!.clearRect(0, 0, cw, ch);
      ctx!.strokeStyle = "rgba(23,20,26,0.08)";
      ctx!.lineWidth = 1;
      for (let gy = 0; gy < CALC_H; gy += 40) {
        ctx!.beginPath();
        ctx!.moveTo(0, gy * sy);
        ctx!.lineTo(cw, gy * sy);
        ctx!.stroke();
      }
      for (const im of impacts) {
        const f = (nowMs - im.born) / 300;
        const px = im.x * sx, py = im.y * sy;
        const pr = (8 + f * 22) * ((sx + sy) / 2);
        ctx!.beginPath();
        ctx!.ellipse(px, py, pr, pr * 0.32, 0, 0, Math.PI * 2);
        ctx!.strokeStyle = "rgba(23,20,26," + (im.strength * (1 - f) * 0.3) + ")";
        ctx!.lineWidth = 2;
        ctx!.stroke();
      }
      for (const b of balls) {
        if (nowMs < b.startAt) continue;
        const px = b.x * sx, py = b.y * sy, pr = b.r * ((sx + sy) / 2);
        const shf = Math.max(0, 1 - (CALC_H - b.r - b.y) / 120);
        const shw = pr * (0.9 + shf * 0.4);
        ctx!.beginPath();
        ctx!.ellipse(px, (CALC_H - 4) * sy, shw, shw * 0.26, 0, 0, Math.PI * 2);
        ctx!.fillStyle = "rgba(23,20,26," + (0.10 + shf * 0.16) + ")";
        ctx!.fill();
        const sqX = 1 + b.squash * 0.55, sqY = 1 - b.squash * 0.38;
        ctx!.save();
        ctx!.translate(px, py + pr * b.squash * 0.38);
        ctx!.scale(sqX, sqY);
        ctx!.beginPath();
        ctx!.arc(0, 0, pr, 0, Math.PI * 2);
        ctx!.fillStyle = b.color;
        ctx!.fill();
        const hg = ctx!.createRadialGradient(-pr * 0.3, -pr * 0.35, pr * 0.1, -pr * 0.3, -pr * 0.35, pr * 0.75);
        hg.addColorStop(0, "rgba(255,255,255,0.5)");
        hg.addColorStop(1, "rgba(255,255,255,0)");
        ctx!.fillStyle = hg;
        ctx!.fill();
        ctx!.restore();
      }
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
            else if (elapsed - settledAt > REST_MS) { settledAt = null; elapsed = 0; reset(); }
          }
          acc -= FIXED_DT;
        }
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
        <p className={styles.bp__caption}>매 프레임 아래 방향으로 속도를 더해 공을 떨어뜨리고, 바닥에 닿을 때마다 속도를 줄여 나가 결국 공이 멈춰 눕는다</p>
      </div>
    </main>
  );
}
