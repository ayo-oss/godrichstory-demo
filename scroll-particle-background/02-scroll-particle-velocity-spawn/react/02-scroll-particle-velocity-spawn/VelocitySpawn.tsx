// VelocitySpawn — vanilla 판(run/370/demo/02-scroll-particle-velocity-spawn/index.html) 의 React 포트.
// 계산 겹: 분사율 매핑(spawn-rate mapping) — 스크롤 속도(px/s)의 절대값이 초당 입자 발생 수를 정하고,
// 부호가 발사 방향을 정한다. 발사된 입자는 마찰(FRICTION)로 속도가 지수적으로 줄며 사라진다.
import { useEffect, useRef } from "react";
import styles from "./VelocitySpawn.module.scss";

type Box<T> = { current: T };
interface Particle { x: number; y: number; vx: number; vy: number; r: number; born: number; }

export default function VelocitySpawn() {
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
    const rng = makeLcg(4271);

    const css = getComputedStyle(root);
    const PARTICLE_COLOR = css.getPropertyValue("--particle-color").trim() || "#ffd23f";

    const SPAWN_GAIN = 0.1;
    const LAUNCH_GAIN = 0.95;
    const FRICTION = 1.15;
    const LIFE_MS = 1300;
    const MAX_PARTICLES = 150;

    let W = 0, H = 0, dpr = 1;
    let particles: Particle[] = [];
    let spawnAcc = 0;

    function fit() {
      const r = viewport!.getBoundingClientRect();
      dpr = window.devicePixelRatio || 1;
      W = r.width; H = r.height;
      canvas!.width = Math.round(W * dpr);
      canvas!.height = Math.round(H * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    let scrollPos = 0, scrollVel = 0, scrollDir = 0, idleMs = 0, lastTop = 0, lastT = 0;
    function sampleScroll(now: number) {
      const top = viewport!.scrollTop;
      const max = Math.max(1, viewport!.scrollHeight - viewport!.clientHeight);
      scrollPos = top / max;
      const dt = lastT ? Math.max(1, now - lastT) : 16;
      const v = (top - lastTop) / dt * 1000;
      scrollVel += (v - scrollVel) * 0.35;
      if (Math.abs(scrollVel) > 4) { scrollDir = scrollVel > 0 ? 1 : -1; idleMs = 0; } else { idleMs += dt; }
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

    function spawnOne(now: number) {
      const p: Particle = {
        x: W * 0.5 + (rng() - 0.5) * 20,
        y: H * 0.5 + (rng() - 0.5) * 20,
        vx: scrollVel * LAUNCH_GAIN + (rng() - 0.5) * 40,
        vy: (rng() - 0.5) * 60 - scrollDir * 20,
        r: 2 + rng() * 3.2,
        born: now,
      };
      particles.push(p);
      if (particles.length > MAX_PARTICLES) particles.shift();
    }

    function step(now: number, dtSec: number) {
      const rate = Math.min(140, Math.abs(scrollVel) * SPAWN_GAIN);
      spawnAcc += rate * dtSec;
      while (spawnAcc >= 1) { spawnOne(now); spawnAcc -= 1; }

      const decay = Math.exp(-FRICTION * dtSec);
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.vx *= decay; p.vy *= decay;
        p.x += p.vx * dtSec;
        p.y += p.vy * dtSec;
        if (now - p.born > LIFE_MS) particles.splice(i, 1);
      }
    }

    function paint(now: number) {
      ctx!.clearRect(0, 0, W, H);
      ctx!.fillStyle = PARTICLE_COLOR;
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const t = (now - p.born) / LIFE_MS;
        ctx!.globalAlpha = Math.max(0, 1 - t) * 0.85;
        ctx!.beginPath(); ctx!.arc(p.x, p.y, p.r * (1 - t * 0.4), 0, Math.PI * 2); ctx!.fill();
      }
      ctx!.globalAlpha = 1;
    }

    function updateVal() { val!.textContent = Math.round(Math.abs(scrollVel)) + "px/s"; }

    function paintStatic() {
      ctx!.clearRect(0, 0, W, H);
      ctx!.fillStyle = PARTICLE_COLOR;
      const n = 10 + Math.round(scrollPos * 40);
      for (let i = 0; i < n; i++) {
        const ang = (i / n) * Math.PI * 2;
        const rad = 12 + (i % 5) * 10 + scrollPos * 20;
        const x = W * 0.5 + Math.cos(ang) * rad;
        const y = H * 0.5 + Math.sin(ang) * rad * 0.6;
        ctx!.globalAlpha = 0.6;
        ctx!.beginPath(); ctx!.arc(x, y, 2, 0, Math.PI * 2); ctx!.fill();
      }
      ctx!.globalAlpha = 1;
      updateVal();
    }

    let lastFrameT = 0;
    function frame(now: number) {
      if (!lastFrameT) lastFrameT = now;
      const dtSec = Math.min(0.05, (now - lastFrameT) / 1000);
      lastFrameT = now;
      step(now, dtSec);
      paint(now);
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
          <span>빠르게 끌수록 입자가 더 많이, 더 빠르게 튑니다</span>
        </p>
        <div className={styles.viewport} ref={viewportRef} tabIndex={0} role="region" aria-label="입자 분사 스크롤 영역">
          <canvas className={styles.canvas} ref={canvasRef} aria-hidden="true" />
          <b className={styles.val} ref={valRef} aria-hidden="true">0px/s</b>
          <div className={styles.track} aria-hidden="true" />
        </div>
      </div>
    </main>
  );
}
