// DepthParallax — vanilla 판(run/370/demo/04-scroll-particle-depth-parallax/index.html) 의 React 포트.
// 계산 겹: 원근 투영(perspective projection) + 화가 알고리즘(painter's algorithm) —
// 입자마다 3D 깊이(z)를 갖고, 스크롤 위치가 카메라 깊이(cameraZ)를 정한다.
// 화면 좌표는 FOV/(FOV+상대깊이) 배율로 투영하고, 매 프레임 깊이가 먼 것부터 가까운 순으로 다시 그린다.
import { useEffect, useRef } from "react";
import styles from "./DepthParallax.module.scss";

type Box<T> = { current: T };
interface Particle { wx: number; wy: number; z: number; r: number; }

export default function DepthParallax() {
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
    const rng = makeLcg(15485863);

    const css = getComputedStyle(root);
    const PARTICLE_COLOR = css.getPropertyValue("--particle-color").trim() || "#17141a";

    const FOV = 130;
    const DOLLY_RANGE = 520;
    const Z_FAR = 560;
    const NEAR = 6;
    const COUNT = 70;

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
      p.wx = (rng() - 0.5) * 260;
      p.wy = (rng() - 0.5) * 160;
      p.z = first ? rng() * Z_FAR : Z_FAR - 4 + rng() * 40;
      p.r = 1.1 + rng() * 1.6;
    }

    function initParticles() {
      particles = [];
      for (let i = 0; i < COUNT; i++) {
        const p: Particle = { wx: 0, wy: 0, z: 0, r: 0 };
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

    function cameraZ() { return scrollPos * DOLLY_RANGE; }

    function project(p: Particle, camZ: number) {
      const depth = p.z - camZ;
      const scale = FOV / (FOV + Math.max(depth, NEAR));
      return { sx: W / 2 + p.wx * scale, sy: H / 2 + p.wy * scale, scale, depth };
    }

    function step(_dtSec: number) {
      const camZ = cameraZ();
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        if (p.z - camZ < NEAR) spawnAt(p, false);
      }
    }

    function paint() {
      const camZ = cameraZ();
      ctx!.clearRect(0, 0, W, H);
      const order = particles.slice().sort((a, b) => (b.z - camZ) - (a.z - camZ));
      for (let i = 0; i < order.length; i++) {
        const p = order[i];
        const pr = project(p, camZ);
        const a = Math.max(0, Math.min(1, pr.scale * 1.1));
        ctx!.globalAlpha = a;
        ctx!.fillStyle = PARTICLE_COLOR;
        ctx!.beginPath(); ctx!.arc(pr.sx, pr.sy, Math.max(0.4, p.r * pr.scale * 5), 0, Math.PI * 2); ctx!.fill();
      }
      ctx!.globalAlpha = 1;
    }

    function updateVal() { val!.textContent = Math.round(scrollPos * 100) + "%"; }

    function paintStatic() {
      const camZ = cameraZ();
      ctx!.clearRect(0, 0, W, H);
      const order = particles.slice().sort((a, b) => (b.z - camZ) - (a.z - camZ));
      for (let i = 0; i < order.length; i++) {
        const p = order[i];
        const pr = project(p, camZ);
        const a = Math.max(0, Math.min(1, pr.scale * 1.1));
        ctx!.globalAlpha = a;
        ctx!.fillStyle = PARTICLE_COLOR;
        ctx!.beginPath(); ctx!.arc(pr.sx, pr.sy, Math.max(0.4, p.r * pr.scale * 5), 0, Math.PI * 2); ctx!.fill();
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
          <span>스크롤 위치가 카메라 깊이를 밀어 넣는 값입니다</span>
        </p>
        <div className={styles.viewport} ref={viewportRef} tabIndex={0} role="region" aria-label="입자 깊이 스크롤 영역">
          <canvas className={styles.canvas} ref={canvasRef} aria-hidden="true" />
          <b className={styles.val} ref={valRef} aria-hidden="true">0%</b>
          <div className={styles.track} aria-hidden="true" />
        </div>
      </div>
    </main>
  );
}
