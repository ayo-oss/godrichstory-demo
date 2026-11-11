import { useEffect, useRef } from "react";
import styles from "./PdfViewerSwipeVelocityPageFlip.module.scss";

type KeyEvt = { key: string; preventDefault(): void };
type PointerEvt = { clientX: number; timeStamp: number; pointerId: number; preventDefault(): void };

export default function PdfViewerSwipeVelocityPageFlip() {
  const rootRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const cardBackRef = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const root = rootRef.current, card = cardRef.current, cardBack = cardBackRef.current, hint = hintRef.current;
    if (!root || !card || !cardBack || !hint) return;

    // 변형 04: SWIPE_FLIP_VELOCITY_PX_S 300 → 600 (전값이 소스 초기값)
    const SWIPE_FLIP_VELOCITY_PX_S = 300;
    const LOOP_MS = 2000;

    function seedRand(seed: number) {
      let s = seed >>> 0;
      return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    }
    let pageSeed = 430041;
    function paintPage(el: HTMLElement) {
      const rnd = seedRand(pageSeed);
      pageSeed += 7;
      let html = '<div class="' + styles.title + '" style="width:' + (44 + rnd() * 16) + '%"></div>';
      for (let i = 0; i < 6; i += 1) html += '<div class="' + styles.line + '" style="width:' + (36 + rnd() * 56) + '%"></div>';
      if (rnd() > 0.3) html += '<div class="' + styles.fig + '"></div>';
      el.innerHTML = html;
    }
    paintPage(card);
    paintPage(cardBack);

    let dragging = false;
    let samples: { x: number; t: number }[] = [];
    let dragStartX = 0, cardStartX = 0, curX = 0, curRot = 0;
    let flyAnim: { fromX: number; fromRot: number; toX: number; toRot: number; start: number; dur: number } | null = null;
    let springAnim: { fromX: number; toX: number; fromRot: number; toRot: number; start: number; dur: number } | null = null;

    function pushSample(x: number, t: number) { samples.push({ x, t }); if (samples.length > 10) samples.shift(); }
    function render() {
      card!.style.transform = "translateX(" + curX.toFixed(1) + "px) rotate(" + curRot.toFixed(2) + "deg)";
      card!.style.opacity = String(Math.max(0, 1 - Math.abs(curX) / 460));
    }
    function velocityNow(nowT: number) {
      if (samples.length < 2) return 0;
      const windowStart = nowT - 120;
      let first = samples[0];
      for (let i = 0; i < samples.length; i += 1) { if (samples[i].t >= windowStart) { first = samples[i]; break; } }
      const last = samples[samples.length - 1];
      const dt = (last.t - first.t) / 1000;
      if (dt <= 0) return 0;
      return (last.x - first.x) / dt;
    }
    function startDrag(x: number, t: number) { dragging = true; flyAnim = null; springAnim = null; samples = []; dragStartX = x; cardStartX = curX; pushSample(x, t); }
    function moveDrag(x: number, t: number) {
      if (!dragging) return;
      const dx = x - dragStartX;
      curX = cardStartX + dx;
      curRot = dx / 22;
      pushSample(x, t);
      render();
    }
    function release(t: number) {
      if (!dragging) return;
      dragging = false;
      const v = velocityNow(t);
      if (Math.abs(v) >= SWIPE_FLIP_VELOCITY_PX_S) flyOut(v < 0 ? -1 : 1, t);
      else springBack(t);
    }
    function flyOut(dir: number, nowT: number) { flyAnim = { fromX: curX, fromRot: curRot, toX: dir * 640, toRot: dir * 26, start: nowT, dur: 260 }; }
    function springBack(nowT: number) { springAnim = { fromX: curX, toX: 0, fromRot: curRot, toRot: 0, start: nowT, dur: 520 }; }
    function easeOutCubic(t: number) { return 1 - Math.pow(1 - t, 3); }
    function springEase(t: number) { const d = 7.2, w = 5.6; return 1 - Math.exp(-d * t) * Math.cos(w * t); }

    let userActive = false;
    function markActive() { if (!userActive) { userActive = true; root!.classList.remove("is-demo"); hint!.style.opacity = "0"; } }

    function onPointerDown(e: PointerEvt) { markActive(); (card as unknown as { setPointerCapture(id: number): void }).setPointerCapture(e.pointerId); startDrag(e.clientX, e.timeStamp); }
    function onPointerMove(e: PointerEvt) { if (dragging) moveDrag(e.clientX, e.timeStamp); }
    function onPointerUp(e: PointerEvt) { release(e.timeStamp); }
    card.addEventListener("pointerdown", onPointerDown as unknown as EventListener);
    card.addEventListener("pointermove", onPointerMove as unknown as EventListener);
    card.addEventListener("pointerup", onPointerUp as unknown as EventListener);
    card.addEventListener("pointercancel", onPointerUp as unknown as EventListener);

    function onKeydown(e: KeyEvt) {
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        e.preventDefault();
        markActive();
        flyOut(e.key === "ArrowLeft" ? -1 : 1, lastTs || 0);
      }
    }
    root.addEventListener("keydown", onKeydown as unknown as EventListener);

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { root.classList.remove("is-demo"); userActive = true; hint.style.opacity = "0"; }

    const fired: Record<string, boolean> = {};
    const SCHEDULE = [
      { t: 20, run: (nowT: number) => { paintPage(cardBack!); curX = 0; curRot = 0; render(); startDrag(0, nowT); } },
      { t: 420, run: (nowT: number) => { moveDrag(-360, nowT); } },
      { t: 640, run: (nowT: number) => { release(nowT); } },
      { t: 950, run: (nowT: number) => { paintPage(card!); curX = 0; curRot = 0; render(); startDrag(0, nowT); } },
      { t: 1350, run: (nowT: number) => { moveDrag(-70, nowT); } },
      { t: 1650, run: (nowT: number) => { release(nowT); } }
    ];

    let lastTs: number | null = null, originTs: number | null = null, raf = 0;
    function tick(ts: number) {
      if (lastTs === null) lastTs = ts;
      lastTs = ts;
      if (!userActive) {
        if (originTs === null) originTs = ts;
        const elapsed = ts - originTs;
        const loopIdx = Math.floor(elapsed / LOOP_MS);
        const phase = elapsed % LOOP_MS;
        SCHEDULE.forEach((a, i) => {
          const key = loopIdx + ":" + i;
          if (phase >= a.t && !fired[key]) { fired[key] = true; a.run(ts); }
        });
      }
      if (flyAnim) {
        const p = Math.max(0, Math.min(1, (ts - flyAnim.start) / flyAnim.dur));
        const e = easeOutCubic(p);
        curX = flyAnim.fromX + (flyAnim.toX - flyAnim.fromX) * e;
        curRot = flyAnim.fromRot + (flyAnim.toRot - flyAnim.fromRot) * e;
        render();
        if (p >= 1) flyAnim = null;
      } else if (springAnim) {
        const sp = Math.max(0, Math.min(1, (ts - springAnim.start) / springAnim.dur));
        const se = springEase(sp);
        curX = springAnim.fromX + (springAnim.toX - springAnim.fromX) * se;
        curRot = springAnim.fromRot + (springAnim.toRot - springAnim.fromRot) * se;
        render();
        if (sp >= 1) { curX = 0; curRot = 0; render(); springAnim = null; }
      }
      raf = requestAnimationFrame(tick);
    }
    render();
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      card.removeEventListener("pointerdown", onPointerDown as unknown as EventListener);
      card.removeEventListener("pointermove", onPointerMove as unknown as EventListener);
      card.removeEventListener("pointerup", onPointerUp as unknown as EventListener);
      card.removeEventListener("pointercancel", onPointerUp as unknown as EventListener);
      root.removeEventListener("keydown", onKeydown as unknown as EventListener);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={`${styles.pvf} is-demo`} ref={rootRef} tabIndex={0} aria-label="페이지 스와이프 카드">
        <div className={styles.stack}>
          <div className={styles.cardBack} ref={cardBackRef} />
          <div className={styles.card} ref={cardRef} />
        </div>
        <p className={styles.hint} ref={hintRef}>좌우로 밀기</p>
      </div>
    </main>
  );
}
