import { useEffect, useRef } from "react";
import styles from "./ScratchCardRevealHeroMultiCardScene.module.scss";

type Particle = {
  kind: "flake" | "confetti"; x: number; y: number; vx: number; vy: number;
  rot: number; angVel: number; born: number; size: number; color: string; bounces: number;
};

const PRIZE_TEXT = ["10% 할인 쿠폰이 열렸어요", "무료배송 쿠폰이 열렸어요", "적립금 2,000원 쿠폰이 열렸어요"];
const COLORS = ["#0a4fe8", "#fff7e6", "#ff4d1f", "#ffd23f"];

export default function ScratchCardRevealHeroMultiCardScene() {
  const rootRef = useRef<HTMLDivElement>(null);
  const zoneRefs = useRef<(HTMLDivElement | null)[]>([null, null, null]);
  const foilRefs = useRef<(HTMLCanvasElement | null)[]>([null, null, null]);
  const fxRefs = useRef<(HTMLCanvasElement | null)[]>([null, null, null]);
  const revealBtnRef = useRef<HTMLButtonElement>(null);
  const liveRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const revealBtn = revealBtnRef.current;
    const live = liveRef.current;
    if (!root || !revealBtn || !live) return;
    if (!zoneRefs.current || !foilRefs.current || !fxRefs.current) return;
    if (zoneRefs.current.some((z) => !z) || foilRefs.current.some((f) => !f) || fxRefs.current.some((f) => !f)) return;
    const zones = zoneRefs.current as HTMLDivElement[];
    const foils = foilRefs.current as HTMLCanvasElement[];
    const fxCanvases = fxRefs.current as HTMLCanvasElement[];

    const HERO_REVEAL_THRESHOLD_PCT = 55;
    const HERO_FLAKE_GRAVITY_PX_S2 = 500;
    const HERO_CONFETTI_COUNT = 16;
    const SCRATCH_BRUSH_R = 12;
    const FLAKE_LIFE_MS = 800;

    function seedRand(seed: number) {
      let s = seed >>> 0;
      return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    }

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function makeCard(idx: number) {
      const foil = foils[idx]!;
      const fxCanvas = fxCanvases[idx]!;
      const zone = zones[idx]!;
      const ctx = foil.getContext("2d")!;
      const fctx = fxCanvas.getContext("2d")!;
      const FW = foil.width, FH = foil.height;
      const foilRand = seedRand(424091 + idx * 7);
      const fxRand = seedRand(424092 + idx * 7);
      let particles: Particle[] = [];
      let opened = false, burst = false;

      function paintFoil() {
        ctx.globalCompositeOperation = "source-over";
        ctx.clearRect(0, 0, FW, FH);
        const grad = ctx.createLinearGradient(0, 0, FW, FH);
        const stops = idx === 0 ? ["#5b6cff", "#8f9bff"] : idx === 1 ? ["#e8c344", "#f6dd7c"] : ["#ff8a5c", "#ffb488"];
        grad.addColorStop(0, stops[0]);
        grad.addColorStop(1, stops[1]);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, FW, FH);
        ctx.strokeStyle = "rgba(23,20,26,.16)";
        ctx.lineWidth = 1;
        for (let i = 0; i < 12; i += 1) {
          const x = foilRand() * FW, y = foilRand() * FH;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + (foilRand() * 16 - 8), y + (foilRand() * 6 - 3));
          ctx.stroke();
        }
      }

      function spawnFlake(x: number, y: number) {
        if (reduce) return;
        particles.push({
          kind: "flake", x, y,
          vx: (fxRand() - .5) * 60, vy: -40 - fxRand() * 30,
          rot: fxRand() * Math.PI * 2, angVel: (fxRand() - .5) * 8,
          born: 0, size: 3 + fxRand() * 2, color: "rgba(255,255,255,.85)", bounces: 99
        });
      }
      function burstConfetti() {
        for (let i = 0; i < HERO_CONFETTI_COUNT; i += 1) {
          particles.push({
            kind: "confetti", x: FW / 2, y: FH * 0.3,
            vx: (fxRand() - .5) * 160, vy: -140 - fxRand() * 100,
            rot: fxRand() * Math.PI * 2, angVel: (fxRand() - .5) * 7,
            born: 0, size: 4 + fxRand() * 2, color: COLORS[i % COLORS.length], bounces: 0
          });
        }
      }
      function stepParticles(dtMs: number) {
        const dtS = dtMs / 1000;
        const alive: Particle[] = [];
        for (let i = 0; i < particles.length; i += 1) {
          const p = particles[i];
          p.vy += HERO_FLAKE_GRAVITY_PX_S2 * dtS;
          p.x += p.vx * dtS;
          p.y += p.vy * dtS;
          p.rot += p.angVel * dtS;
          p.born += dtMs;
          if (p.kind === "confetti" && p.y > FH - 4 && p.vy > 0 && p.bounces < 2) {
            p.y = FH - 4; p.vy *= -0.4; p.bounces += 1;
          }
          const keepFlake = p.kind === "flake" && p.born < FLAKE_LIFE_MS && p.y < FH + 8;
          const keepConfetti = p.kind === "confetti" && p.born < 1300;
          if (keepFlake || keepConfetti) alive.push(p);
        }
        particles = alive;
      }
      function drawParticles() {
        fctx.clearRect(0, 0, FW, FH);
        for (let i = 0; i < particles.length; i += 1) {
          const p = particles[i];
          const fade = p.kind === "flake" ? Math.max(0, 1 - p.born / FLAKE_LIFE_MS) : 1;
          fctx.save();
          fctx.translate(p.x, p.y);
          fctx.rotate(p.rot);
          fctx.globalAlpha = fade;
          fctx.fillStyle = p.color;
          fctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
          fctx.restore();
        }
      }

      function clearedRatio() {
        const data = ctx.getImageData(0, 0, FW, FH).data;
        let clear = 0;
        const total = data.length / 4;
        for (let i = 3; i < data.length; i += 4) { if (data[i] < 40) clear += 1; }
        return clear / total;
      }

      function scratchAt(x: number, y: number) {
        ctx.globalCompositeOperation = "destination-out";
        ctx.beginPath();
        ctx.arc(x, y, SCRATCH_BRUSH_R, 0, Math.PI * 2);
        ctx.fill();
        spawnFlake(x, y);
      }

      function openCard() {
        if (opened) return;
        opened = true;
        ctx.globalCompositeOperation = "destination-out";
        ctx.fillRect(0, 0, FW, FH);
        zone.classList.add("is-open");
        if (!burst) { burst = true; burstConfetti(); }
        live!.textContent = PRIZE_TEXT[idx];
      }
      function checkThreshold() {
        const ratio = clearedRatio();
        if (ratio * 100 >= HERO_REVEAL_THRESHOLD_PCT) openCard();
      }
      function pos(e: PointerEvent) {
        const r = foil.getBoundingClientRect();
        return { x: (e.clientX - r.left) * (FW / r.width), y: (e.clientY - r.top) * (FH / r.height) };
      }

      paintFoil();
      let dragging = false;
      function onDown(e: PointerEvent) {
        if (opened) return;
        root!.classList.remove("is-demo");
        dragging = true;
        const p = pos(e);
        scratchAt(p.x, p.y);
        checkThreshold();
        zone.setPointerCapture?.(e.pointerId);
      }
      function onMove(e: PointerEvent) {
        if (!dragging || opened) return;
        const p = pos(e);
        scratchAt(p.x, p.y);
        checkThreshold();
      }
      function onUp() { dragging = false; }
      zone.addEventListener("pointerdown", onDown);
      zone.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);

      const demoRand = seedRand(424093 + idx * 7);
      type DemoPt = { t: number; x: number; y: number };
      const demoPath: DemoPt[] = [];
      const pointCount = 14;
      for (let i = 0; i < pointCount; i += 1) {
        demoPath.push({
          t: 220 + idx * 260 + i * 92,
          x: (FW * 0.14) + (i % 4) * (FW * 0.22) + (demoRand() - .5) * 5,
          y: (FH * 0.2) + Math.floor(i / 4) * (FH * 0.28) + (demoRand() - .5) * 5
        });
      }
      let demoStep = 0;

      return {
        reset() {
          opened = false; burst = false;
          zone.classList.remove("is-open");
          paintFoil();
          particles = [];
          demoStep = 0;
        },
        runDemo(tMod: number) {
          while (demoStep < demoPath.length && demoPath[demoStep].t <= tMod) {
            const p = demoPath[demoStep];
            scratchAt(p.x, p.y);
            demoStep += 1;
            checkThreshold();
          }
        },
        step(dt: number) { if (!reduce) stepParticles(dt); drawParticles(); },
        revealAll() { scratchAt(FW / 2, FH / 2); openCard(); },
        dispose() {
          zone.removeEventListener("pointerdown", onDown);
          zone.removeEventListener("pointermove", onMove);
          window.removeEventListener("pointerup", onUp);
        }
      };
    }

    const cards = [makeCard(0), makeCard(1), makeCard(2)];

    function onReveal() {
      root!.classList.remove("is-demo");
      for (let i = 0; i < cards.length; i += 1) cards[i].revealAll();
    }
    revealBtn.addEventListener("click", onReveal);

    const DEMO_LOOP_MS = 4600;
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
        if (tMod < dt) { for (let i = 0; i < cards.length; i += 1) cards[i].reset(); }
        for (let j = 0; j < cards.length; j += 1) cards[j].runDemo(tMod);
      }
      for (let k = 0; k < cards.length; k += 1) cards[k].step(dt);
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      revealBtn.removeEventListener("click", onReveal);
      for (let i = 0; i < cards.length; i += 1) cards[i].dispose();
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={`${styles.scv} is-demo`} ref={rootRef}>
        <p className={styles.scv__label}>스크래치 카드 3장 세트</p>
        <div className={styles.scv__grid}>
          <div className={styles.scv__card}>
            <div className={styles.scv__zone} ref={(el: HTMLDivElement | null) => { zoneRefs.current![0] = el; }}>
              <div className={styles.scv__prize}><p className={styles.scv__prizeTitle}>10%</p><p className={styles.scv__prizeSub}>할인 쿠폰</p></div>
              <canvas className={styles.scv__foil} ref={(el: HTMLCanvasElement | null) => { foilRefs.current![0] = el; }} width={150} height={120} aria-hidden="true" />
              <canvas className={styles.scv__fx} ref={(el: HTMLCanvasElement | null) => { fxRefs.current![0] = el; }} width={150} height={120} aria-hidden="true" />
            </div>
          </div>
          <div className={styles.scv__card}>
            <div className={styles.scv__zone} ref={(el: HTMLDivElement | null) => { zoneRefs.current![1] = el; }}>
              <div className={styles.scv__prize}><p className={styles.scv__prizeTitle}>무료배송</p><p className={styles.scv__prizeSub}>쿠폰</p></div>
              <canvas className={styles.scv__foil} ref={(el: HTMLCanvasElement | null) => { foilRefs.current![1] = el; }} width={150} height={120} aria-hidden="true" />
              <canvas className={styles.scv__fx} ref={(el: HTMLCanvasElement | null) => { fxRefs.current![1] = el; }} width={150} height={120} aria-hidden="true" />
            </div>
          </div>
          <div className={styles.scv__card}>
            <div className={styles.scv__zone} ref={(el: HTMLDivElement | null) => { zoneRefs.current![2] = el; }}>
              <div className={styles.scv__prize}><p className={styles.scv__prizeTitle}>적립금</p><p className={styles.scv__prizeSub}>2,000원</p></div>
              <canvas className={styles.scv__foil} ref={(el: HTMLCanvasElement | null) => { foilRefs.current![2] = el; }} width={150} height={120} aria-hidden="true" />
              <canvas className={styles.scv__fx} ref={(el: HTMLCanvasElement | null) => { fxRefs.current![2] = el; }} width={150} height={120} aria-hidden="true" />
            </div>
          </div>
        </div>
        <button type="button" className={styles.scv__reveal} ref={revealBtnRef}>전부 한 번에 보기</button>
        <p className={styles.scv__live} ref={liveRef} aria-live="polite"></p>
      </div>
    </main>
  );
}
