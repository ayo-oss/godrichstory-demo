import { useEffect, useRef } from "react";
import styles from "./ScratchCardRevealFoilNoiseTexture.module.scss";

export default function ScratchCardRevealFoilNoiseTexture() {
  const rootRef = useRef<HTMLDivElement>(null);
  const zoneRef = useRef<HTMLDivElement>(null);
  const foilRef = useRef<HTMLCanvasElement>(null);
  const revealBtnRef = useRef<HTMLButtonElement>(null);
  const redoBtnRef = useRef<HTMLButtonElement>(null);
  const liveRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const zone = zoneRef.current;
    const foil = foilRef.current;
    const revealBtn = revealBtnRef.current;
    const redoBtn = redoBtnRef.current;
    const live = liveRef.current;
    if (!root || !zone || !foil || !revealBtn || !redoBtn || !live) return;
    const ctx = foil.getContext("2d");
    if (!ctx) return;

    const FOIL_NOISE_DIM = 22;
    const SCRATCH_BRUSH_R = 15;
    const FW = foil.width, FH = foil.height;

    function seedRand(seed: number) {
      let s = seed >>> 0;
      return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    }
    function smoothstep(t: number) { return t * t * (3 - 2 * t); }

    function buildNoiseTable(seed: number) {
      const rand = seedRand(seed);
      const table = new Float32Array(FOIL_NOISE_DIM * FOIL_NOISE_DIM);
      for (let i = 0; i < table.length; i += 1) table[i] = rand();
      return table;
    }
    function noiseAt(table: Float32Array, xi: number, yi: number) {
      const wx = ((xi % FOIL_NOISE_DIM) + FOIL_NOISE_DIM) % FOIL_NOISE_DIM;
      const wy = ((yi % FOIL_NOISE_DIM) + FOIL_NOISE_DIM) % FOIL_NOISE_DIM;
      return table[wy * FOIL_NOISE_DIM + wx];
    }
    function valueNoise2D(table: Float32Array, x: number, y: number) {
      const x0 = Math.floor(x), y0 = Math.floor(y);
      const tx = smoothstep(x - x0), ty = smoothstep(y - y0);
      const v00 = noiseAt(table, x0, y0), v10 = noiseAt(table, x0 + 1, y0);
      const v01 = noiseAt(table, x0, y0 + 1), v11 = noiseAt(table, x0 + 1, y0 + 1);
      const a = v00 + (v10 - v00) * tx, b = v01 + (v11 - v01) * tx;
      return a + (b - a) * ty;
    }

    function buildNoiseFoil(seed: number) {
      const table = buildNoiseTable(seed);
      const crackRand = seedRand(seed + 1);
      const img = ctx!.createImageData(FW, FH);
      const d = img.data;
      const scaleX = FOIL_NOISE_DIM / FW, scaleY = FOIL_NOISE_DIM / FH;
      for (let y = 0; y < FH; y += 1) {
        for (let x = 0; x < FW; x += 1) {
          const n = valueNoise2D(table, x * scaleX * 2.4, y * scaleY * 2.4);
          const lightness = 176 + n * 62;
          const idx = (y * FW + x) * 4;
          d[idx] = lightness * 0.98;
          d[idx + 1] = lightness;
          d[idx + 2] = lightness * 1.03;
          d[idx + 3] = 255;
        }
      }
      ctx!.putImageData(img, 0, 0);
      ctx!.strokeStyle = "rgba(23,20,26,.14)";
      ctx!.lineWidth = 1;
      for (let i = 0; i < 16; i += 1) {
        const sx = crackRand() * FW, sy = crackRand() * FH;
        ctx!.beginPath();
        ctx!.moveTo(sx, sy);
        ctx!.lineTo(sx + (crackRand() * 26 - 13), sy + (crackRand() * 10 - 5));
        ctx!.stroke();
      }
      return img;
    }

    let seed = 424021;
    let baseCache: ImageData | null = null, baseSeed: number | null = null;
    function getBase() {
      if (baseSeed !== seed) { baseCache = buildNoiseFoil(seed); baseSeed = seed; }
      return baseCache!;
    }

    function renderIdle(sheenT: number) {
      ctx!.putImageData(getBase(), 0, 0);
      ctx!.save();
      ctx!.globalCompositeOperation = "lighter";
      const sheenX = FW * sheenT;
      const g = ctx!.createLinearGradient(sheenX - 34, 0, sheenX + 34, FH);
      g.addColorStop(0, "rgba(255,255,255,0)");
      g.addColorStop(.5, "rgba(255,255,255,.55)");
      g.addColorStop(1, "rgba(255,255,255,0)");
      ctx!.fillStyle = g;
      ctx!.fillRect(0, 0, FW, FH);
      ctx!.restore();
    }

    function scratchAt(x: number, y: number) {
      ctx!.globalCompositeOperation = "destination-out";
      ctx!.beginPath();
      ctx!.arc(x, y, SCRATCH_BRUSH_R, 0, Math.PI * 2);
      ctx!.fill();
    }

    let opened = false, scratchStarted = false;

    function openCard() {
      if (opened) return;
      opened = true;
      scratchStarted = true;
      ctx!.globalCompositeOperation = "destination-out";
      ctx!.fillRect(0, 0, FW, FH);
      root!.classList.add("is-open");
      live!.textContent = "선물 쿠폰이 열렸어요";
    }

    function newCard() {
      seed += 1;
      opened = false;
      scratchStarted = false;
      root!.classList.remove("is-open");
      renderIdle(0);
      live!.textContent = "새 은박 무늬를 계산했어요";
    }

    function pos(e: PointerEvent) {
      const r = foil!.getBoundingClientRect();
      return { x: (e.clientX - r.left) * (FW / r.width), y: (e.clientY - r.top) * (FH / r.height) };
    }

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let dragging = false;

    function onDown(e: PointerEvent) {
      if (opened) return;
      root!.classList.remove("is-demo");
      scratchStarted = true;
      dragging = true;
      const p = pos(e);
      scratchAt(p.x, p.y);
      foil!.setPointerCapture?.(e.pointerId);
    }
    function onMove(e: PointerEvent) {
      if (!dragging || opened) return;
      const p = pos(e);
      scratchAt(p.x, p.y);
    }
    function onUp() { dragging = false; }
    zone.addEventListener("pointerdown", onDown);
    zone.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);

    function onReveal() { root!.classList.remove("is-demo"); openCard(); }
    function onRedo() { root!.classList.remove("is-demo"); newCard(); }
    revealBtn.addEventListener("click", onReveal);
    redoBtn.addEventListener("click", onRedo);

    const demoRand = seedRand(424022);
    type DemoPt = { t: number; x: number; y: number };
    const demoPath: DemoPt[] = [];
    for (let i = 0; i < 18; i += 1) {
      demoPath.push({
        t: 1400 + i * 90,
        x: (FW * 0.15) + (i % 6) * (FW * 0.15) + (demoRand() - .5) * 8,
        y: (FH * 0.28) + Math.floor(i / 6) * (FH * 0.24) + (demoRand() - .5) * 8
      });
    }
    const DEMO_LOOP_MS = 4400;
    let demoStep = 0;

    function runDemo(tMod: number) {
      if (tMod < 1400) {
        renderIdle((Math.sin(tMod * 0.0028) + 1) / 2);
        return;
      }
      if (!scratchStarted) scratchStarted = true;
      while (demoStep < demoPath.length && demoPath[demoStep].t <= tMod) {
        const p = demoPath[demoStep];
        scratchAt(p.x, p.y);
        demoStep += 1;
      }
    }
    function resetDemo() {
      seed += 1;
      opened = false;
      scratchStarted = false;
      root!.classList.remove("is-open");
      demoStep = 0;
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
      raf = requestAnimationFrame(tick);
    }
    renderIdle(0);
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      zone.removeEventListener("pointerdown", onDown);
      zone.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      revealBtn.removeEventListener("click", onReveal);
      redoBtn.removeEventListener("click", onRedo);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={`${styles.scv} is-demo`} ref={rootRef}>
        <div className={styles.scv__card}>
          <p className={styles.scv__label}>스크래치 카드</p>
          <div className={styles.scv__zone} ref={zoneRef}>
            <div className={styles.scv__prize}>
              <p className={styles.scv__prizeTitle}>선물 쿠폰</p>
              <p className={styles.scv__prizeSub}>새 카드마다 다른 은박 무늬</p>
            </div>
            <canvas className={styles.scv__foil} ref={foilRef} width={280} height={150} aria-hidden="true" />
          </div>
          <div className={styles.scv__btnRow}>
            <button type="button" className={styles.scv__reveal} ref={revealBtnRef}>한 번에 보기</button>
            <button type="button" className={styles.scv__redo} ref={redoBtnRef}>새 카드 만들기</button>
          </div>
          <p className={styles.scv__live} ref={liveRef} aria-live="polite"></p>
        </div>
      </div>
    </main>
  );
}
