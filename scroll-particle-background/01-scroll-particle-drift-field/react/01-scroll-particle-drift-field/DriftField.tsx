// DriftField — vanilla 판(run/370/demo/01-scroll-particle-drift-field/index.html) 의 React 포트.
// 계산 겹: 속도장(velocity field) — 상승 속도는 상수, 가로 바람은 위치(y)마다 다른 위상의 사인파다.
// 스크롤 속도 값이 이 바람의 세기를 정한다. 스크롤이 0이어도 상승은 멈추지 않는다.
import { useEffect, useRef } from "react";
import styles from "./DriftField.module.scss";

type Box<T> = { current: T };
interface Particle { x: number; y: number; r: number; speedVar: number; phase: number; alpha: number; }

export default function DriftField() {
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
    const rng = makeLcg(9001);

    const css = getComputedStyle(root);
    const PARTICLE_COLOR = css.getPropertyValue("--particle-color").trim() || "#6ec8ff";

    const RISE_SPEED = 26;
    const WIND_GAIN = 1.6;
    const FIELD_FREQ = 0.02;
    const SWAY_AMP = 9;
    const COUNT = 46;

    let W = 0, H = 0, dpr = 1;
    let particles: Particle[] = [];

    function fit() {
      const r = viewport!.getBoundingClientRect();
      dpr = window.devicePixelRatio || 1;
      W = r.width; H = r.height;
      canvas!.width = Math.round(W * dpr);
      canvas!.height = Math.round(H * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function spawnAt(p: Particle, first: boolean) {
      p.x = rng() * W;
      p.y = first ? rng() * H : H + rng() * 24;
      p.r = 1.3 + rng() * 2.4;
      p.speedVar = 0.6 + rng() * 0.8;
      p.phase = rng() * Math.PI * 2;
      p.alpha = 0.34 + rng() * 0.5;
    }

    function initParticles() {
      particles = [];
      for (let i = 0; i < COUNT; i++) {
        const p: Particle = { x: 0, y: 0, r: 0, speedVar: 0, phase: 0, alpha: 0 };
        spawnAt(p, true);
        particles.push(p);
      }
    }

    let scrollPos = 0, scrollVel = 0, idleMs = 0, lastTop = 0, lastT = 0;
    function sampleScroll(now: number) {
      const top = viewport!.scrollTop;
      const max = Math.max(1, viewport!.scrollHeight - viewport!.clientHeight);
      scrollPos = top / max;
      const dt = lastT ? Math.max(1, now - lastT) : 16;
      const v = (top - lastTop) / dt * 1000;
      scrollVel += (v - scrollVel) * 0.3;
      if (Math.abs(scrollVel) > 4) { idleMs = 0; } else { idleMs += dt; }
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
      const wind = scrollVel * WIND_GAIN;
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.y -= RISE_SPEED * p.speedVar * dtSec;
        const sway = Math.sin(p.y * FIELD_FREQ + p.phase) * SWAY_AMP;
        p.x += (wind + sway) * dtSec;
        if (p.y < -8) spawnAt(p, false);
        if (p.x < -8) p.x = W + 8; else if (p.x > W + 8) p.x = -8;
      }
    }

    function paint() {
      ctx!.clearRect(0, 0, W, H);
      ctx!.fillStyle = PARTICLE_COLOR;
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        ctx!.globalAlpha = p.alpha;
        ctx!.beginPath(); ctx!.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx!.fill();
      }
      ctx!.globalAlpha = 1;
    }

    function updateVal() { val!.textContent = Math.round(scrollPos * 100) + "%"; }

    function paintStatic() {
      ctx!.clearRect(0, 0, W, H);
      ctx!.fillStyle = PARTICLE_COLOR;
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const sway = Math.sin(p.y * FIELD_FREQ + p.phase) * SWAY_AMP * 0.06;
        const x = ((p.x + sway + scrollPos * 30) % W + W) % W;
        ctx!.globalAlpha = p.alpha;
        ctx!.beginPath(); ctx!.arc(x, p.y, p.r, 0, Math.PI * 2); ctx!.fill();
      }
      ctx!.globalAlpha = 1;
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
    initParticles();

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
          <span>끌어올리면 기준 흐름 위에 바람 값이 겹쳐집니다</span>
        </p>
        <div className={styles.viewport} ref={viewportRef} tabIndex={0} role="region" aria-label="파티클 흐름 스크롤 영역">
          <canvas className={styles.canvas} ref={canvasRef} aria-hidden="true" />
          <b className={styles.val} ref={valRef} aria-hidden="true">0%</b>
          <div className={styles.track} aria-hidden="true" />
        </div>
      </div>
    </main>
  );
}
