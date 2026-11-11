import { useEffect, useRef } from "react";
import styles from "./PdfViewerByteProgressLoadBar.module.scss";

type KeyEvt = { key: string; preventDefault(): void };

export default function PdfViewerByteProgressLoadBar() {
  const rootRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);
  const pctRef = useRef<HTMLSpanElement>(null);
  const bytesRef = useRef<HTMLSpanElement>(null);
  const pagesRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const root = rootRef.current, fill = fillRef.current, pctEl = pctRef.current;
    const bytesEl = bytesRef.current, pagesEl = pagesRef.current;
    if (!root || !fill || !pctEl || !bytesEl || !pagesEl) return;

    const TOTAL_BYTES = 480000;
    const TOTAL_PAGES = 12;
    const HOLD_MS = 260;

    function speedCurve(tSec: number) {
      const base = 210000;
      const v = base
        + 90000 * Math.sin(tSec * 2.3)
        + 40000 * Math.sin(tSec * 5.1 + 1.4)
        + 20000 * Math.sin(tSec * 9.7 + 0.6);
      return Math.max(30000, v);
    }

    let received = 0, speedMul = 1, paused = false, holdT = 0;
    function render() {
      const ratio = Math.max(0, Math.min(1, received / TOTAL_BYTES));
      fill!.style.width = (ratio * 100).toFixed(1) + "%";
      pctEl!.textContent = Math.round(ratio * 100) + "%";
      bytesEl!.textContent = Math.round(received / 1000) + " / " + Math.round(TOTAL_BYTES / 1000) + " KB";
      const remain = Math.ceil((1 - ratio) * TOTAL_PAGES);
      pagesEl!.textContent = ratio >= 1 ? "전체 페이지 준비 완료" : ("남은 페이지 " + remain);
    }

    let userActive = false;
    function markActive() { if (!userActive) { userActive = true; root!.classList.remove("is-demo"); } }

    function onKeydown(e: KeyEvt) {
      if (e.key === " " || e.key === "Spacebar") { e.preventDefault(); markActive(); paused = !paused; }
      else if (e.key === "ArrowUp") { e.preventDefault(); markActive(); speedMul = Math.min(4, speedMul * 1.5); }
      else if (e.key === "ArrowDown") { e.preventDefault(); markActive(); speedMul = Math.max(0.25, speedMul / 1.5); }
    }
    function onClick() { markActive(); paused = !paused; }
    root.addEventListener("keydown", onKeydown as unknown as EventListener);
    root.addEventListener("click", onClick);

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { root.classList.remove("is-demo"); userActive = true; received = TOTAL_BYTES * 0.5; render(); }

    let lastTs: number | null = null, raf = 0;
    function tick(ts: number) {
      if (lastTs === null) lastTs = ts;
      const dt = Math.min(ts - lastTs, 48);
      lastTs = ts;
      if (!paused) {
        if (received >= TOTAL_BYTES) {
          holdT += dt;
          if (holdT >= HOLD_MS) { received = 0; holdT = 0; }
        } else {
          const sec = ts / 1000;
          received = Math.min(TOTAL_BYTES, received + speedCurve(sec) * speedMul * (dt / 1000));
        }
        render();
      }
      raf = requestAnimationFrame(tick);
    }
    render();
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      root.removeEventListener("keydown", onKeydown as unknown as EventListener);
      root.removeEventListener("click", onClick);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={`${styles.pvb} is-demo`} ref={rootRef} tabIndex={0} aria-label="다운로드 진행 막대, 스페이스로 정지·화살표로 속도 조절">
        <p className={styles.title}>문서.pdf</p>
        <div className={styles.track}>
          <div className={styles.fill} ref={fillRef} />
        </div>
        <div className={styles.row}>
          <span className={styles.pct} ref={pctRef}>0%</span>
          <span className={styles.bytesTxt} ref={bytesRef}>0 / 0 KB</span>
        </div>
        <p className={styles.pages} ref={pagesRef}>남은 페이지 12</p>
      </div>
    </main>
  );
}
