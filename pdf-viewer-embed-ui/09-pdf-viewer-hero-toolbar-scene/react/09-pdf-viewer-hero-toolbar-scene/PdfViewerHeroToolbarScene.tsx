import { useEffect, useRef } from "react";
import styles from "./PdfViewerHeroToolbarScene.module.scss";

type KeyEvt = { key: string; preventDefault(): void };
type WheelEvt = { deltaY: number; clientX: number; clientY: number; preventDefault(): void };

export default function PdfViewerHeroToolbarScene() {
  const rootRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const railTrackRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const docRef = useRef<HTMLDivElement>(null);
  const docInnerRef = useRef<HTMLDivElement>(null);
  const ringBtnRef = useRef<HTMLButtonElement>(null);
  const ringFillRef = useRef<SVGCircleElement>(null);
  const checkARef = useRef<SVGLineElement>(null);
  const checkBRef = useRef<SVGLineElement>(null);

  useEffect(() => {
    const root = rootRef.current, rail = railRef.current, railTrack = railTrackRef.current;
    const stage = stageRef.current, doc = docRef.current, docInner = docInnerRef.current;
    const ringBtn = ringBtnRef.current, ringFill = ringFillRef.current;
    const checkA = checkARef.current, checkB = checkBRef.current;
    if (!root || !rail || !railTrack || !stage || !doc || !docInner || !ringBtn || !ringFill || !checkA || !checkB) return;

    const HERO_ZOOM_STEP = 1.2;
    const HERO_RAIL_LERP = 0.18;
    const HERO_TOTAL_BYTES = 200000;
    const HERO_SPEED = 230000;
    const LOOP_MS = 2000;
    const N = 4;

    function seedRand(seed: number) {
      let s = seed >>> 0;
      return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    }
    const rnd = seedRand(430091);
    function pageHTML(titleCls: string, lineCls: string, figCls: string) {
      let h = '<div class="' + titleCls + '" style="width:' + (46 + rnd() * 14) + '%"></div>';
      for (let i = 0; i < 4; i += 1) h += '<div class="' + lineCls + '" style="width:' + (36 + rnd() * 56) + '%"></div>';
      if (rnd() > 0.4) h += '<div class="' + figCls + '"></div>';
      return h;
    }
    for (let p = 0; p < N; p += 1) {
      const page = document.createElement("div");
      page.className = styles.page;
      page.innerHTML = pageHTML(styles.docTitle, styles.docLine, styles.docFig);
      docInner.appendChild(page);
      const thumb = document.createElement("button");
      thumb.type = "button";
      thumb.className = styles.thumb;
      thumb.setAttribute("aria-label", "페이지 " + (p + 1) + "로 이동");
      thumb.innerHTML = pageHTML(styles.miniTitle, styles.miniLine, styles.miniFig);
      railTrack.appendChild(thumb);
    }
    const pages = Array.prototype.slice.call(docInner.children) as HTMLElement[];
    const thumbs = Array.prototype.slice.call(railTrack.children) as HTMLElement[];

    function computeCurrent() {
      const top = doc!.scrollTop, h = doc!.clientHeight;
      let best = 0, bestRatio = -1;
      pages.forEach((pg, i) => {
        const pTop = pg.offsetTop, pBot = pTop + pg.offsetHeight;
        const visTop = Math.max(top, pTop), visBot = Math.min(top + h, pBot);
        const ratio = Math.max(0, visBot - visTop) / pg.offsetHeight;
        if (ratio > bestRatio) { bestRatio = ratio; best = i; }
      });
      return best;
    }
    let activeIdx = -1;
    function markRail(idx: number) {
      if (idx === activeIdx) return;
      activeIdx = idx;
      thumbs.forEach((t, i) => { t.classList.toggle(styles.thumbActive, i === idx); });
    }
    let railX = 0;
    function railTarget(idx: number) {
      const t = thumbs[idx]; if (!t) return 0;
      const want = t.offsetLeft + t.offsetWidth / 2 - rail!.clientWidth / 2;
      return -Math.max(0, Math.min(railTrack!.scrollWidth - rail!.clientWidth, want));
    }

    const zoomManual = { s: 1, x: .5, y: .5 };
    function applyZoom(scale: number, ox: number, oy: number) {
      docInner!.style.transformOrigin = (ox * 100) + "% " + (oy * 100) + "%";
      docInner!.style.transform = "scale(" + scale.toFixed(3) + ")";
    }

    let phase: "idle" | "loading" | "done" = "idle", received = 0, doneAt = 0;
    let checkAnim: { start: number } | null = null;
    const R = 15, CIRC = 2 * Math.PI * R;
    ringFill.style.strokeDasharray = CIRC.toFixed(2);
    function lineLen(el: SVGLineElement) {
      const x1 = +el.getAttribute("x1")!, y1 = +el.getAttribute("y1")!;
      const x2 = +el.getAttribute("x2")!, y2 = +el.getAttribute("y2")!;
      return Math.hypot(x2 - x1, y2 - y1);
    }
    const lenA = lineLen(checkA), lenB = lineLen(checkB);
    checkA.style.strokeDasharray = lenA.toFixed(2); checkB.style.strokeDasharray = lenB.toFixed(2);
    checkA.style.strokeDashoffset = lenA.toFixed(2); checkB.style.strokeDashoffset = lenB.toFixed(2);
    function renderRing(ratio: number) { ringFill!.style.strokeDashoffset = (CIRC * (1 - ratio)).toFixed(2); }
    function startDownload() {
      if (phase === "loading") return;
      phase = "loading"; received = 0;
      root!.classList.remove(styles.done);
      checkA!.style.strokeDashoffset = lenA.toFixed(2); checkB!.style.strokeDashoffset = lenB.toFixed(2);
      renderRing(0);
    }
    function finishDownload(nowT: number) { phase = "done"; doneAt = nowT; root!.classList.add(styles.done); checkAnim = { start: nowT }; }
    function resetDownload() { phase = "idle"; received = 0; root!.classList.remove(styles.done); renderRing(0); }

    let userActive = false;
    function markActive() { if (!userActive) { userActive = true; root!.classList.remove("is-demo"); } }

    function onScroll() { markRail(computeCurrent()); }
    function onWheel(e: WheelEvt) {
      e.preventDefault(); markActive();
      const r = stage!.getBoundingClientRect();
      const ox = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
      const oy = Math.max(0, Math.min(1, (e.clientY - r.top) / r.height));
      zoomManual.s = Math.max(1, Math.min(HERO_ZOOM_STEP * HERO_ZOOM_STEP * 1.4, zoomManual.s * Math.pow(HERO_ZOOM_STEP, (e.deltaY < 0 ? 1 : -1) * 0.6)));
      zoomManual.x = ox; zoomManual.y = oy;
      applyZoom(zoomManual.s, ox, oy);
    }
    doc.addEventListener("scroll", onScroll);
    stage.addEventListener("wheel", onWheel as unknown as EventListener, { passive: false });

    const thumbHandlers: Array<() => void> = [];
    thumbs.forEach((t, i) => {
      const h = () => { markActive(); markRail(i); doc!.scrollTop = pages[i].offsetTop; };
      thumbHandlers.push(h);
      t.addEventListener("click", h);
    });
    function onRingClick() { markActive(); if (phase !== "loading") { resetDownload(); startDownload(); } }
    ringBtn.addEventListener("click", onRingClick);

    function onKeydown(e: KeyEvt) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault(); markActive();
        const next = Math.max(0, Math.min(N - 1, activeIdx + (e.key === "ArrowDown" ? 1 : -1)));
        doc!.scrollTop = pages[next].offsetTop;
      } else if (e.key === "+" || e.key === "=" || e.key === "-") {
        e.preventDefault(); markActive();
        zoomManual.s = Math.max(1, Math.min(HERO_ZOOM_STEP * HERO_ZOOM_STEP * 1.4, zoomManual.s * Math.pow(HERO_ZOOM_STEP, e.key === "-" ? -0.6 : 0.6)));
        applyZoom(zoomManual.s, zoomManual.x, zoomManual.y);
      }
    }
    root.addEventListener("keydown", onKeydown as unknown as EventListener);

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { root.classList.remove("is-demo"); userActive = true; markRail(0); applyZoom(1, .5, .5); renderRing(0.4); }

    const fired: Record<string, boolean> = {};
    const autoScale: { target?: number; ox?: number; oy?: number } = {};
    const SCHEDULE = [
      { t: 0, run: () => { doc!.scrollTop = 0; } },
      { t: 200, run: () => { doc!.scrollTop = pages[1] ? pages[1].offsetTop : 0; } },
      { t: 550, run: () => { autoScale.target = HERO_ZOOM_STEP; autoScale.ox = .3; autoScale.oy = .4; } },
      { t: 900, run: () => { autoScale.target = 1; } },
      { t: 1050, run: () => { doc!.scrollTop = pages[2] ? pages[2].offsetTop : 0; } },
      { t: 1300, run: () => { if (phase === "idle") startDownload(); } },
      { t: 1750, run: () => { doc!.scrollTop = pages[3] ? pages[3].offsetTop : 0; } }
    ];

    let lastTs: number | null = null, originTs: number | null = null, raf = 0;
    function tick(ts: number) {
      if (lastTs === null) lastTs = ts;
      const dt = Math.min(ts - lastTs, 48);
      lastTs = ts;
      if (!userActive) {
        if (originTs === null) originTs = ts;
        const elapsed = ts - originTs;
        const loopIdx = Math.floor(elapsed / LOOP_MS);
        const phaseT = elapsed % LOOP_MS;
        SCHEDULE.forEach((a, i) => {
          const key = loopIdx + ":" + i;
          if (phaseT >= a.t && !fired[key]) { fired[key] = true; a.run(); }
        });
        if (autoScale.target !== undefined) {
          zoomManual.s += (autoScale.target - zoomManual.s) * 0.14;
          applyZoom(zoomManual.s, autoScale.ox || .5, autoScale.oy || .5);
        }
        markRail(computeCurrent());
      }
      railX += (railTarget(activeIdx < 0 ? 0 : activeIdx) - railX) * HERO_RAIL_LERP;
      railTrack!.style.transform = "translateX(" + railX.toFixed(1) + "px)";

      if (phase === "loading") {
        received = Math.min(HERO_TOTAL_BYTES, received + HERO_SPEED * (dt / 1000));
        const ratio = received / HERO_TOTAL_BYTES;
        renderRing(ratio);
        if (ratio >= 1) finishDownload(ts);
      } else if (phase === "done") {
        if (checkAnim) {
          const pA = Math.max(0, Math.min(1, (ts - checkAnim.start) / 180));
          const pB = Math.max(0, Math.min(1, (ts - checkAnim.start - 110) / 220));
          checkA!.style.strokeDashoffset = (lenA * (1 - pA)).toFixed(2);
          checkB!.style.strokeDashoffset = (lenB * (1 - pB)).toFixed(2);
          if (pB >= 1) checkAnim = null;
        }
        if (ts - doneAt > 560 && !userActive) resetDownload();
      }
      raf = requestAnimationFrame(tick);
    }
    markRail(0);
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      doc.removeEventListener("scroll", onScroll);
      stage.removeEventListener("wheel", onWheel as unknown as EventListener);
      thumbs.forEach((t, i) => t.removeEventListener("click", thumbHandlers[i]));
      ringBtn.removeEventListener("click", onRingClick);
      root.removeEventListener("keydown", onKeydown as unknown as EventListener);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={`${styles.pht} is-demo`} ref={rootRef} tabIndex={0} aria-label="문서 훑기·확대·다운로드가 함께 있는 장면, 방향키로 페이지 이동·+/- 로 확대">
        <div className={styles.toolbar}>
          <div className={styles.rail} ref={railRef}>
            <div className={styles.railTrack} ref={railTrackRef} />
          </div>
          <button className={styles.ringBtn} ref={ringBtnRef} type="button" aria-label="다운로드">
            <svg className={styles.ring} viewBox="0 0 40 40" width={26} height={26} aria-hidden="true">
              <circle className={styles.ringTrack} cx={20} cy={20} r={15} />
              <circle className={styles.ringFill} ref={ringFillRef} cx={20} cy={20} r={15} transform="rotate(-90 20 20)" />
              <line className={styles.ringCheck} ref={checkARef} x1={12} y1={21} x2={17} y2={27} />
              <line className={styles.ringCheck} ref={checkBRef} x1={12} y1={21} x2={28} y2={12} />
            </svg>
          </button>
        </div>
        <div className={styles.stageArea} ref={stageRef}>
          <div className={styles.doc} ref={docRef}>
            <div className={styles.docInner} ref={docInnerRef} />
          </div>
        </div>
      </div>
    </main>
  );
}
