import { useEffect, useRef } from "react";
import styles from "./PdfViewerDownloadProgressRing.module.scss";

type KeyEvt = { key: string; preventDefault(): void };

export default function PdfViewerDownloadProgressRing() {
  const rootRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<SVGCircleElement>(null);
  const pctRef = useRef<HTMLParagraphElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const checkARef = useRef<SVGLineElement>(null);
  const checkBRef = useRef<SVGLineElement>(null);

  useEffect(() => {
    const root = rootRef.current, fill = fillRef.current, pctEl = pctRef.current;
    const btn = btnRef.current, checkA = checkARef.current, checkB = checkBRef.current;
    if (!root || !fill || !pctEl || !btn || !checkA || !checkB) return;

    const R = 36, CIRC = 2 * Math.PI * R;
    fill.style.strokeDasharray = CIRC.toFixed(2);
    function lineLen(el: SVGLineElement) {
      const x1 = +el.getAttribute("x1")!, y1 = +el.getAttribute("y1")!;
      const x2 = +el.getAttribute("x2")!, y2 = +el.getAttribute("y2")!;
      return Math.hypot(x2 - x1, y2 - y1);
    }
    const lenA = lineLen(checkA), lenB = lineLen(checkB);
    checkA.style.strokeDasharray = lenA.toFixed(2);
    checkB.style.strokeDasharray = lenB.toFixed(2);
    checkA.style.strokeDashoffset = lenA.toFixed(2);
    checkB.style.strokeDashoffset = lenB.toFixed(2);

    const TOTAL_BYTES = 260000;
    const SPEED = 230000;
    const LOOP_MS = 2000;

    let phase: "idle" | "loading" | "done" = "idle", received = 0, doneAt = 0;
    let checkAnim: { start: number } | null = null;

    function render(ratio: number) {
      fill!.style.strokeDashoffset = (CIRC * (1 - ratio)).toFixed(2);
      pctEl!.textContent = Math.round(ratio * 100) + "%";
    }
    function startDownload() {
      if (phase === "loading") return;
      phase = "loading"; received = 0;
      root!.classList.remove(styles.done);
      checkA!.style.strokeDashoffset = lenA.toFixed(2);
      checkB!.style.strokeDashoffset = lenB.toFixed(2);
      btn!.textContent = "받는 중";
      render(0);
    }
    function finish(nowT: number) {
      phase = "done"; doneAt = nowT;
      root!.classList.add(styles.done);
      btn!.textContent = "완료";
      checkAnim = { start: nowT };
    }
    function resetIdle() {
      phase = "idle"; received = 0;
      root!.classList.remove(styles.done);
      btn!.textContent = "다운로드";
      render(0);
    }

    let userActive = false;
    function markActive() { if (!userActive) { userActive = true; root!.classList.remove("is-demo"); } }
    function onClick() { markActive(); if (phase !== "loading") { resetIdle(); startDownload(); } }
    btn.addEventListener("click", onClick);
    function onKeydown(e: KeyEvt) {
      if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
        e.preventDefault(); markActive();
        if (phase !== "loading") { resetIdle(); startDownload(); }
      } else if (e.key === "Escape") {
        e.preventDefault(); markActive(); resetIdle();
      }
    }
    root.addEventListener("keydown", onKeydown as unknown as EventListener);

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { root.classList.remove("is-demo"); userActive = true; render(0.5); }

    const fired: Record<string, boolean> = {};
    const SCHEDULE = [
      { t: 100, run: () => { if (phase === "idle") startDownload(); } }
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
      }
      if (phase === "loading") {
        received = Math.min(TOTAL_BYTES, received + SPEED * (dt / 1000));
        const ratio = received / TOTAL_BYTES;
        render(ratio);
        if (ratio >= 1) finish(ts);
      } else if (phase === "done") {
        if (checkAnim) {
          const pA = Math.max(0, Math.min(1, (ts - checkAnim.start) / 180));
          const pB = Math.max(0, Math.min(1, (ts - checkAnim.start - 110) / 220));
          checkA!.style.strokeDashoffset = (lenA * (1 - pA)).toFixed(2);
          checkB!.style.strokeDashoffset = (lenB * (1 - pB)).toFixed(2);
          if (pB >= 1) checkAnim = null;
        }
        if (ts - doneAt > 620 && !userActive) resetIdle();
      }
      raf = requestAnimationFrame(tick);
    }
    render(0);
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      btn.removeEventListener("click", onClick);
      root.removeEventListener("keydown", onKeydown as unknown as EventListener);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={`${styles.pvg} is-demo`} ref={rootRef} tabIndex={0}>
        <svg className={styles.ring} viewBox="0 0 92 92" width={92} height={92} aria-hidden="true">
          <circle className={styles.track} cx={46} cy={46} r={36} />
          <circle className={styles.fill} ref={fillRef} cx={46} cy={46} r={36} transform="rotate(-90 46 46)" />
          <line className={styles.check} ref={checkARef} x1={28} y1={52} x2={40} y2={64} />
          <line className={styles.check} ref={checkBRef} x1={28} y1={52} x2={64} y2={30} />
        </svg>
        <p className={styles.pct} ref={pctRef}>0%</p>
        <button className={styles.btn} ref={btnRef} type="button">다운로드</button>
      </div>
    </main>
  );
}
