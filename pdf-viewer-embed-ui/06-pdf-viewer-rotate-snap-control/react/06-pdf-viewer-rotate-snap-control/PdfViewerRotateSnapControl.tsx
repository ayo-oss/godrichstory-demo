import { useEffect, useRef } from "react";
import styles from "./PdfViewerRotateSnapControl.module.scss";

type KeyEvt = { key: string; preventDefault(): void };

export default function PdfViewerRotateSnapControl() {
  const rootRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const degRef = useRef<HTMLSpanElement>(null);
  const btnLRef = useRef<HTMLButtonElement>(null);
  const btnRRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const root = rootRef.current, frame = frameRef.current, page = pageRef.current;
    const degEl = degRef.current, btnL = btnLRef.current, btnR = btnRRef.current;
    if (!root || !frame || !page || !degEl || !btnL || !btnR) return;

    // 변형 06: ROTATE_SNAP_DEG 90 → 45 (전값이 소스 초기값)
    const ROTATE_SNAP_DEG = 90;
    const LOOP_MS = 2000;
    const PAGE_W = 88, PAGE_H = 70;

    function seedRand(seed: number) {
      let s = seed >>> 0;
      return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    }
    const rnd = seedRand(430061);
    let html = '<div class="' + styles.title + '" style="width:' + (46 + rnd() * 14) + '%"></div>';
    for (let i = 0; i < 5; i += 1) html += '<div class="' + styles.line + '" style="width:' + (38 + rnd() * 54) + '%"></div>';
    html += '<div class="' + styles.fig + '"></div>';
    page.innerHTML = html;

    function boxSize(angleDeg: number, w: number, h: number) {
      const r = angleDeg * Math.PI / 180;
      const c = Math.abs(Math.cos(r)), s = Math.abs(Math.sin(r));
      return { w: w * c + h * s, h: w * s + h * c };
    }

    let target = 0, current = 0;
    function render() {
      const box = boxSize(current, PAGE_W, PAGE_H);
      frame!.style.width = box.w + "px";
      frame!.style.height = box.h + "px";
      page!.style.width = PAGE_W + "px";
      page!.style.height = PAGE_H + "px";
      page!.style.transform = "translate(-50%,-50%) rotate(" + current.toFixed(1) + "deg)";
      degEl!.textContent = Math.round(((current % 360) + 360) % 360) + "°";
    }
    function rotateBy(dir: number) { target += dir * ROTATE_SNAP_DEG; }

    let userActive = false;
    function markActive() { if (!userActive) { userActive = true; root!.classList.remove("is-demo"); } }
    function onLeftClick() { markActive(); rotateBy(-1); }
    function onRightClick() { markActive(); rotateBy(1); }
    btnL.addEventListener("click", onLeftClick);
    btnR.addEventListener("click", onRightClick);

    function onKeydown(e: KeyEvt) {
      if (e.key === "ArrowLeft" || e.key === "[") { e.preventDefault(); markActive(); rotateBy(-1); }
      else if (e.key === "ArrowRight" || e.key === "]") { e.preventDefault(); markActive(); rotateBy(1); }
    }
    root.addEventListener("keydown", onKeydown as unknown as EventListener);

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { root.classList.remove("is-demo"); userActive = true; current = target = 0; render(); }

    const fired: Record<string, boolean> = {};
    const SCHEDULE = [
      { t: 150, run: () => { rotateBy(1); } },
      { t: 700, run: () => { rotateBy(1); } },
      { t: 1250, run: () => { rotateBy(-1); } },
      { t: 1650, run: () => { rotateBy(-1); } }
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
          if (phase >= a.t && !fired[key]) { fired[key] = true; a.run(); }
        });
      }
      current += (target - current) * 0.18;
      render();
      raf = requestAnimationFrame(tick);
    }
    render();
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      btnL.removeEventListener("click", onLeftClick);
      btnR.removeEventListener("click", onRightClick);
      root.removeEventListener("keydown", onKeydown as unknown as EventListener);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={`${styles.pvr} is-demo`} ref={rootRef}>
        <div className={styles.frame} ref={frameRef}>
          <div className={styles.page} ref={pageRef} />
        </div>
        <div className={styles.controls}>
          <button className={styles.btn} ref={btnLRef} type="button" aria-label="왼쪽으로 회전">↺</button>
          <span className={styles.deg} ref={degRef}>0°</span>
          <button className={styles.btn} ref={btnRRef} type="button" aria-label="오른쪽으로 회전">↻</button>
        </div>
      </div>
    </main>
  );
}
