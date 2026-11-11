// BurstFlick — vanilla 판(run/370/demo/06-scroll-particle-burst-flick/index.html) 의 React 포트.
// 계산 겹: 방사 폭발 + 마찰 감쇠(burst-radiate-with-friction-decay) —
// 스크롤 속도가 문턱(FLICK_THRESHOLD)을 아래에서 위로 넘는 순간(플릭)마다 BURST_COUNT 개를
// 중심에서 방사형으로 쏘고, 이후 매 프레임 속도를 지수적으로 줄여(FRICTION) 멈춰 세운다.
import { useEffect, useRef } from "react";
import styles from "./BurstFlick.module.scss";

type Box<T> = { current: T };
interface Particle { x: number; y: number; vx: number; vy: number; r: number; born: number; }

export default function BurstFlick() {
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
    const rng = makeLcg(99194853);

    const css = getComputedStyle(root);
    const PARTICLE_COLOR = css.getPropertyValue("--particle-color").trim() || "#17141a";

    const FLICK_THRESHOLD = 260;
    const BURST_COUNT = 40;
    const BASE_SPEED = 60;
    const SPEED_VAR = 90;
    const FRICTION = 1.5;
    const LIFE_MS = 1300;
    const MAX_PARTICLES = 220;

    let W = 0, H = 0, dpr = 1;
    let particles: Particle[] = [];
    let burstCount = 0;

    function fit() {
      const r = viewport!.getBoundingClientRect();
      dpr = window.devicePixelRatio || 1;
      W = r.width; H = r.height;
      canvas!.width = Math.round(W * dpr);
      canvas!.height = Math.round(H * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function burst(now: number) {
      burstCount++;
      for (let i = 0; i < BURST_COUNT; i++) {
        const ang = rng() * Math.PI * 2;
        const speed = BASE_SPEED + rng() * SPEED_VAR;
        particles.push({
          x: W / 2, y: H / 2,
          vx: Math.cos(ang) * speed,
          vy: Math.sin(ang) * speed,
          r: 1.2 + rng() * 2.2,
          born: now,
        });
      }
      if (particles.length > MAX_PARTICLES) particles.splice(0, particles.length - MAX_PARTICLES);
    }

    let scrollPos = 0, scrollVel = 0, scrollDir = 0, idleMs = 0, lastTop = 0, lastT = 0, prevAbsVel = 0;
    function sampleScroll(now: number) {
      const top = viewport!.scrollTop;
      const max = Math.max(1, viewport!.scrollHeight - viewport!.clientHeight);
      scrollPos = top / max;
      const dt = lastT ? Math.max(1, now - lastT) : 16;
      const v = (top - lastTop) / dt * 1000;
      scrollVel += (v - scrollVel) * 0.4;
      if (Math.abs(scrollVel) > 4) { scrollDir = scrollVel > 0 ? 1 : -1; idleMs = 0; } else { idleMs += dt; }
      lastTop = top; lastT = now;

      const absVel = Math.abs(scrollVel);
      if (prevAbsVel < FLICK_THRESHOLD && absVel >= FLICK_THRESHOLD) burst(now);
      prevAbsVel = absVel;
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

    function step(now: number, dtSec: number) {
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
        ctx!.globalAlpha = Math.max(0, 1 - t) * 0.9;
        ctx!.beginPath(); ctx!.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx!.fill();
      }
      ctx!.globalAlpha = 1;
    }

    function updateVal() { val!.textContent = String(burstCount); }

    function paintStatic() {
      ctx!.clearRect(0, 0, W, H);
      ctx!.fillStyle = PARTICLE_COLOR;
      const n = 14;
      const rad = 10 + scrollPos * 50;
      for (let i = 0; i < n; i++) {
        const ang = (i / n) * Math.PI * 2;
        const x = W / 2 + Math.cos(ang) * rad;
        const y = H / 2 + Math.sin(ang) * rad;
        ctx!.globalAlpha = 0.65;
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
    function flickWave(frac: number) {
      // 급상승·급하강(플릭) 세 번과 그 사이 정지 유지를 반복하는 구동 파형 —
      // 정지 구간마다 직전 폭발이 마찰로 가라앉는 모습을 보여준다
      if (frac < 0.06) return (frac / 0.06) * 0.35;
      if (frac < 0.2) return 0.35;
      if (frac < 0.26) return 0.35 + (frac - 0.2) / 0.06 * 0.65;
      if (frac < 0.5) return 1;
      if (frac < 0.56) return 1 - (frac - 0.5) / 0.06 * 0.6;
      if (frac < 0.8) return 0.4;
      return 0.4 * (1 - (frac - 0.8) / 0.2);
    }
    function driveTick(now: number) {
      if (!driveStart) driveStart = now;
      if (isDemo && !reduce) {
        const frac = ((now - driveStart) % DRIVE_PERIOD_MS) / DRIVE_PERIOD_MS;
        const w = flickWave(frac);
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
          <span>휙 튕기듯 빠르게 끌면 그 순간 입자가 방사형으로 터집니다</span>
        </p>
        <div className={styles.viewport} ref={viewportRef} tabIndex={0} role="region" aria-label="입자 폭발 스크롤 영역">
          <canvas className={styles.canvas} ref={canvasRef} aria-hidden="true" />
          <b className={styles.val} ref={valRef} aria-hidden="true">0</b>
          <div className={styles.track} aria-hidden="true" />
        </div>
      </div>
    </main>
  );
}
