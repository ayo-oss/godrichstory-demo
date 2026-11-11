import { useEffect, useRef } from "react";
import styles from "./SmokeEffectHeroScrollScene.module.scss";

type Particle = { x: number; y: number; born: number; wSeed: number };

export default function SmokeEffectHeroScrollScene() {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    if (!root || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const wrap = canvas.parentElement as HTMLElement;

    // 훅 06·09 합성: scrollProgress 하나가 항목 03 의 발생량 계산과 항목 06 의
    // 포인터-소용돌이 계산을 동시에 구동한다(자세한 설명은 vanilla index.html 참조).
    const CALC_W = 160, CALC_H = 100;
    const SMOKE_RISE_SPEED_PX = 14;
    const BASE_EMISSION_PER_S = 6;
    const EMISSION_RANGE_PER_S = 24;
    const SMOKE_SWIRL_RADIUS_BASE = 16;
    const SMOKE_SWIRL_RADIUS_RANGE = 30;
    const SMOKE_SWIRL_STRENGTH = 60;
    const PLUME_LIFE_MS = 2200;

    function seedRand(seed: number) {
      let s = seed >>> 0;
      return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    }
    const NOISE_DIM = 40;
    const noiseRand = seedRand(423090);
    const noiseTable = new Float32Array(NOISE_DIM * NOISE_DIM);
    for (let ni = 0; ni < noiseTable.length; ni += 1) noiseTable[ni] = noiseRand();
    function noiseAt(xi: number, yi: number) {
      const wx = ((xi % NOISE_DIM) + NOISE_DIM) % NOISE_DIM;
      const wy = ((yi % NOISE_DIM) + NOISE_DIM) % NOISE_DIM;
      return noiseTable[wy * NOISE_DIM + wx];
    }
    function smoothstep(t: number) { return t * t * (3 - 2 * t); }
    function valueNoise2D(x: number, y: number) {
      const x0 = Math.floor(x), y0 = Math.floor(y);
      const tx = smoothstep(x - x0), ty = smoothstep(y - y0);
      const v00 = noiseAt(x0, y0), v10 = noiseAt(x0 + 1, y0);
      const v01 = noiseAt(x0, y0 + 1), v11 = noiseAt(x0 + 1, y0 + 1);
      const a = v00 + (v10 - v00) * tx;
      const b = v01 + (v11 - v01) * tx;
      return a + (b - a) * ty;
    }

    const pRand = seedRand(423091);
    let particles: Particle[] = [];
    let spawnAcc = 0;
    let scrollProgress = 0.15;

    function spawn(bornMs: number) {
      particles.push({
        x: CALC_W * 0.5 + (pRand() - 0.5) * 16,
        y: CALC_H - 6,
        born: bornMs,
        wSeed: pRand() * 1000
      });
    }

    let pointerX = CALC_W * 0.5, pointerY = CALC_H * 0.4;
    let pointerActive = false;

    function stepSim(dtMs: number, nowMs: number) {
      const dtS = dtMs / 1000;
      const emissionRate = BASE_EMISSION_PER_S + scrollProgress * EMISSION_RANGE_PER_S;
      const swirlRadius = SMOKE_SWIRL_RADIUS_BASE + scrollProgress * SMOKE_SWIRL_RADIUS_RANGE;
      spawnAcc += dtMs * emissionRate / 1000;
      const cap = 260;
      while (spawnAcc >= 1) {
        if (particles.length < cap) spawn(nowMs);
        spawnAcc -= 1;
      }
      const alive: Particle[] = [];
      for (let i = 0; i < particles.length; i += 1) {
        const p = particles[i];
        const turb = (valueNoise2D(p.wSeed * 0.03, nowMs * 0.0017) - 0.5) * 2;
        p.x += turb * 10 * dtS;
        p.y -= SMOKE_RISE_SPEED_PX * dtS;
        const rx = p.x - pointerX, ry = p.y - pointerY;
        const dist = Math.hypot(rx, ry);
        if (dist < swirlRadius && dist > 0.5) {
          const push = (1 - dist / swirlRadius) * SMOKE_SWIRL_STRENGTH;
          const tx = -ry / dist, ty = rx / dist;
          p.x += tx * push * dtS;
          p.y += ty * push * dtS;
        }
        if (nowMs - p.born < PLUME_LIFE_MS) alive.push(p);
      }
      particles = alive;
    }

    let cw = 480, ch = 300;
    function drawSmoke(nowMs: number) {
      const sx = cw / CALC_W, sy = ch / CALC_H;
      ctx!.clearRect(0, 0, cw, ch);
      const densityAlpha = 0.34 + scrollProgress * 0.18;
      for (let i = 0; i < particles.length; i += 1) {
        const p = particles[i];
        const f = Math.max(0, Math.min(1, (nowMs - p.born) / PLUME_LIFE_MS));
        const r = 6 + f * 15;
        const alpha = Math.sin(f * Math.PI) * densityAlpha;
        if (alpha <= 0.01) continue;
        const dx = p.x * sx, dy = p.y * sy, dr = r * ((sx + sy) / 2);
        const g = ctx!.createRadialGradient(dx, dy, 0, dx, dy, dr);
        g.addColorStop(0, "rgba(232,226,240," + alpha + ")");
        g.addColorStop(1, "rgba(232,226,240,0)");
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

    let userDriven = false;
    function applyScroll(delta: number) {
      userDriven = true;
      scrollProgress = Math.max(0, Math.min(1, scrollProgress + delta));
      if (reduce) { stepSim(16, elapsed); drawSmoke(elapsed); }
    }
    function onWheel(e: WheelEvent) {
      e.preventDefault();
      applyScroll(e.deltaY * 0.0025);
    }
    function onKeydown(e: KeyboardEvent) {
      if (e.key === "ArrowDown" || e.key === "PageDown") { e.preventDefault(); applyScroll(0.08); }
      else if (e.key === "ArrowUp" || e.key === "PageUp") { e.preventDefault(); applyScroll(-0.08); }
    }
    function onPointerMove(e: PointerEvent) {
      pointerActive = true;
      const r = wrap.getBoundingClientRect();
      pointerX = (e.clientX - r.left) / r.width * CALC_W;
      pointerY = (e.clientY - r.top) / r.height * CALC_H;
      if (reduce) { stepSim(16, elapsed); drawSmoke(elapsed); }
    }
    function onPointerLeave() { pointerActive = false; }
    wrap.addEventListener("wheel", onWheel, { passive: false });
    wrap.addEventListener("keydown", onKeydown);
    wrap.addEventListener("pointermove", onPointerMove);
    wrap.addEventListener("pointerleave", onPointerLeave);

    function triangleWave(t: number, period: number) {
      const phase = (t % period) / period;
      return phase < 0.5 ? phase * 2 : 2 - phase * 2;
    }
    function virtualPointerOrbit(t: number) {
      return {
        x: CALC_W * (0.35 + 0.3 * ((Math.sin(t * 0.0012) + 1) / 2)),
        y: CALC_H * (0.3 + 0.4 * ((Math.cos(t * 0.0015) + 1) / 2))
      };
    }

    const SCROLL_AUTO_PERIOD_MS = 3400;
    const warmSteps = reduce ? 160 : 130;
    for (let w = 0; w < warmSteps; w += 1) { elapsed += 20; stepSim(20, elapsed); }

    let lastTs: number | null = null;
    let raf = 0;
    function tick(ts: number) {
      if (lastTs === null) lastTs = ts;
      const dt = Math.min(ts - lastTs, 48);
      lastTs = ts;
      if (!reduce) {
        elapsed += dt;
        if (!userDriven && root!.classList.contains("is-demo")) {
          scrollProgress = triangleWave(elapsed, SCROLL_AUTO_PERIOD_MS);
        }
        if (!pointerActive) {
          const v = virtualPointerOrbit(elapsed);
          pointerX = v.x; pointerY = v.y;
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
      wrap.removeEventListener("wheel", onWheel);
      wrap.removeEventListener("keydown", onKeydown);
      wrap.removeEventListener("pointermove", onPointerMove);
      wrap.removeEventListener("pointerleave", onPointerLeave);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={`${styles.smk} is-demo`} ref={rootRef} tabIndex={0}>
        <canvas className={styles.smk__canvas} ref={canvasRef} width={480} height={300} />
        <p className={styles.smk__caption}>스크롤 값이 커질수록 연기 발생량과 확산 범위가 함께 늘어나 화면 전체 밀도가 짙어진다</p>
      </div>
    </main>
  );
}
