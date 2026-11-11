import { useEffect, useRef } from "react";
import styles from "./SmokeEffectPressPuffBurst.module.scss";

type Particle = { x: number; y: number; vx: number; vy: number; born: number };

export default function SmokeEffectPressPuffBurst() {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    const btn = btnRef.current;
    if (!root || !canvas || !btn) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const wrap = canvas.parentElement as HTMLElement;

    const CALC_W = 160, CALC_H = 100;
    const SMOKE_BURST_COUNT = 34;
    const SMOKE_BURST_SPEED_PX_S = 60;
    const SMOKE_BURST_LIFE_MS = 620;
    const ORIGIN_X = CALC_W * 0.5, ORIGIN_Y = CALC_H * 0.56;

    function seedRand(seed: number) {
      let s = seed >>> 0;
      return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    }
    const pRand = seedRand(423071);
    let particles: Particle[] = [];

    function burst(bornMs: number) {
      for (let i = 0; i < SMOKE_BURST_COUNT; i += 1) {
        const ang = pRand() * Math.PI * 2;
        const speed = SMOKE_BURST_SPEED_PX_S * (0.4 + pRand() * 0.9);
        particles.push({
          x: ORIGIN_X, y: ORIGIN_Y,
          vx: Math.cos(ang) * speed,
          vy: Math.sin(ang) * speed,
          born: bornMs
        });
      }
    }

    function stepSim(dtMs: number, nowMs: number) {
      const dtS = dtMs / 1000;
      const alive: Particle[] = [];
      for (let i = 0; i < particles.length; i += 1) {
        const p = particles[i];
        p.x += p.vx * dtS;
        p.y += p.vy * dtS;
        p.vy -= 8 * dtS;
        if (nowMs - p.born < SMOKE_BURST_LIFE_MS) alive.push(p);
      }
      particles = alive;
    }

    let cw = 480, ch = 300;
    function drawSmoke(nowMs: number) {
      const sx = cw / CALC_W, sy = ch / CALC_H;
      ctx!.clearRect(0, 0, cw, ch);
      for (let i = 0; i < particles.length; i += 1) {
        const p = particles[i];
        const f = Math.max(0, Math.min(1, (nowMs - p.born) / SMOKE_BURST_LIFE_MS));
        const r = 4 + f * 15;
        const alpha = (1 - f) * 0.55;
        if (alpha <= 0.01) continue;
        const dx = p.x * sx, dy = p.y * sy, dr = r * ((sx + sy) / 2);
        const g = ctx!.createRadialGradient(dx, dy, 0, dx, dy, dr);
        g.addColorStop(0, "rgba(28,24,20," + alpha + ")");
        g.addColorStop(1, "rgba(28,24,20,0)");
        ctx!.fillStyle = g;
        ctx!.beginPath();
        ctx!.arc(dx, dy, dr, 0, Math.PI * 2);
        ctx!.fill();
      }
    }

    function fit() {
      const r = wrap.getBoundingClientRect();
      cw = Math.max(1, Math.round(r.width));
      ch = Math.max(1, Math.round(r.height));
      canvas!.width = cw; canvas!.height = ch;
      drawSmoke(elapsed);
    }

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let elapsed = 0;
    if (reduce) root.classList.remove("is-demo");

    function onPointerDown() {
      burst(elapsed);
      if (reduce) drawSmoke(elapsed);
    }
    function onKeydown(e: KeyboardEvent) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        burst(elapsed);
        if (reduce) drawSmoke(elapsed);
      }
    }
    btn.addEventListener("pointerdown", onPointerDown);
    btn.addEventListener("keydown", onKeydown);

    const PUFF_LOOP_MS = 2000;
    const PUFF_TIME_1 = 260;
    const PUFF_TIME_2 = 1300;
    let lastCycle = -1;
    let triggered1 = false, triggered2 = false;

    let lastTs: number | null = null;
    let raf = 0;
    function tick(ts: number) {
      if (lastTs === null) lastTs = ts;
      const dt = Math.min(ts - lastTs, 48);
      lastTs = ts;
      if (!reduce) {
        elapsed += dt;
        if (root!.classList.contains("is-demo")) {
          const cycle = Math.floor(elapsed / PUFF_LOOP_MS);
          const phase = elapsed % PUFF_LOOP_MS;
          if (cycle !== lastCycle) { lastCycle = cycle; triggered1 = false; triggered2 = false; }
          if (!triggered1 && phase >= PUFF_TIME_1) { triggered1 = true; burst(elapsed); }
          if (!triggered2 && phase >= PUFF_TIME_2) { triggered2 = true; burst(elapsed); }
        }
        stepSim(dt, elapsed);
        drawSmoke(elapsed);
      }
      raf = requestAnimationFrame(tick);
    }
    fit();
    window.addEventListener("resize", fit);
    drawSmoke(elapsed);
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", fit);
      btn.removeEventListener("pointerdown", onPointerDown);
      btn.removeEventListener("keydown", onKeydown);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={`${styles.smk} is-demo`} ref={rootRef}>
        <canvas className={styles.smk__canvas} ref={canvasRef} width={480} height={300} />
        <p className={styles.smk__caption}>버튼이 눌린 순간 입자 뭉치 하나가 생겨 짧은 시간 안에 사방으로 퍼지다가 빠르게 옅어진다</p>
        <button className={styles.smk__btn} ref={btnRef} type="button">연기 뿜기</button>
      </div>
    </main>
  );
}
