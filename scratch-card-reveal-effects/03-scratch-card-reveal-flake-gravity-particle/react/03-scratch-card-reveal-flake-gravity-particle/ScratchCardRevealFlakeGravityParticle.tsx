import { useEffect, useRef } from "react";
import styles from "./ScratchCardRevealFlakeGravityParticle.module.scss";

type Flake = { x: number; y: number; vx: number; vy: number; rot: number; angVel: number; born: number; size: number };

export default function ScratchCardRevealFlakeGravityParticle() {
  const rootRef = useRef<HTMLDivElement>(null);
  const zoneRef = useRef<HTMLDivElement>(null);
  const foilRef = useRef<HTMLCanvasElement>(null);
  const flakesRef = useRef<HTMLCanvasElement>(null);
  const revealBtnRef = useRef<HTMLButtonElement>(null);
  const liveRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const zone = zoneRef.current;
    const foil = foilRef.current;
    const flakesCanvas = flakesRef.current;
    const revealBtn = revealBtnRef.current;
    const live = liveRef.current;
    if (!root || !zone || !foil || !flakesCanvas || !revealBtn || !live) return;
    const ctx = foil.getContext("2d");
    const fctx = flakesCanvas.getContext("2d");
    if (!ctx || !fctx) return;

    const FW = foil.width, FH = foil.height;
    const SCRATCH_BRUSH_R = 15;
    const FLAKE_GRAVITY_PX_S2 = 400;
    const FLAKE_LIFE_MS = 900;

    function seedRand(seed: number) {
      let s = seed >>> 0;
      return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    }
    const foilRand = seedRand(424031);
    const flakeRand = seedRand(424032);

    function paintFoil() {
      ctx!.globalCompositeOperation = "source-over";
      ctx!.clearRect(0, 0, FW, FH);
      const grad = ctx!.createLinearGradient(0, 0, FW, FH);
      grad.addColorStop(0, "#d8863f");
      grad.addColorStop(.5, "#f3c98a");
      grad.addColorStop(1, "#c9752c");
      ctx!.fillStyle = grad;
      ctx!.fillRect(0, 0, FW, FH);
      ctx!.strokeStyle = "rgba(23,20,26,.16)";
      ctx!.lineWidth = 1;
      for (let i = 0; i < 20; i += 1) {
        const x = foilRand() * FW, y = foilRand() * FH;
        ctx!.beginPath();
        ctx!.moveTo(x, y);
        ctx!.lineTo(x + (foilRand() * 22 - 11), y + (foilRand() * 8 - 4));
        ctx!.stroke();
      }
    }

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let flakes: Flake[] = [];
    function spawnFlake(x: number, y: number, vx: number, vy: number) {
      if (reduce) return;
      flakes.push({
        x, y, vx, vy,
        rot: flakeRand() * Math.PI * 2,
        angVel: (flakeRand() - .5) * 10,
        born: 0, size: 3 + flakeRand() * 3
      });
    }
    function stepFlakes(dtMs: number) {
      const dtS = dtMs / 1000;
      const alive: Flake[] = [];
      for (let i = 0; i < flakes.length; i += 1) {
        const f = flakes[i];
        f.vy += FLAKE_GRAVITY_PX_S2 * dtS;
        f.x += f.vx * dtS;
        f.y += f.vy * dtS;
        f.rot += f.angVel * dtS;
        f.born += dtMs;
        if (f.born < FLAKE_LIFE_MS && f.x > -8 && f.x < FW + 8 && f.y < FH + 8) alive.push(f);
      }
      flakes = alive;
    }
    function drawFlakes() {
      fctx!.clearRect(0, 0, FW, FH);
      for (let i = 0; i < flakes.length; i += 1) {
        const f = flakes[i];
        const fade = Math.max(0, 1 - f.born / FLAKE_LIFE_MS);
        fctx!.save();
        fctx!.translate(f.x, f.y);
        fctx!.rotate(f.rot);
        fctx!.fillStyle = "rgba(243,201,138," + fade + ")";
        fctx!.fillRect(-f.size / 2, -f.size / 2, f.size, f.size);
        fctx!.restore();
      }
    }

    function scratchAt(x: number, y: number, vx: number, vy: number) {
      ctx!.globalCompositeOperation = "destination-out";
      ctx!.beginPath();
      ctx!.arc(x, y, SCRATCH_BRUSH_R, 0, Math.PI * 2);
      ctx!.fill();
      spawnFlake(x, y, vx, vy - 30);
      spawnFlake(x + (flakeRand() - .5) * 6, y + (flakeRand() - .5) * 6, -vx * .6, vy - 60);
    }

    function clearedRatio() {
      const data = ctx!.getImageData(0, 0, FW, FH).data;
      let clear = 0;
      const total = data.length / 4;
      for (let i = 3; i < data.length; i += 4) { if (data[i] < 40) clear += 1; }
      return clear / total;
    }

    let opened = false;
    function openCard() {
      if (opened) return;
      opened = true;
      ctx!.globalCompositeOperation = "destination-out";
      ctx!.fillRect(0, 0, FW, FH);
      root!.classList.add("is-open");
      live!.textContent = "생일 쿠폰이 열렸어요";
    }

    function pos(e: PointerEvent) {
      const r = foil!.getBoundingClientRect();
      return { x: (e.clientX - r.left) * (FW / r.width), y: (e.clientY - r.top) * (FH / r.height) };
    }

    paintFoil();
    let dragging = false;
    let lastPos: { x: number; y: number } | null = null;

    function onDown(e: PointerEvent) {
      if (opened) return;
      root!.classList.remove("is-demo");
      dragging = true;
      const p = pos(e);
      scratchAt(p.x, p.y, 0, 0);
      lastPos = p;
      zone!.setPointerCapture?.(e.pointerId);
    }
    function onMove(e: PointerEvent) {
      if (!dragging || opened) return;
      const p = pos(e);
      const vx = lastPos ? (p.x - lastPos.x) * 6 : 0;
      const vy = lastPos ? (p.y - lastPos.y) * 6 : 0;
      scratchAt(p.x, p.y, vx, vy);
      lastPos = p;
      if (clearedRatio() > .85) openCard();
    }
    function onUp() { dragging = false; lastPos = null; }
    zone.addEventListener("pointerdown", onDown);
    zone.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);

    function onReveal() { root!.classList.remove("is-demo"); openCard(); }
    revealBtn.addEventListener("click", onReveal);

    const demoRand = seedRand(424033);
    type DemoPt = { t: number; x: number; y: number; vx: number; vy: number };
    const demoPath: DemoPt[] = [];
    for (let i = 0; i < 22; i += 1) {
      demoPath.push({
        t: 230 + i * 82,
        x: (FW * 0.14) + (i % 6) * (FW * 0.15) + (demoRand() - .5) * 6,
        y: (FH * 0.24) + Math.floor(i / 6) * (FH * 0.26) + (demoRand() - .5) * 6,
        vx: (demoRand() - .5) * 90,
        vy: -40 - demoRand() * 40
      });
    }
    const DEMO_LOOP_MS = 3800;
    let demoStep = 0;

    function resetDemo() {
      opened = false;
      root!.classList.remove("is-open");
      paintFoil();
      flakes = [];
      demoStep = 0;
    }
    function runDemo(tMod: number) {
      while (demoStep < demoPath.length && demoPath[demoStep].t <= tMod) {
        const p = demoPath[demoStep];
        scratchAt(p.x, p.y, p.vx, p.vy);
        demoStep += 1;
      }
      if (clearedRatio() > .85) openCard();
    }

    if (reduce) root.classList.remove("is-demo");
    let elapsed = 0;
    let lastTs: number | null = null;
    let raf = 0;
    function tick(ts: number) {
      if (lastTs === null) lastTs = ts;
      const dt = Math.min(ts - lastTs, 48);
      lastTs = ts;
      if (!reduce && root!.classList.contains("is-demo")) {
        elapsed += dt;
        const tMod = elapsed % DEMO_LOOP_MS;
        if (tMod < dt) resetDemo();
        runDemo(tMod);
      }
      if (!reduce) stepFlakes(dt);
      drawFlakes();
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      zone.removeEventListener("pointerdown", onDown);
      zone.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      revealBtn.removeEventListener("click", onReveal);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={`${styles.scv} is-demo`} ref={rootRef}>
        <div className={styles.scv__card}>
          <p className={styles.scv__label}>스크래치 카드</p>
          <div className={styles.scv__zone} ref={zoneRef}>
            <div className={styles.scv__prize}>
              <p className={styles.scv__prizeTitle}>생일 쿠폰</p>
              <p className={styles.scv__prizeSub}>긁을 때마다 조각이 튀어 나가요</p>
            </div>
            <canvas className={styles.scv__foil} ref={foilRef} width={280} height={150} aria-hidden="true" />
            <canvas className={styles.scv__flakes} ref={flakesRef} width={280} height={150} aria-hidden="true" />
          </div>
          <button type="button" className={styles.scv__reveal} ref={revealBtnRef}>한 번에 보기</button>
          <p className={styles.scv__live} ref={liveRef} aria-live="polite"></p>
        </div>
      </div>
    </main>
  );
}
