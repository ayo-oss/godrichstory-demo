import { useEffect, useRef } from "react";
import styles from "./ScratchCardRevealPrizeConfettiBurst.module.scss";

type Confetto = {
  x: number; y: number; vx: number; vy: number; rot: number; angVel: number;
  w: number; h: number; color: string; bounces: number;
};

export default function ScratchCardRevealPrizeConfettiBurst() {
  const rootRef = useRef<HTMLDivElement>(null);
  const zoneRef = useRef<HTMLDivElement>(null);
  const foilRef = useRef<HTMLCanvasElement>(null);
  const confettiRef = useRef<HTMLCanvasElement>(null);
  const revealBtnRef = useRef<HTMLButtonElement>(null);
  const liveRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const zone = zoneRef.current;
    const foil = foilRef.current;
    const confettiCanvas = confettiRef.current;
    const revealBtn = revealBtnRef.current;
    const live = liveRef.current;
    if (!root || !zone || !foil || !confettiCanvas || !revealBtn || !live) return;
    const ctx = foil.getContext("2d");
    const cctx = confettiCanvas.getContext("2d");
    if (!ctx || !cctx) return;

    const FW = foil.width, FH = foil.height;
    const CONFETTI_COUNT = 24;
    const CONFETTI_GRAVITY = 620;
    const CONFETTI_BOUNCE = 0.42;
    const SCRATCH_BRUSH_R = 15;

    function seedRand(seed: number) {
      let s = seed >>> 0;
      return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    }
    const foilRand = seedRand(424071);
    const confettiRand = seedRand(424072);

    function paintFoil() {
      ctx!.globalCompositeOperation = "source-over";
      ctx!.clearRect(0, 0, FW, FH);
      const grad = ctx!.createLinearGradient(0, 0, FW, FH);
      grad.addColorStop(0, "#ff8a5c");
      grad.addColorStop(.5, "#ffb488");
      grad.addColorStop(1, "#e85f2a");
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

    function scratchAt(x: number, y: number) {
      ctx!.globalCompositeOperation = "destination-out";
      ctx!.beginPath();
      ctx!.arc(x, y, SCRATCH_BRUSH_R, 0, Math.PI * 2);
      ctx!.fill();
    }

    function clearedRatio() {
      const data = ctx!.getImageData(0, 0, FW, FH).data;
      let clear = 0;
      const total = data.length / 4;
      for (let i = 3; i < data.length; i += 4) { if (data[i] < 40) clear += 1; }
      return clear / total;
    }

    const COLORS = ["#0a4fe8", "#fff7e6", "#ff4d1f", "#ffd23f"];
    let confetti: Confetto[] = [];
    function burstConfetti() {
      confetti = [];
      for (let i = 0; i < CONFETTI_COUNT; i += 1) {
        confetti.push({
          x: FW * (0.3 + confettiRand() * 0.4),
          y: FH * 0.3,
          vx: (confettiRand() - .5) * 220,
          vy: -180 - confettiRand() * 140,
          rot: confettiRand() * Math.PI * 2,
          angVel: (confettiRand() - .5) * 8,
          w: 5 + confettiRand() * 3,
          h: 3 + confettiRand() * 2,
          color: COLORS[i % COLORS.length],
          bounces: 0
        });
      }
    }
    function stepConfetti(dtMs: number) {
      const dtS = dtMs / 1000;
      for (let i = 0; i < confetti.length; i += 1) {
        const c = confetti[i];
        c.vy += CONFETTI_GRAVITY * dtS;
        c.x += c.vx * dtS;
        c.y += c.vy * dtS;
        c.rot += c.angVel * dtS;
        if (c.y > FH - 6 && c.vy > 0 && c.bounces < 3) {
          c.y = FH - 6;
          c.vy *= -CONFETTI_BOUNCE;
          c.vx *= 0.7;
          c.bounces += 1;
        }
      }
    }
    function drawConfetti() {
      cctx!.clearRect(0, 0, FW, FH);
      for (let i = 0; i < confetti.length; i += 1) {
        const c = confetti[i];
        cctx!.save();
        cctx!.translate(c.x, c.y);
        cctx!.rotate(c.rot);
        cctx!.fillStyle = c.color;
        cctx!.fillRect(-c.w / 2, -c.h / 2, c.w, c.h);
        cctx!.restore();
      }
    }

    let opened = false, burst = false;
    function openCard() {
      if (opened) return;
      opened = true;
      ctx!.globalCompositeOperation = "destination-out";
      ctx!.fillRect(0, 0, FW, FH);
      root!.classList.add("is-open");
      live!.textContent = "축하 쿠폰이 열렸어요";
    }
    function maybeBurst(ratio: number) {
      if (!burst && ratio > .88) { burst = true; burstConfetti(); }
      if (ratio > .96) openCard();
    }

    function pos(e: PointerEvent) {
      const r = foil!.getBoundingClientRect();
      return { x: (e.clientX - r.left) * (FW / r.width), y: (e.clientY - r.top) * (FH / r.height) };
    }

    paintFoil();
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let dragging = false;

    function onDown(e: PointerEvent) {
      if (opened) return;
      root!.classList.remove("is-demo");
      dragging = true;
      const p = pos(e);
      scratchAt(p.x, p.y);
      maybeBurst(clearedRatio());
      zone!.setPointerCapture?.(e.pointerId);
    }
    function onMove(e: PointerEvent) {
      if (!dragging || opened) return;
      const p = pos(e);
      scratchAt(p.x, p.y);
      maybeBurst(clearedRatio());
    }
    function onUp() { dragging = false; }
    zone.addEventListener("pointerdown", onDown);
    zone.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);

    function onReveal() {
      root!.classList.remove("is-demo");
      if (!burst) { burst = true; burstConfetti(); }
      openCard();
    }
    revealBtn.addEventListener("click", onReveal);

    const demoRand = seedRand(424073);
    type DemoPt = { t: number; x: number; y: number };
    const demoPath: DemoPt[] = [];
    for (let i = 0; i < 24; i += 1) {
      demoPath.push({
        t: 220 + i * 78,
        x: (FW * 0.12) + (i % 6) * (FW * 0.15) + (demoRand() - .5) * 6,
        y: (FH * 0.22) + Math.floor(i / 6) * (FH * 0.24) + (demoRand() - .5) * 6
      });
    }
    const DEMO_LOOP_MS = 4200;
    let demoStep = 0;

    function resetDemo() {
      opened = false; burst = false;
      root!.classList.remove("is-open");
      paintFoil();
      confetti = [];
      demoStep = 0;
    }
    function runDemo(tMod: number) {
      while (demoStep < demoPath.length && demoPath[demoStep].t <= tMod) {
        const p = demoPath[demoStep];
        scratchAt(p.x, p.y);
        demoStep += 1;
        maybeBurst(clearedRatio());
      }
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
      if (!reduce) stepConfetti(dt);
      drawConfetti();
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
              <p className={styles.scv__prizeTitle}>축하 쿠폰</p>
              <p className={styles.scv__prizeSub}>거의 다 긁으면 색종이가 터져요</p>
            </div>
            <canvas className={styles.scv__foil} ref={foilRef} width={280} height={150} aria-hidden="true" />
            <canvas className={styles.scv__confetti} ref={confettiRef} width={280} height={150} aria-hidden="true" />
          </div>
          <button type="button" className={styles.scv__reveal} ref={revealBtnRef}>한 번에 보기</button>
          <p className={styles.scv__live} ref={liveRef} aria-live="polite"></p>
        </div>
      </div>
    </main>
  );
}
