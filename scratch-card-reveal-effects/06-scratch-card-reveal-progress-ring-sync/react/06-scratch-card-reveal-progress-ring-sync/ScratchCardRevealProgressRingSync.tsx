import { useEffect, useRef } from "react";
import styles from "./ScratchCardRevealProgressRingSync.module.scss";

export default function ScratchCardRevealProgressRingSync() {
  const rootRef = useRef<HTMLDivElement>(null);
  const zoneRef = useRef<HTMLDivElement>(null);
  const foilRef = useRef<HTMLCanvasElement>(null);
  const ringRef = useRef<HTMLCanvasElement>(null);
  const ringPctRef = useRef<HTMLParagraphElement>(null);
  const revealBtnRef = useRef<HTMLButtonElement>(null);
  const liveRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const zone = zoneRef.current;
    const foil = foilRef.current;
    const ring = ringRef.current;
    const ringPct = ringPctRef.current;
    const revealBtn = revealBtnRef.current;
    const live = liveRef.current;
    if (!root || !zone || !foil || !ring || !ringPct || !revealBtn || !live) return;
    const ctx = foil.getContext("2d");
    const rctx = ring.getContext("2d");
    if (!ctx || !rctx) return;

    const FW = foil.width, FH = foil.height;
    const RING_SYNC_THRESHOLD_PCT = 92; // 시연 내내 링·카드가 계속 움직이도록 자동 오픈을 뒤로 미룬다
    const SCRATCH_BRUSH_R = 12;

    function seedRand(seed: number) {
      let s = seed >>> 0;
      return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    }
    const foilRand = seedRand(424061);

    function paintFoil() {
      ctx!.globalCompositeOperation = "source-over";
      ctx!.clearRect(0, 0, FW, FH);
      const grad = ctx!.createLinearGradient(0, 0, FW, FH);
      grad.addColorStop(0, "#e8c344");
      grad.addColorStop(.5, "#f6dd7c");
      grad.addColorStop(1, "#c99f22");
      ctx!.fillStyle = grad;
      ctx!.fillRect(0, 0, FW, FH);
      ctx!.strokeStyle = "rgba(23,20,26,.16)";
      ctx!.lineWidth = 1;
      for (let i = 0; i < 16; i += 1) {
        const x = foilRand() * FW, y = foilRand() * FH;
        ctx!.beginPath();
        ctx!.moveTo(x, y);
        ctx!.lineTo(x + (foilRand() * 18 - 9), y + (foilRand() * 8 - 4));
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
      const data = ctx!.getImageData(0, 0, FW, FH).data;
      let clear = 0;
      const total = data.length / 4;
      for (let i = 3; i < data.length; i += 4) { if (data[i] < 40) clear += 1; }
      return clear / total;
    }

    function drawRing(ratio: number) {
      const cx = ring!.width / 2, cy = ring!.height / 2, r = 42;
      rctx!.clearRect(0, 0, ring!.width, ring!.height);
      rctx!.lineWidth = 11;
      rctx!.strokeStyle = "rgba(23,20,26,.18)";
      rctx!.beginPath();
      rctx!.arc(cx, cy, r, 0, Math.PI * 2);
      rctx!.stroke();
      rctx!.strokeStyle = "#0a4fe8";
      rctx!.lineCap = "round";
      rctx!.beginPath();
      rctx!.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ratio);
      rctx!.stroke();
      ringPct!.textContent = Math.round(ratio * 100) + "%";
    }

    let opened = false;
    function openCard() {
      if (opened) return;
      opened = true;
      ctx!.globalCompositeOperation = "destination-out";
      ctx!.fillRect(0, 0, FW, FH);
      root!.classList.add("is-open");
      live!.textContent = "적립 쿠폰이 열렸어요";
    }

    function pos(e: PointerEvent) {
      const r = foil!.getBoundingClientRect();
      return { x: (e.clientX - r.left) * (FW / r.width), y: (e.clientY - r.top) * (FH / r.height) };
    }

    paintFoil();
    drawRing(0);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let dragging = false;

    function onDown(e: PointerEvent) {
      if (opened) return;
      root!.classList.remove("is-demo");
      dragging = true;
      const p = pos(e);
      scratchAt(p.x, p.y);
      zone!.setPointerCapture?.(e.pointerId);
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
    revealBtn.addEventListener("click", onReveal);

    const demoRand = seedRand(424062);
    // 격자를 미리 정해두고 순간이동하며 찍으면 캡처 간격(83ms)과 점 간격이 어긋나
    // 특정 프레임 구간이 통째로 비는 앨리어싱이 생긴다(실측: 12.8%·14/23 로 고정).
    // 대신 실제 손가락 드래그처럼 매 rAF 틱마다 좌표를 연속으로 옮기며 긁는다.
    const SWIPE_START = 180, SWIPE_DUR = 2200, SWIPE_ROWS = 7;
    function swipePos(t: number) {
      const f = Math.max(0, Math.min(1, (t - SWIPE_START) / SWIPE_DUR));
      const rowF = f * SWIPE_ROWS;
      const row = Math.min(SWIPE_ROWS - 1, Math.floor(rowF));
      const frac = rowF - row;
      const xFrac = (row % 2 === 0) ? frac : (1 - frac);
      return {
        x: FW * (0.08 + xFrac * 0.84) + (demoRand() - .5) * 3,
        y: FH * (0.10 + (row / (SWIPE_ROWS - 1)) * 0.80) + (demoRand() - .5) * 3
      };
    }
    const DEMO_LOOP_MS = 3600;

    function resetDemo() {
      opened = false;
      root!.classList.remove("is-open");
      paintFoil();
    }
    function runDemo(tMod: number) {
      if (tMod < SWIPE_START || tMod > SWIPE_START + SWIPE_DUR) return false;
      const p = swipePos(tMod);
      scratchAt(p.x, p.y);
      return true;
    }

    if (reduce) root.classList.remove("is-demo");
    let elapsed = 0;
    let lastTs: number | null = null;
    let ringTick = 0;
    let raf = 0;
    function tick(ts: number) {
      if (lastTs === null) lastTs = ts;
      const dt = Math.min(ts - lastTs, 48);
      lastTs = ts;
      let scratched = false;
      if (!reduce && root!.classList.contains("is-demo")) {
        elapsed += dt;
        const tMod = elapsed % DEMO_LOOP_MS;
        if (tMod < dt) resetDemo();
        scratched = runDemo(tMod);
      }
      // getImageData 전체 스캔은 무겁다 — 매 rAF 틱(약 60fps)마다 부르면 헤드리스 렌더
      // 파이프라인이 밀려 일정 시점 뒤 rAF 자체가 멎는 현상이 실측됐다(23 프레임 중 17 부터 정지).
      // 실제로 긁은 틱과 3틱에 한 번(약 50ms, 출력 12fps 보다 촘촘)만 다시 재서 부하를 줄인다.
      ringTick += 1;
      if (scratched || ringTick % 3 === 0) {
        const ratio = clearedPixelRatio();
        drawRing(ratio);
        // 시연 중엔 링·카드가 캡처 구간 내내 계속 움직여야 하므로 자동 오픈으로 멈추지 않는다 —
        // 실제 사용자가 긁어서(is-demo 해제) 임계를 넘겼을 때만 카드가 열린다.
        if (!root!.classList.contains("is-demo") && ratio * 100 >= RING_SYNC_THRESHOLD_PCT) openCard();
      }
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
          <div className={styles.scv__row}>
            <div className={styles.scv__zone} ref={zoneRef}>
              <div className={styles.scv__prize}>
                <p className={styles.scv__prizeTitle}>적립 쿠폰</p>
                <p className={styles.scv__prizeSub}>긁은 만큼 링이 채워져요</p>
              </div>
              <canvas className={styles.scv__foil} ref={foilRef} width={220} height={140} aria-hidden="true" />
            </div>
            <div className={styles.scv__ringWrap}>
              <canvas className={styles.scv__ring} ref={ringRef} width={104} height={104} aria-hidden="true" />
              <p className={styles.scv__ringPct} ref={ringPctRef}>0%</p>
            </div>
          </div>
          <button type="button" className={styles.scv__reveal} ref={revealBtnRef}>한 번에 보기</button>
          <p className={styles.scv__live} ref={liveRef} aria-live="polite"></p>
        </div>
      </div>
    </main>
  );
}
