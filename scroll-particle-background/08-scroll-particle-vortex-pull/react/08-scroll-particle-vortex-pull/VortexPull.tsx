// VortexPull — vanilla 판(run/370/demo/08-scroll-particle-vortex-pull/index.html) 의 React 포트.
// 계산 겹: 소용돌이 극좌표 벡터장(vortex polar vector field) — 각속도는 1/r 법칙(각속도 = VORTEX_K / r)을
// 따르는 진짜 소용돌이 장이라 중심에 가까울수록 빠르게 돈다. 스크롤 위치가 반지름의 목표값을 정해
// 깊이 끌수록 장이 조여들고(반지름↓ → 각속도↑), 손을 떼면 다시 풀린다.
import { useEffect, useRef } from "react";
import styles from "./VortexPull.module.scss";

type Box<T> = { current: T };
interface Particle { theta: number; r: number; size: number; }

export default function VortexPull() {
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const viewportRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const canvasRef = useRef(null) as unknown as Box<HTMLCanvasElement>;
  const valRef = useRef(null) as unknown as Box<HTMLElement>;
  const rafFrameRef = useRef(0) as unknown as Box<number>;
  const rafDriveRef = useRef(0) as unknown as Box<number>;

  useEffect(() => {
    const root = rootRef.current;
    const viewport = viewportRef.current;
    const canvas = canvasRef.current;
    const val = valRef.current;
    if (!root || !viewport || !canvas || !val) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let isDemo = true;

    function makeLcg(seed: number) {
      let s = seed >>> 0;
      return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    }
    const rng = makeLcg(31415926);

    const css = getComputedStyle(root);
    const PARTICLE_COLOR = css.getPropertyValue("--particle-color").trim() || "#0a4fe8";

    const VORTEX_K = 3400;
    const PULL_RATE = 5.5;
    const REST_SHRINK = 0.62;
    const COUNT = 48;

    let W = 0, H = 0, dpr = 1, cx = 0, cy = 0, restR = 60;
    let particles: Particle[] = [];

    function initParticles() {
      particles = [];
      for (let i = 0; i < COUNT; i++) {
        particles.push({
          theta: rng() * Math.PI * 2,
          r: restR * (0.25 + rng() * 0.75),
          size: 1.3 + rng() * 2.1,
        });
      }
    }

    function fit() {
      const r = viewport!.getBoundingClientRect();
      dpr = window.devicePixelRatio || 1;
      W = r.width; H = r.height;
      canvas!.width = Math.round(W * dpr);
      canvas!.height = Math.round(H * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      cx = W / 2; cy = H / 2;
      restR = Math.min(W, H) * 0.44;
      if (particles.length === 0) initParticles();
    }

    let scrollPos = 0, scrollVel = 0, scrollDir = 0, spinDir = 1, idleMs = 0, lastTop = 0, lastT = 0;
    function sampleScroll(now: number) {
      const top = viewport!.scrollTop;
      const max = Math.max(1, viewport!.scrollHeight - viewport!.clientHeight);
      scrollPos = top / max;
      const dt = lastT ? Math.max(1, now - lastT) : 16;
      const v = (top - lastTop) / dt * 1000;
      scrollVel += (v - scrollVel) * 0.3;
      if (Math.abs(scrollVel) > 4) { scrollDir = scrollVel > 0 ? 1 : -1; spinDir = scrollDir; idleMs = 0; } else { idleMs += dt; }
      lastTop = top; lastT = now;
    }

    function onScroll() {
      sampleScroll(performance.now());
      if (reduce) paintStatic();
    }
    viewport.addEventListener("scroll", onScroll);

    function human() { if (isDemo) { isDemo = false; } }
    viewport.addEventListener("wheel", human, { passive: true });
    viewport.addEventListener("touchstart", human, { passive: true });
    viewport.addEventListener("pointerdown", human, { passive: true });

    function step(dtSec: number) {
      const target = restR * (1 - scrollPos * REST_SHRINK);
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.r += (target - p.r) * PULL_RATE * dtSec;
        const angVel = VORTEX_K / Math.max(p.r, 8);
        p.theta += angVel * dtSec * 0.01 * spinDir;
      }
    }

    function drawParticles() {
      ctx!.fillStyle = PARTICLE_COLOR;
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const x = cx + Math.cos(p.theta) * p.r;
        const y = cy + Math.sin(p.theta) * p.r * 0.72;
        const near = 1 - Math.min(1, p.r / restR);
        ctx!.globalAlpha = 0.4 + near * 0.5;
        ctx!.beginPath(); ctx!.arc(x, y, p.size * (1 + near * 0.6), 0, Math.PI * 2); ctx!.fill();
      }
      ctx!.globalAlpha = 1;
    }

    function paint() {
      ctx!.clearRect(0, 0, W, H);
      drawParticles();
    }

    function updateVal() { val!.textContent = Math.round(scrollPos * 100) + "%"; }

    function paintStatic() {
      const target = restR * (1 - scrollPos * REST_SHRINK);
      for (let i = 0; i < particles.length; i++) particles[i].r += (target - particles[i].r) * 0.3;
      paint();
      updateVal();
    }

    let lastFrameT = 0;
    function frame(now: number) {
      if (!lastFrameT) lastFrameT = now;
      const dtSec = Math.min(0.05, (now - lastFrameT) / 1000);
      lastFrameT = now;
      step(dtSec);
      paint();
      updateVal();
      rafFrameRef.current = requestAnimationFrame(frame);
    }

    const DRIVE_PERIOD_MS = 2000;
    let driveStart = 0;
    function triangle(frac: number) { return frac < 0.5 ? frac * 2 : 2 - frac * 2; }
    function driveTick(now: number) {
      if (!driveStart) driveStart = now;
      if (isDemo && !reduce) {
        const frac = ((now - driveStart) % DRIVE_PERIOD_MS) / DRIVE_PERIOD_MS;
        const w = triangle(frac);
        const max = Math.max(1, viewport!.scrollHeight - viewport!.clientHeight);
        viewport!.scrollTop = w * max;
      }
      rafDriveRef.current = requestAnimationFrame(driveTick);
    }

    function onResize() { fit(); }
    window.addEventListener("resize", onResize);
    fit();

    if (reduce) {
      sampleScroll(performance.now());
      paintStatic();
    } else {
      rafFrameRef.current = requestAnimationFrame(frame);
      rafDriveRef.current = requestAnimationFrame(driveTick);
    }

    return () => {
      window.removeEventListener("resize", onResize);
      viewport.removeEventListener("scroll", onScroll);
      viewport.removeEventListener("wheel", human);
      viewport.removeEventListener("touchstart", human);
      viewport.removeEventListener("pointerdown", human);
      cancelAnimationFrame(rafFrameRef.current);
      cancelAnimationFrame(rafDriveRef.current);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.root} ref={rootRef}>
        <p className={styles.hint}>
          <svg className={styles.icon} viewBox="0 0 256 256" aria-hidden="true"><g fill="currentColor"><path d="M224 128a96 96 0 1 1-96-96a96 96 0 0 1 96 96" opacity=".2" /><path d="M232 128a104 104 0 0 1-208 0c0-41 23.81-78.36 60.66-95.27a8 8 0 0 1 6.68 14.54C60.15 61.59 40 93.27 40 128a88 88 0 0 0 176 0c0-34.73-20.15-66.41-51.34-80.73a8 8 0 0 1 6.68-14.54C208.19 49.64 232 87 232 128" /></g></svg>
          <span>스크롤 위치가 깊을수록 소용돌이가 중심으로 세게 조여듭니다</span>
        </p>
        <div className={styles.viewport} ref={viewportRef} tabIndex={0} role="region" aria-label="입자 소용돌이 스크롤 영역">
          <canvas className={styles.canvas} ref={canvasRef} aria-hidden="true" />
          <b className={styles.val} ref={valRef} aria-hidden="true">0%</b>
          <div className={styles.track} aria-hidden="true" />
        </div>
      </div>
    </main>
  );
}
