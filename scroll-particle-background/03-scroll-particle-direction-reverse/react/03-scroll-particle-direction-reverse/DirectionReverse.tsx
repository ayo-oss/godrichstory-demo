// DirectionReverse — vanilla 판(run/370/demo/03-scroll-particle-direction-reverse/index.html) 의 React 포트.
// 계산 겹: 방향 부호장(direction-sign field) — 파티클은 레인마다 고정된 부호(lane sign)를 갖고,
// 실제 가로 속도는 그 부호에 스크롤 방향 부호를 곱한 값이다. 방향이 바뀌면 레인의 엇갈림이 통째로 뒤집힌다.
import { useEffect, useRef } from "react";
import styles from "./DirectionReverse.module.scss";

type Box<T> = { current: T };
interface Particle { lane: number; x: number; y: number; r: number; alpha: number; }

export default function DirectionReverse() {
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
    const rng = makeLcg(7331);

    const css = getComputedStyle(root);
    const PARTICLE_COLOR = css.getPropertyValue("--particle-color").trim() || "#17141a";

    const LANES = 5;
    const LANE_SPEED = 46;
    const RISE_SPEED = 20;
    const COUNT = 40;

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

    function laneSign(lane: number) { return lane % 2 === 0 ? 1 : -1; }

    function spawnAt(p: Particle, first: boolean) {
      const lane = Math.floor(rng() * LANES);
      p.lane = lane;
      p.x = (lane + 0.5) / LANES * W + (rng() - 0.5) * (W / LANES) * 0.6;
      p.y = first ? rng() * H : H + rng() * 20;
      p.r = 1.4 + rng() * 2.2;
      p.alpha = 0.4 + rng() * 0.45;
    }

    function initParticles() {
      particles = [];
      for (let i = 0; i < COUNT; i++) {
        const p: Particle = { lane: 0, x: 0, y: 0, r: 0, alpha: 0 };
        spawnAt(p, true);
        particles.push(p);
      }
    }

    let scrollPos = 0, scrollVel = 0, dirSign = 1, idleMs = 0, lastTop = 0, lastT = 0;
    function sampleScroll(now: number) {
      const top = viewport!.scrollTop;
      const max = Math.max(1, viewport!.scrollHeight - viewport!.clientHeight);
      scrollPos = top / max;
      const dt = lastT ? Math.max(1, now - lastT) : 16;
      const v = (top - lastTop) / dt * 1000;
      scrollVel += (v - scrollVel) * 0.3;
      // dirSign 은 마지막 방향을 유지한다 — 정지해도 결이 사라지지 않는다
      if (Math.abs(scrollVel) > 4) { dirSign = scrollVel > 0 ? 1 : -1; idleMs = 0; } else { idleMs += dt; }
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
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.y -= RISE_SPEED * dtSec;
        p.x += laneSign(p.lane) * dirSign * LANE_SPEED * dtSec;
        const laneMin = p.lane / LANES * W, laneMax = (p.lane + 1) / LANES * W;
        if (p.x < laneMin - 6) p.x = laneMin - 6; else if (p.x > laneMax + 6) p.x = laneMax + 6;
        if (p.y < -8) spawnAt(p, false);
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

    function updateVal() { val!.textContent = dirSign >= 0 ? "↓" : "↑"; }

    function paintStatic() {
      ctx!.clearRect(0, 0, W, H);
      ctx!.fillStyle = PARTICLE_COLOR;
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const laneMid = (p.lane + 0.5) / LANES * W;
        const offset = laneSign(p.lane) * dirSign * scrollPos * (W / LANES) * 0.35;
        ctx!.globalAlpha = p.alpha;
        ctx!.beginPath(); ctx!.arc(laneMid + offset, p.y, p.r, 0, Math.PI * 2); ctx!.fill();
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
          <span>올리고 내리는 방향에 따라 엇갈리는 결이 뒤집힙니다</span>
        </p>
        <div className={styles.viewport} ref={viewportRef} tabIndex={0} role="region" aria-label="파티클 방향 스크롤 영역">
          <canvas className={styles.canvas} ref={canvasRef} aria-hidden="true" />
          <b className={styles.val} ref={valRef} aria-hidden="true">↓</b>
          <div className={styles.track} aria-hidden="true" />
        </div>
      </div>
    </main>
  );
}
