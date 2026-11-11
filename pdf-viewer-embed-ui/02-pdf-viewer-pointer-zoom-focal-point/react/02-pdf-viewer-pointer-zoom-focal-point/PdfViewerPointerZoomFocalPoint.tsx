import { useEffect, useRef } from "react";
import styles from "./PdfViewerPointerZoomFocalPoint.module.scss";

type KeyEvt = { key: string; preventDefault(): void };
type WheelEvt = { deltaY: number; clientX: number; clientY: number; preventDefault(): void };

export default function PdfViewerPointerZoomFocalPoint() {
  const rootRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const root = rootRef.current, view = viewRef.current, page = pageRef.current;
    const dot = dotRef.current, label = labelRef.current;
    if (!root || !view || !page || !dot || !label) return;

    // 변형 02: ZOOM_FOCAL_STEP_RATIO 1.2 → 2.4 (전값이 소스 초기값)
    const ZOOM_FOCAL_STEP_RATIO = 1.2;
    const LOOP_MS = 2000;

    function seedRand(seed: number) {
      let s = seed >>> 0;
      return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    }
    const rnd = seedRand(430020);
    let linesHTML = '<div class="' + styles.title + '" style="width:52%"></div>';
    for (let i = 0; i < 7; i += 1) linesHTML += '<div class="' + styles.line + '" style="width:' + (40 + rnd() * 52) + '%"></div>';
    linesHTML += '<div class="' + styles.fig + '"></div>';
    page.innerHTML = linesHTML;

    const L1 = ZOOM_FOCAL_STEP_RATIO;
    const L2 = ZOOM_FOCAL_STEP_RATIO * ZOOM_FOCAL_STEP_RATIO;
    const KF = [
      { t: 0, s: 1, x: .5, y: .5 },
      { t: 300, s: L1, x: .28, y: .38 },
      { t: 900, s: L2, x: .28, y: .38 },
      { t: 1300, s: 1, x: .28, y: .38 },
      { t: 1500, s: L1, x: .7, y: .64 },
      { t: 2000, s: 1, x: .7, y: .64 }
    ];

    function easeInOut(t: number) { return t * t * (3 - 2 * t); }
    function render(scale: number, ox: number, oy: number) {
      page!.style.transformOrigin = (ox * 100) + "% " + (oy * 100) + "%";
      page!.style.transform = "scale(" + scale.toFixed(3) + ")";
      const vr = view!.getBoundingClientRect();
      dot!.style.left = (ox * vr.width) + "px";
      dot!.style.top = (oy * vr.height) + "px";
      dot!.style.transform = "translate(-50%,-50%) scale(" + (1 / scale).toFixed(3) + ")";
      label!.textContent = Math.round(scale * 100) + "%";
    }

    function scheduled(elapsed: number) {
      const phase = elapsed % LOOP_MS;
      let i = 0;
      while (i < KF.length - 1 && phase >= KF[i + 1].t) i += 1;
      const a = KF[i], b = KF[Math.min(i + 1, KF.length - 1)];
      const span = Math.max(1, b.t - a.t);
      const t = easeInOut(Math.max(0, Math.min(1, (phase - a.t) / span)));
      const s = a.s + (b.s - a.s) * t;
      render(s, b.x, b.y);
    }

    const manual = { s: 1, x: .5, y: .5 };
    let userActive = false;
    function applyWheel(dir: number, ox: number, oy: number) {
      manual.s = Math.max(1, Math.min(L2 * 1.4, manual.s * Math.pow(ZOOM_FOCAL_STEP_RATIO, dir * 0.6)));
      manual.x = ox; manual.y = oy;
      render(manual.s, manual.x, manual.y);
    }
    function markActive() { if (!userActive) { userActive = true; root!.classList.remove("is-demo"); manual.s = 1; render(1, .5, .5); } }

    function onWheel(e: WheelEvt) {
      e.preventDefault();
      markActive();
      const r = view!.getBoundingClientRect();
      const ox = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
      const oy = Math.max(0, Math.min(1, (e.clientY - r.top) / r.height));
      applyWheel(e.deltaY < 0 ? 1 : -1, ox, oy);
    }
    function onKeydown(e: KeyEvt) {
      if (e.key === "+" || e.key === "=" || e.key === "-" || e.key === "ArrowUp" || e.key === "ArrowDown") {
        e.preventDefault();
        markActive();
        const dir = (e.key === "+" || e.key === "=" || e.key === "ArrowUp") ? 1 : -1;
        applyWheel(dir, manual.x, manual.y);
      }
    }
    view.addEventListener("wheel", onWheel as unknown as EventListener, { passive: false });
    root.addEventListener("keydown", onKeydown as unknown as EventListener);

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { root.classList.remove("is-demo"); userActive = true; render(1, .5, .5); }

    let lastTs: number | null = null, elapsed = 0, raf = 0;
    function tick(ts: number) {
      if (lastTs === null) lastTs = ts;
      const dt = Math.min(ts - lastTs, 48);
      lastTs = ts;
      if (!userActive) { elapsed += dt; scheduled(elapsed); }
      raf = requestAnimationFrame(tick);
    }
    render(1, .5, .5);
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      view.removeEventListener("wheel", onWheel as unknown as EventListener);
      root.removeEventListener("keydown", onKeydown as unknown as EventListener);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={`${styles.pvz} is-demo`} ref={rootRef} tabIndex={0}>
        <div className={styles.view} ref={viewRef}>
          <div className={styles.page} ref={pageRef} />
          <div className={styles.dot} ref={dotRef} />
        </div>
        <p className={styles.label} ref={labelRef}>100%</p>
      </div>
    </main>
  );
}
