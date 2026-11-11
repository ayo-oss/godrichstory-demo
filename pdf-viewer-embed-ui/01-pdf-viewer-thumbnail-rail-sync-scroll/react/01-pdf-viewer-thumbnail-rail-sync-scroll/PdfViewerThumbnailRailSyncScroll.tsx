import { useEffect, useRef } from "react";
import styles from "./PdfViewerThumbnailRailSyncScroll.module.scss";

type Page = { n: number; titleW: number; lines: number[]; hasFig: boolean };
type KeyEvt = { key: string; preventDefault(): void };

function seedRand(seed: number) {
  let s = seed >>> 0;
  return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}
function makePages(seed: number, n: number): Page[] {
  const rnd = seedRand(seed), pages: Page[] = [];
  for (let i = 0; i < n; i += 1) {
    const lineCount = 4 + Math.floor(rnd() * 3), lines: number[] = [];
    for (let j = 0; j < lineCount; j += 1) lines.push(46 + rnd() * 44);
    pages.push({ n: i + 1, titleW: 34 + rnd() * 26, lines, hasFig: rnd() < 0.4 });
  }
  return pages;
}

export default function PdfViewerThumbnailRailSyncScroll() {
  const rootRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const docRef = useRef<HTMLDivElement>(null);
  const badgeRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const root = rootRef.current, rail = railRef.current, track = trackRef.current;
    const doc = docRef.current, badge = badgeRef.current;
    if (!root || !rail || !track || !doc || !badge) return;

    const PAGE_COUNT = 6;
    const RAIL_LERP = 0.18;
    const LOOP_MS = 2000;
    const pages = makePages(430011, PAGE_COUNT);

    function pageHTML(p: Page, mini: boolean) {
      const tcls = mini ? styles.miniTitle : styles.docTitle;
      const lcls = mini ? styles.miniLine : styles.docLine;
      let html = '<div class="' + tcls + '" style="width:' + p.titleW + '%"></div>';
      const lines = mini ? p.lines.slice(0, 2) : p.lines;
      for (let i = 0; i < lines.length; i += 1) html += '<div class="' + lcls + '" style="width:' + lines[i] + '%"></div>';
      if (!mini && p.hasFig) html += '<div class="' + styles.docFig + '"></div>';
      return html;
    }

    const docEls: HTMLDivElement[] = [], thumbEls: HTMLButtonElement[] = [];
    let userActive = false;

    for (let i = 0; i < pages.length; i += 1) {
      const page = document.createElement("div");
      page.className = styles.docPage;
      page.innerHTML = pageHTML(pages[i], false);
      doc.appendChild(page);
      docEls.push(page);

      const thumb = document.createElement("button");
      thumb.type = "button";
      thumb.className = styles.thumb;
      thumb.setAttribute("aria-label", "페이지 " + pages[i].n + "로 이동");
      thumb.innerHTML = pageHTML(pages[i], true);
      thumb.addEventListener("click", (function (idx) {
        return function () { userActive = true; root.classList.remove("is-demo"); doc.scrollTop = docEls[idx].offsetTop - 6; };
      })(i));
      track.appendChild(thumb);
      thumbEls.push(thumb);
    }

    let current = 0;
    function visibleRatio(el: HTMLElement, viewTop: number, viewH: number) {
      const top = el.offsetTop, h = el.offsetHeight;
      const lo = Math.max(top, viewTop), hi = Math.min(top + h, viewTop + viewH);
      return Math.max(0, hi - lo) / h;
    }
    function computeCurrent() {
      const viewTop = doc!.scrollTop, viewH = doc!.clientHeight;
      let best = 0, bestR = -1;
      for (let i = 0; i < docEls.length; i += 1) {
        const r = visibleRatio(docEls[i], viewTop, viewH);
        if (r > bestR) { bestR = r; best = i; }
      }
      if (best !== current) {
        current = best;
        for (let j = 0; j < thumbEls.length; j += 1) thumbEls[j].classList.toggle(styles.thumbActive, j === current);
        badge!.textContent = (current + 1) + " / " + pages.length;
      }
    }

    doc.addEventListener("scroll", computeCurrent);
    const markActive = () => { userActive = true; root.classList.remove("is-demo"); };
    doc.addEventListener("wheel", markActive, { passive: true });
    doc.addEventListener("pointerdown", markActive);
    const onKeydown = (e: KeyEvt) => {
      if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "PageDown" || e.key === "PageUp") {
        e.preventDefault(); markActive();
        const next = (e.key === "ArrowDown" || e.key === "PageDown")
          ? Math.min(current + 1, docEls.length - 1) : Math.max(current - 1, 0);
        doc!.scrollTop = docEls[next].offsetTop - 6;
        computeCurrent();
      }
    };
    root.addEventListener("keydown", onKeydown as unknown as EventListener);

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { root.classList.remove("is-demo"); userActive = true; }

    function railTarget() {
      const t = thumbEls[current];
      return (rail!.clientWidth / 2) - (t.offsetLeft + t.offsetWidth / 2);
    }
    function clampRail(v: number) {
      const min = Math.min(0, rail!.clientWidth - track!.scrollWidth);
      return Math.min(0, Math.max(min, v));
    }
    function autoScroll(elapsed: number) {
      const max = doc!.scrollHeight - doc!.clientHeight;
      const phase = (elapsed % LOOP_MS) / LOOP_MS;
      const wave = phase < 0.5 ? phase * 2 : (1 - phase) * 2;
      const eased = wave * wave * (3 - 2 * wave);
      doc!.scrollTop = max * eased;
      computeCurrent();
    }

    let railOffset = 0, lastTs: number | null = null, elapsed = 0, raf = 0;
    function tick(ts: number) {
      if (lastTs === null) lastTs = ts;
      const dt = Math.min(ts - lastTs, 48);
      lastTs = ts;
      if (!userActive) { elapsed += dt; autoScroll(elapsed); }
      const target = clampRail(railTarget());
      railOffset += (target - railOffset) * (userActive ? 1 : RAIL_LERP);
      track!.style.transform = "translateX(" + railOffset.toFixed(1) + "px)";
      raf = requestAnimationFrame(tick);
    }
    computeCurrent();
    thumbEls[0].classList.add(styles.thumbActive);
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      doc.removeEventListener("scroll", computeCurrent);
      doc.removeEventListener("wheel", markActive);
      doc.removeEventListener("pointerdown", markActive);
      root.removeEventListener("keydown", onKeydown as unknown as EventListener);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={`${styles.pvt} is-demo`} ref={rootRef} tabIndex={0}>
        <div className={styles.rail} ref={railRef}><div className={styles.track} ref={trackRef} /></div>
        <div className={styles.doc} ref={docRef} />
        <p className={styles.badge} ref={badgeRef}>1 / 6</p>
      </div>
    </main>
  );
}
