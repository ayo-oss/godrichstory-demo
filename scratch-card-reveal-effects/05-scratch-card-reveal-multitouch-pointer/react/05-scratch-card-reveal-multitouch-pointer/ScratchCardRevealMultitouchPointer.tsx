import { useEffect, useRef } from "react";
import styles from "./ScratchCardRevealMultitouchPointer.module.scss";

type Pt = { x: number; y: number };

export default function ScratchCardRevealMultitouchPointer() {
  const rootRef = useRef<HTMLDivElement>(null);
  const zoneRef = useRef<HTMLDivElement>(null);
  const foilRef = useRef<HTMLCanvasElement>(null);
  const revealBtnRef = useRef<HTMLButtonElement>(null);
  const liveRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const zone = zoneRef.current;
    const foil = foilRef.current;
    const revealBtn = revealBtnRef.current;
    const live = liveRef.current;
    if (!root || !zone || !foil || !revealBtn || !live) return;
    const ctx = foil.getContext("2d");
    if (!ctx) return;

    const FW = foil.width, FH = foil.height;
    const SCRATCH_BRUSH_R = 14;

    function seedRand(seed: number) {
      let s = seed >>> 0;
      return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    }
    const foilRand = seedRand(424051);

    function paintFoil() {
      ctx!.globalCompositeOperation = "source-over";
      ctx!.clearRect(0, 0, FW, FH);
      const grad = ctx!.createLinearGradient(0, 0, FW, FH);
      grad.addColorStop(0, "#5b6cff");
      grad.addColorStop(.5, "#8f9bff");
      grad.addColorStop(1, "#3c46c9");
      ctx!.fillStyle = grad;
      ctx!.fillRect(0, 0, FW, FH);
      ctx!.strokeStyle = "rgba(23,20,26,.16)";
      ctx!.lineWidth = 1;
      for (let i = 0; i < 18; i += 1) {
        const x = foilRand() * FW, y = foilRand() * FH;
        ctx!.beginPath();
        ctx!.moveTo(x, y);
        ctx!.lineTo(x + (foilRand() * 20 - 10), y + (foilRand() * 8 - 4));
        ctx!.stroke();
      }
    }

    function scratchAt(x: number, y: number) {
      ctx!.globalCompositeOperation = "destination-out";
      ctx!.beginPath();
      ctx!.arc(x, y, SCRATCH_BRUSH_R, 0, Math.PI * 2);
      ctx!.fill();
    }
    function scratchLine(x0: number, y0: number, x1: number, y1: number) {
      const dx = x1 - x0, dy = y1 - y0;
      const dist = Math.max(1, Math.hypot(dx, dy));
      const steps = Math.max(1, Math.ceil(dist / 6));
      for (let i = 0; i <= steps; i += 1) scratchAt(x0 + dx * (i / steps), y0 + dy * (i / steps));
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
      live!.textContent = "교환 쿠폰이 열렸어요";
    }

    function pos(e: PointerEvent) {
      const r = foil!.getBoundingClientRect();
      return { x: (e.clientX - r.left) * (FW / r.width), y: (e.clientY - r.top) * (FH / r.height) };
    }

    paintFoil();
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const pointers = new Map<number, Pt>();

    function onDown(e: PointerEvent) {
      if (opened) return;
      root!.classList.remove("is-demo");
      const p = pos(e);
      pointers.set(e.pointerId, p);
      scratchAt(p.x, p.y);
      zone!.setPointerCapture?.(e.pointerId);
    }
    function onMove(e: PointerEvent) {
      if (opened || !pointers.has(e.pointerId)) return;
      const prev = pointers.get(e.pointerId)!;
      const p = pos(e);
      scratchLine(prev.x, prev.y, p.x, p.y);
      pointers.set(e.pointerId, p);
      if (clearedRatio() > .82) openCard();
    }
    function release(e: PointerEvent) { pointers.delete(e.pointerId); }
    zone.addEventListener("pointerdown", onDown);
    zone.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", release);
    window.addEventListener("pointercancel", release);

    function onReveal() { root!.classList.remove("is-demo"); openCard(); }
    revealBtn.addEventListener("click", onReveal);

    const demoRand = seedRand(424052);
    type DemoPt = { t: number; x: number; y: number };
    function buildPath(baseX: number, baseY: number, count: number) {
      const pts: DemoPt[] = [];
      for (let i = 0; i < count; i += 1) {
        pts.push({
          t: 240 + i * 96,
          x: baseX + (i % 4) * (FW * 0.12) + (demoRand() - .5) * 6,
          y: baseY + Math.floor(i / 4) * (FH * 0.2) + (demoRand() - .5) * 6
        });
      }
      return pts;
    }
    const pathA = buildPath(FW * 0.1, FH * 0.14, 12);
    const pathB = buildPath(FW * 0.52, FH * 0.5, 12);
    const DEMO_LOOP_MS = 4000;
    let stepA = 0, stepB = 0;
    let lastA: DemoPt | null = null, lastB: DemoPt | null = null;

    function resetDemo() {
      opened = false;
      root!.classList.remove("is-open");
      paintFoil();
      stepA = 0; stepB = 0; lastA = null; lastB = null;
    }
    function advance(path: DemoPt[], step: number, last: DemoPt | null, tMod: number): [number, DemoPt | null] {
      while (step < path.length && path[step].t <= tMod) {
        const p = path[step];
        if (last) scratchLine(last.x, last.y, p.x, p.y); else scratchAt(p.x, p.y);
        last = p;
        step += 1;
      }
      return [step, last];
    }
    function runDemo(tMod: number) {
      [stepA, lastA] = advance(pathA, stepA, lastA, tMod);
      [stepB, lastB] = advance(pathB, stepB, lastB, tMod);
      if (clearedRatio() > .82) openCard();
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
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      zone.removeEventListener("pointerdown", onDown);
      zone.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", release);
      window.removeEventListener("pointercancel", release);
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
              <p className={styles.scv__prizeTitle}>교환 쿠폰</p>
              <p className={styles.scv__prizeSub}>손가락 여러 개로 동시에 긁어보세요</p>
            </div>
            <canvas className={styles.scv__foil} ref={foilRef} width={280} height={150} aria-hidden="true" />
          </div>
          <button type="button" className={styles.scv__reveal} ref={revealBtnRef}>한 번에 보기</button>
          <p className={styles.scv__live} ref={liveRef} aria-live="polite"></p>
        </div>
      </div>
    </main>
  );
}
