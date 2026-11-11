import { useEffect, useRef } from "react";
import styles from "./RainEffectCanvasPointerWindLean.module.scss";

type Streak = { x: number; y: number; speed: number; thick: number };

export default function RainEffectCanvasPointerWindLean() {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    if (!root || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const wrap = canvas.parentElement as HTMLElement;

    const CALC_W = 160, CALC_H = 100;
    const POINTER_WIND_LERP = 0.06;
    const WIND_LEAN_MAX_DEG = 22;
    const RAIN_STREAK_COUNT = 90;
    const SWEEP_PERIOD_MS = 3400;

    function seedRand(seed: number) {
      let s = seed >>> 0;
      return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    }
    const rRand = seedRand(431072);

    const streaks: Streak[] = [];
    for (let i = 0; i < RAIN_STREAK_COUNT; i += 1) {
      streaks.push({ x: rRand() * CALC_W, y: rRand() * CALC_H, speed: 100 + rRand() * 80, thick: 0.6 + rRand() * 1.1 });
    }

    let manual = false;
    let pointerNormX = 0;
    let manualReleaseTimer: number | undefined;

    function windLeanTarget(normX: number) {
      return normX * WIND_LEAN_MAX_DEG;
    }

    function virtualPointerSweep(nowMs: number) {
      return Math.sin((nowMs / SWEEP_PERIOD_MS) * Math.PI * 2);
    }

    let leanDeg = 0;
    function stepSim(dtS: number, nowMs: number) {
      const normX = manual ? pointerNormX : virtualPointerSweep(nowMs);
      const target = windLeanTarget(normX);
      leanDeg += (target - leanDeg) * Math.min(1, POINTER_WIND_LERP * (dtS * 60));
      const leanRad = (leanDeg * Math.PI) / 180;
      for (let i = 0; i < streaks.length; i += 1) {
        const s = streaks[i];
        s.y += s.speed * dtS;
        s.x += Math.sin(leanRad) * s.speed * 0.7 * dtS;
        if (s.y > CALC_H + 4) { s.y = -4 - rRand() * 6; s.x = rRand() * CALC_W; }
        if (s.x < -6) s.x = CALC_W + 6;
        if (s.x > CALC_W + 6) s.x = -6;
      }
    }

    let cw = 480, ch = 300;
    function draw() {
      const sx = cw / CALC_W, sy = ch / CALC_H;
      ctx!.clearRect(0, 0, cw, ch);
      ctx!.fillStyle = "rgba(38,20,10,0.06)";
      ctx!.fillRect(0, 0, cw, ch);
      const leanRad = (leanDeg * Math.PI) / 180;
      const ddx = Math.sin(leanRad) * 6, ddy = Math.cos(leanRad) * 6;
      ctx!.strokeStyle = "rgba(255,236,214,0.55)";
      for (let i = 0; i < streaks.length; i += 1) {
        const s = streaks[i];
        const x = s.x * sx, y = s.y * sy;
        ctx!.lineWidth = Math.max(0.6, s.thick * ((sx + sy) / 2));
        ctx!.beginPath();
        ctx!.moveTo(x, y);
        ctx!.lineTo(x - ddx * s.thick * (sx / 6), y - ddy * s.thick * (sy / 6));
        ctx!.stroke();
      }
    }

    function fit() {
      const r = wrap.getBoundingClientRect();
      cw = Math.max(1, Math.round(r.width));
      ch = Math.max(1, Math.round(r.height));
      canvas!.width = cw; canvas!.height = ch;
      draw();
    }

    function setManualFromClientX(clientX: number) {
      const r = canvas!.getBoundingClientRect();
      const normX = ((clientX - r.left) / Math.max(1, r.width)) * 2 - 1;
      pointerNormX = Math.max(-1, Math.min(1, normX));
      manual = true;
      root!.classList.remove("is-demo");
      if (manualReleaseTimer) window.clearTimeout(manualReleaseTimer);
    }

    function scheduleRelease() {
      if (manualReleaseTimer) window.clearTimeout(manualReleaseTimer);
      manualReleaseTimer = window.setTimeout(function () { manual = false; }, 2600);
    }

    function onPointerMove(e: PointerEvent) { setManualFromClientX(e.clientX); scheduleRelease(); }
    function onPointerDown(e: PointerEvent) { setManualFromClientX(e.clientX); scheduleRelease(); }
    function onPointerLeave() { scheduleRelease(); }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        e.preventDefault();
        manual = true;
        root!.classList.remove("is-demo");
        const step = e.key === "ArrowLeft" ? -0.18 : 0.18;
        pointerNormX = Math.max(-1, Math.min(1, pointerNormX + step));
        scheduleRelease();
      }
    }

    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointerleave", onPointerLeave);
    root.addEventListener("keydown", onKeyDown);

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let elapsed = 0;
    if (reduce) root.classList.remove("is-demo");
    const warmSteps = reduce ? 30 : 40;
    for (let w = 0; w < warmSteps; w += 1) { elapsed += 20; stepSim(0.02, elapsed); }

    let lastTs: number | null = null;
    let raf = 0;
    function tick(ts: number) {
      if (lastTs === null) lastTs = ts;
      const dt = Math.min(ts - lastTs, 48);
      lastTs = ts;
      if (!reduce) {
        elapsed += dt;
        stepSim(dt / 1000, elapsed);
        draw();
      }
      raf = requestAnimationFrame(tick);
    }
    fit();
    window.addEventListener("resize", fit);
    draw();
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      if (manualReleaseTimer) window.clearTimeout(manualReleaseTimer);
      window.removeEventListener("resize", fit);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointerleave", onPointerLeave);
      root.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div
        className={`${styles.rn} is-demo`}
        ref={rootRef}
        tabIndex={0}
        role="img"
        aria-label="포인터를 좌우로 움직이거나 화살표 키를 누르면 비가 그쪽으로 눕는 장면"
      >
        <canvas className={styles.rn__canvas} ref={canvasRef} width={480} height={300} />
        <p className={styles.rn__caption}>포인터가 화면 중심에서 벗어난 만큼 바람 벡터의 방향을 다시 계산해, 포인터를 움직이는 동안 빗줄기 전체가 그 방향으로 같이 기울어 떨어진다</p>
        <p className={styles.rn__hint}>포인터를 움직이거나 ← → 키</p>
      </div>
    </main>
  );
}
