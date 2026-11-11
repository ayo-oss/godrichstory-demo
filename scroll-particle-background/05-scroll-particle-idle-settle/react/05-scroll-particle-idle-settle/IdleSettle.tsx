// IdleSettle — vanilla 판(run/370/demo/05-scroll-particle-idle-settle/index.html) 의 React 포트.
// 계산 겹: 감쇠 스프링(gravity-damping spring) — 격자의 각 점은 스크롤 속도를 목표값(target)으로 쫓는
// 개별 스프링(STIFFNESS·SETTLE_DAMP)을 가진다. 스크롤이 멈추면 목표가 0 으로 떨어지며 서서히 가라앉는다.
import { useEffect, useRef } from "react";
import styles from "./IdleSettle.module.scss";

type Box<T> = { current: T };
interface Dot { rx: number; ry: number; dispX: number; velX: number; stiff: number; r: number; }

export default function IdleSettle() {
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
    const rng = makeLcg(2718281);

    const css = getComputedStyle(root);
    const PARTICLE_COLOR = css.getPropertyValue("--particle-color").trim() || "#4cd4a6";

    const COLS = 7, ROWS = 5;
    const STIFFNESS = 70;
    const SETTLE_DAMP = 22;
    const DRIVE_GAIN = 0.09;

    let W = 0, H = 0, dpr = 1;
    let dots: Dot[] = [];

    function fit() {
      const r = viewport!.getBoundingClientRect();
      dpr = window.devicePixelRatio || 1;
      W = r.width; H = r.height;
      canvas!.width = Math.round(W * dpr);
      canvas!.height = Math.round(H * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      layoutDots();
    }

    function layoutDots() {
      dots = [];
      for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
          dots.push({
            rx: (col + 0.5) / COLS * W,
            ry: (row + 0.5) / ROWS * H,
            dispX: 0, velX: 0,
            stiff: STIFFNESS * (0.75 + rng() * 0.5),
            r: 2.4 + rng() * 1.4,
          });
        }
      }
    }

    let scrollPos = 0, scrollVel = 0, scrollDir = 0, idleMs = 0, lastTop = 0, lastT = 0;
    function sampleScroll(now: number) {
      const top = viewport!.scrollTop;
      const max = Math.max(1, viewport!.scrollHeight - viewport!.clientHeight);
      scrollPos = top / max;
      const dt = lastT ? Math.max(1, now - lastT) : 16;
      const v = (top - lastTop) / dt * 1000;
      scrollVel += (v - scrollVel) * 0.3;
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

    function step(dtSec: number) {
      const target = scrollVel * DRIVE_GAIN;
      for (let i = 0; i < dots.length; i++) {
        const d = dots[i];
        const acc = (target - d.dispX) * d.stiff - d.velX * SETTLE_DAMP;
        d.velX += acc * dtSec;
        d.dispX += d.velX * dtSec;
      }
    }

    function paint() {
      ctx!.clearRect(0, 0, W, H);
      ctx!.fillStyle = PARTICLE_COLOR;
      for (let i = 0; i < dots.length; i++) {
        const d = dots[i];
        const settle = Math.max(0, 1 - Math.min(1, idleMs / 900));
        ctx!.globalAlpha = 0.5 + Math.min(0.4, Math.abs(d.velX) * 0.01) + settle * 0.05;
        ctx!.beginPath(); ctx!.arc(d.rx + d.dispX, d.ry, d.r, 0, Math.PI * 2); ctx!.fill();
      }
      ctx!.globalAlpha = 1;
    }

    function updateVal() { val!.textContent = Math.min(999, Math.round(idleMs)) + "ms"; }

    function paintStatic() {
      ctx!.clearRect(0, 0, W, H);
      ctx!.fillStyle = PARTICLE_COLOR;
      const settleDisp = scrollDir === 0 ? 0 : scrollPos * 6 * scrollDir;
      for (let i = 0; i < dots.length; i++) {
        const d = dots[i];
        ctx!.globalAlpha = 0.6;
        ctx!.beginPath(); ctx!.arc(d.rx + settleDisp, d.ry, d.r, 0, Math.PI * 2); ctx!.fill();
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
    function triangleHold(frac: number) {
      // 절반은 세게 훑고 절반은 멈춰 있어야 "정지 가라앉음" 이 캡처 구간 안에서 보인다
      if (frac < 0.32) return frac / 0.32;
      if (frac < 0.5) return 1;
      if (frac < 0.82) return 1 - (frac - 0.5) / 0.32;
      return 0;
    }
    function driveTick(now: number) {
      if (!driveStart) driveStart = now;
      if (isDemo && !reduce) {
        const frac = ((now - driveStart) % DRIVE_PERIOD_MS) / DRIVE_PERIOD_MS;
        const w = triangleHold(frac);
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
          <span>손을 떼면 흔들리던 격자가 서서히 가라앉습니다</span>
        </p>
        <div className={styles.viewport} ref={viewportRef} tabIndex={0} role="region" aria-label="입자 정지 스크롤 영역">
          <canvas className={styles.canvas} ref={canvasRef} aria-hidden="true" />
          <b className={styles.val} ref={valRef} aria-hidden="true">0ms</b>
          <div className={styles.track} aria-hidden="true" />
        </div>
      </div>
    </main>
  );
}
