import { useEffect, useRef } from "react";
import styles from "./ScratchCardRevealPixelThresholdAutopeel.module.scss";

export default function ScratchCardRevealPixelThresholdAutopeel() {
  const rootRef = useRef<HTMLDivElement>(null);
  const zoneRef = useRef<HTMLDivElement>(null);
  const foilRef = useRef<HTMLCanvasElement>(null);
  const meterRef = useRef<HTMLDivElement>(null);
  const liveRef = useRef<HTMLParagraphElement>(null);
  const revealBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const zone = zoneRef.current;
    const foil = foilRef.current;
    const meterFill = meterRef.current;
    const live = liveRef.current;
    const revealBtn = revealBtnRef.current;
    if (!root || !zone || !foil || !meterFill || !live || !revealBtn) return;
    const ctx = foil.getContext("2d");
    if (!ctx) return;

    const SCRATCH_REVEAL_THRESHOLD_PCT = 50;
    const SCRATCH_BRUSH_R = 15;
    let opened = false;

    function seedRand(seed: number) {
      let s = seed >>> 0;
      return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    }
    const foilRand = seedRand(424011);

    function paintFoil() {
      ctx!.globalCompositeOperation = "source-over";
      ctx!.clearRect(0, 0, foil!.width, foil!.height);
      const grad = ctx!.createLinearGradient(0, 0, foil!.width, foil!.height);
      grad.addColorStop(0, "#cfd3dd");
      grad.addColorStop(.5, "#eef0f5");
      grad.addColorStop(1, "#b9bdc9");
      ctx!.fillStyle = grad;
      ctx!.fillRect(0, 0, foil!.width, foil!.height);
      ctx!.strokeStyle = "rgba(23,20,26,.16)";
      ctx!.lineWidth = 1;
      for (let i = 0; i < 22; i += 1) {
        const x = foilRand() * foil!.width, y = foilRand() * foil!.height;
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

    function clearedPixelRatio() {
      const data = ctx!.getImageData(0, 0, foil!.width, foil!.height).data;
      let clear = 0;
      const total = data.length / 4;
      for (let i = 3; i < data.length; i += 4) { if (data[i] < 40) clear += 1; }
      return clear / total;
    }

    function updateMeter(ratio: number) {
      meterFill!.style.width = Math.round(ratio * 100) + "%";
    }

    function openCard() {
      if (opened) return;
      opened = true;
      ctx!.globalCompositeOperation = "destination-out";
      ctx!.fillRect(0, 0, foil!.width, foil!.height);
      updateMeter(1);
      root!.classList.add("is-open");
      live!.textContent = "20% 할인 쿠폰이 열렸어요";
    }

    function autoPeelRemaining(ratio: number) {
      if (ratio * 100 >= SCRATCH_REVEAL_THRESHOLD_PCT) openCard();
    }

    function pos(e: PointerEvent) {
      const r = foil!.getBoundingClientRect();
      return { x: (e.clientX - r.left) * (foil!.width / r.width), y: (e.clientY - r.top) * (foil!.height / r.height) };
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
      const ratio = clearedPixelRatio();
      updateMeter(ratio);
      autoPeelRemaining(ratio);
      foil!.setPointerCapture?.(e.pointerId);
    }
    function onMove(e: PointerEvent) {
      if (!dragging || opened) return;
      const p = pos(e);
      scratchAt(p.x, p.y);
      const ratio = clearedPixelRatio();
      updateMeter(ratio);
      autoPeelRemaining(ratio);
    }
    function onUp() { dragging = false; }
    zone.addEventListener("pointerdown", onDown);
    zone.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);

    function onReveal() {
      root!.classList.remove("is-demo");
      openCard();
    }
    revealBtn.addEventListener("click", onReveal);

    const demoRand = seedRand(424012);
    type DemoPt = { t: number; x: number; y: number };
    const demoPath: DemoPt[] = [];
    for (let i = 0; i < 24; i += 1) {
      demoPath.push({
        t: 220 + i * 78,
        x: (foil.width * 0.16) + (i % 6) * (foil.width * 0.145) + (demoRand() - .5) * 8,
        y: (foil.height * 0.26) + Math.floor(i / 6) * (foil.height * 0.24) + (demoRand() - .5) * 8
      });
    }
    const DEMO_LOOP_MS = 3600;
    let demoStep = 0;

    function resetDemo() {
      opened = false;
      root!.classList.remove("is-open");
      paintFoil();
      updateMeter(0);
      demoStep = 0;
    }
    function runDemo(tMod: number) {
      while (demoStep < demoPath.length && demoPath[demoStep].t <= tMod) {
        const p = demoPath[demoStep];
        scratchAt(p.x, p.y);
        demoStep += 1;
      }
      const ratio = clearedPixelRatio();
      updateMeter(ratio);
      autoPeelRemaining(ratio);
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
    updateMeter(0);
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
              <p className={styles.scv__prizeTitle}>20% 할인 쿠폰</p>
              <p className={styles.scv__prizeSub}>긁어서 결과를 확인하세요</p>
            </div>
            <canvas className={styles.scv__foil} ref={foilRef} width={280} height={150} aria-hidden="true" />
          </div>
          <div className={styles.scv__meter} aria-hidden="true"><div className={styles.scv__meterFill} ref={meterRef} /></div>
          <button type="button" className={styles.scv__reveal} ref={revealBtnRef}>한 번에 보기</button>
          <p className={styles.scv__live} ref={liveRef} aria-live="polite"></p>
        </div>
      </div>
    </main>
  );
}
