import { useEffect, useRef } from "react";
import styles from "./ScratchCardRevealKeyboardFallback.module.scss";

export default function ScratchCardRevealKeyboardFallback() {
  const rootRef = useRef<HTMLDivElement>(null);
  const zoneRef = useRef<HTMLDivElement>(null);
  const foilRef = useRef<HTMLCanvasElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const revealBtnRef = useRef<HTMLButtonElement>(null);
  const liveRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const zone = zoneRef.current;
    const foil = foilRef.current;
    const cursorEl = cursorRef.current;
    const revealBtn = revealBtnRef.current;
    const live = liveRef.current;
    if (!root || !zone || !foil || !cursorEl || !revealBtn || !live) return;
    const ctx = foil.getContext("2d");
    if (!ctx) return;

    const FW = foil.width, FH = foil.height;
    const SCRATCH_BRUSH_R = 16;
    const KEY_STEP = 22;

    function seedRand(seed: number) {
      let s = seed >>> 0;
      return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    }
    const foilRand = seedRand(424081);

    function paintFoil() {
      ctx!.globalCompositeOperation = "source-over";
      ctx!.clearRect(0, 0, FW, FH);
      const grad = ctx!.createLinearGradient(0, 0, FW, FH);
      grad.addColorStop(0, "#dfe3ea");
      grad.addColorStop(.5, "#f4f6f9");
      grad.addColorStop(1, "#c9ced8");
      ctx!.fillStyle = grad;
      ctx!.fillRect(0, 0, FW, FH);
      ctx!.strokeStyle = "rgba(23,20,26,.14)";
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
      live!.textContent = "배송비 쿠폰이 열렸어요";
    }

    function pos(e: PointerEvent) {
      const r = foil!.getBoundingClientRect();
      return { x: (e.clientX - r.left) * (FW / r.width), y: (e.clientY - r.top) * (FH / r.height) };
    }

    paintFoil();
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let dragging = false;
    const cursor = { x: FW / 2, y: FH / 2 };

    function placeCursor() {
      const r = foil!.getBoundingClientRect();
      const scaleX = r.width / FW, scaleY = r.height / FH;
      cursorEl!.style.left = (cursor.x * scaleX) + "px";
      cursorEl!.style.top = (cursor.y * scaleY) + "px";
    }

    function onDown(e: PointerEvent) {
      if (opened) return;
      root!.classList.remove("is-demo");
      dragging = true;
      const p = pos(e);
      cursor.x = p.x; cursor.y = p.y;
      scratchAt(p.x, p.y);
      placeCursor();
      if (clearedRatio() > .82) openCard();
      zone!.setPointerCapture?.(e.pointerId);
    }
    function onMove(e: PointerEvent) {
      if (!dragging || opened) return;
      const p = pos(e);
      cursor.x = p.x; cursor.y = p.y;
      scratchAt(p.x, p.y);
      placeCursor();
      if (clearedRatio() > .82) openCard();
    }
    function onUp() { dragging = false; }
    zone.addEventListener("pointerdown", onDown);
    zone.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);

    function onKeydown(e: KeyboardEvent) {
      if (opened) return;
      let moved = false;
      if (e.key === "ArrowUp") { cursor.y = Math.max(6, cursor.y - KEY_STEP); moved = true; }
      else if (e.key === "ArrowDown") { cursor.y = Math.min(FH - 6, cursor.y + KEY_STEP); moved = true; }
      else if (e.key === "ArrowLeft") { cursor.x = Math.max(6, cursor.x - KEY_STEP); moved = true; }
      else if (e.key === "ArrowRight") { cursor.x = Math.min(FW - 6, cursor.x + KEY_STEP); moved = true; }
      else if (e.key === "Enter" || e.key === " ") {
        root!.classList.remove("is-demo");
        scratchAt(cursor.x, cursor.y);
        const ratio = clearedRatio();
        live!.textContent = Math.round(ratio * 100) + "% 긁었어요";
        if (ratio > .82) openCard();
        e.preventDefault();
        return;
      } else { return; }
      if (!moved) return;
      root!.classList.remove("is-demo");
      placeCursor();
      e.preventDefault();
    }
    zone.addEventListener("keydown", onKeydown);

    function onReveal() { root!.classList.remove("is-demo"); openCard(); }
    revealBtn.addEventListener("click", onReveal);

    const demoRand = seedRand(424082);
    type DemoPt = { t: number; x: number; y: number };
    const demoPath: DemoPt[] = [];
    for (let i = 0; i < 20; i += 1) {
      demoPath.push({
        t: 220 + i * 90,
        x: (FW * 0.14) + (i % 5) * (FW * 0.18) + (demoRand() - .5) * 6,
        y: (FH * 0.22) + Math.floor(i / 5) * (FH * 0.28) + (demoRand() - .5) * 6
      });
    }
    const DEMO_LOOP_MS = 3800;
    let demoStep = 0;

    function resetDemo() {
      opened = false;
      root!.classList.remove("is-open");
      paintFoil();
      demoStep = 0;
    }
    function runDemo(tMod: number) {
      while (demoStep < demoPath.length && demoPath[demoStep].t <= tMod) {
        const p = demoPath[demoStep];
        cursor.x = p.x; cursor.y = p.y;
        scratchAt(p.x, p.y);
        placeCursor();
        demoStep += 1;
        if (clearedRatio() > .82) openCard();
      }
    }

    placeCursor();
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
      window.removeEventListener("pointerup", onUp);
      zone.removeEventListener("keydown", onKeydown);
      revealBtn.removeEventListener("click", onReveal);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={`${styles.scv} is-demo`} ref={rootRef}>
        <div className={styles.scv__card}>
          <p className={styles.scv__label}>스크래치 카드</p>
          <div
            className={styles.scv__zone}
            ref={zoneRef}
            tabIndex={0}
            role="application"
            aria-label="스크래치 카드, 방향키로 이동 후 스페이스로 긁기"
          >
            <div className={styles.scv__prize}>
              <p className={styles.scv__prizeTitle}>배송비 쿠폰</p>
              <p className={styles.scv__prizeSub}>방향키 + 스페이스로도 긁을 수 있어요</p>
            </div>
            <canvas className={styles.scv__foil} ref={foilRef} width={280} height={150} aria-hidden="true" />
            <div className={styles.scv__cursor} ref={cursorRef} aria-hidden="true" />
          </div>
          <button type="button" className={styles.scv__reveal} ref={revealBtnRef}>한 번에 보기</button>
          <p className={styles.scv__live} ref={liveRef} aria-live="polite"></p>
        </div>
      </div>
    </main>
  );
}
