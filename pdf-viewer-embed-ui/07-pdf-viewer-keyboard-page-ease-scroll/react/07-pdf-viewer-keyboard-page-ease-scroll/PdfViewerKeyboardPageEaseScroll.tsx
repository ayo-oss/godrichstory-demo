import { useEffect, useRef } from "react";
import styles from "./PdfViewerKeyboardPageEaseScroll.module.scss";

type KeyEvt = { key: string; preventDefault(): void };

export default function PdfViewerKeyboardPageEaseScroll() {
  const rootRef = useRef<HTMLDivElement>(null);
  const docRef = useRef<HTMLDivElement>(null);
  const badgeRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const root = rootRef.current, doc = docRef.current, badge = badgeRef.current;
    if (!root || !doc || !badge) return;

    const LOOP_MS = 2000;
    const N = 5;

    function seedRand(seed: number) {
      let s = seed >>> 0;
      return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    }
    const rnd = seedRand(430071);
    const pageTops: number[] = [];
    for (let i = 0; i < N; i += 1) {
      const page = document.createElement("div");
      page.className = styles.page;
      let html = '<div class="' + styles.title + '" style="width:' + (44 + rnd() * 18) + '%"></div>';
      for (let j = 0; j < 5; j += 1) html += '<div class="' + styles.line + '" style="width:' + (36 + rnd() * 56) + '%"></div>';
      if (rnd() > 0.4) html += '<div class="' + styles.fig + '"></div>';
      page.innerHTML = html;
      doc.appendChild(page);
    }
    Array.prototype.forEach.call(doc.children, (el: HTMLElement) => { pageTops.push(el.offsetTop); });

    let currentIndex = 0;
    let scrollAnim: { from: number; to: number; start: number; dur: number } | null = null;
    function easeOutCubic(t: number) { return 1 - Math.pow(1 - t, 3); }
    function easeScrollTo(target: number, dur: number, nowT: number) { scrollAnim = { from: doc!.scrollTop, to: target, start: nowT, dur }; }
    function navigate(dir: number, nowT: number) {
      const idx = Math.max(0, Math.min(N - 1, currentIndex + dir));
      if (idx === currentIndex) return;
      currentIndex = idx;
      easeScrollTo(pageTops[idx], 520, nowT);
      badge!.textContent = (idx + 1) + " / " + N;
    }

    let userActive = false;
    function markActive() { if (!userActive) { userActive = true; root!.classList.remove("is-demo"); } }
    function onKeydown(e: KeyEvt) {
      if (e.key === "ArrowDown" || e.key === "PageDown") { e.preventDefault(); markActive(); navigate(1, lastTs || 0); }
      else if (e.key === "ArrowUp" || e.key === "PageUp") { e.preventDefault(); markActive(); navigate(-1, lastTs || 0); }
    }
    function onWheel() { markActive(); }
    root.addEventListener("keydown", onKeydown as unknown as EventListener);
    doc.addEventListener("wheel", onWheel, { passive: true });

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { root.classList.remove("is-demo"); userActive = true; }

    const fired: Record<string, boolean> = {};
    const SCHEDULE = [
      { t: 150, run: (t: number) => { navigate(1, t); } },
      { t: 650, run: (t: number) => { navigate(1, t); } },
      { t: 1150, run: (t: number) => { navigate(-1, t); } },
      { t: 1650, run: (t: number) => { navigate(-1, t); } }
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
      if (scrollAnim) {
        const p = Math.max(0, Math.min(1, (ts - scrollAnim.start) / scrollAnim.dur));
        doc!.scrollTop = scrollAnim.from + (scrollAnim.to - scrollAnim.from) * easeOutCubic(p);
        if (p >= 1) scrollAnim = null;
      }
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      root.removeEventListener("keydown", onKeydown as unknown as EventListener);
      doc.removeEventListener("wheel", onWheel);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={`${styles.pvk} is-demo`} ref={rootRef} tabIndex={0} aria-label="문서 보기, 방향키나 Page Up·Down 으로 페이지 이동">
        <div className={styles.doc} ref={docRef} />
        <p className={styles.badge} ref={badgeRef}>1 / 5</p>
      </div>
    </main>
  );
}
