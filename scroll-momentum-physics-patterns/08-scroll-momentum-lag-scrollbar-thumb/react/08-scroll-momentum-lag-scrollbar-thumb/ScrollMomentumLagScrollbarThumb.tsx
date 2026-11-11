import { useEffect, useRef } from "react";
import styles from "./ScrollMomentumLagScrollbarThumb.module.scss";

export type ScrollMomentumLagScrollbarThumbProps = {
  color?: string;
};

export default function ScrollMomentumLagScrollbarThumb({
  color = "#6ec8ff",
}: ScrollMomentumLagScrollbarThumbProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const viewport = root.querySelector<HTMLDivElement>(`.${styles.viewport}`);
    const track = root.querySelector<HTMLDivElement>(`.${styles.track}`);
    const rail = root.querySelector<HTMLDivElement>(`.${styles.rail}`);
    const thumb = root.querySelector<HTMLDivElement>(`.${styles.thumb}`);
    if (!viewport || !track || !rail || !thumb) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // 계산 겹: 목록 내용은 입력에 1:1 로 즉시 따라가지만(scrollPos), 손잡이 위치(thumbY)는
    // 목표값(targetThumbY)을 매 프레임 LAG 만큼만 따라잡는 지수 보간(lerp)이라 항상 한 박자 늦게 도착한다.
    const LAG = 0.15;
    const SNAP_EPS = 0.3;
    const rowH = 40, rowCount = 8;
    const maxScroll = Math.max(0, rowH * rowCount - viewport.clientHeight);
    let scrollPos = 0;
    let thumbY = 0;
    let raf: number | null = null;

    // BD19 — 막대·손잡이 실측 픽셀은 getBoundingClientRect 로 잰다(짐작값 금지).
    const railRect = rail.getBoundingClientRect();
    const railH = railRect.height;
    const thumbH = Math.max(28, railH * (viewport.clientHeight / (rowH * rowCount)));
    thumb.style.height = thumbH.toFixed(1) + "px";

    function paintTrack() { track!.style.transform = "translateY(-" + scrollPos.toFixed(1) + "px)"; }
    function targetThumbY() { return maxScroll <= 0 ? 0 : (scrollPos / maxScroll) * (railH - thumbH); }
    function paintThumb() { thumb!.style.transform = "translateY(" + thumbY.toFixed(1) + "px)"; }
    function loopTick() {
      const target = targetThumbY();
      if (reduce) { thumbY = target; paintThumb(); raf = null; return; }
      thumbY += (target - thumbY) * LAG;
      if (Math.abs(target - thumbY) < SNAP_EPS) { thumbY = target; paintThumb(); raf = null; return; }
      paintThumb();
      raf = requestAnimationFrame(loopTick);
    }
    function ensureLoop() { if (raf === null) raf = requestAnimationFrame(loopTick); }
    function setScroll(v: number) {
      scrollPos = Math.max(0, Math.min(maxScroll, v));
      paintTrack();
      ensureLoop();
    }
    paintTrack(); paintThumb();

    function onWheel(e: WheelEvent) {
      e.preventDefault();
      stopAutoplay();
      setScroll(scrollPos + e.deltaY);
    }
    let dragging = false, lastY = 0;
    function onPointerDown(e: PointerEvent) {
      stopAutoplay();
      dragging = true; lastY = e.clientY;
      viewport!.setPointerCapture(e.pointerId);
    }
    function onPointerMove(e: PointerEvent) {
      if (!dragging) return;
      setScroll(scrollPos - (e.clientY - lastY));
      lastY = e.clientY;
    }
    function onPointerUp() { dragging = false; }
    function onKeydown(e: KeyboardEvent) {
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
      stopAutoplay();
      setScroll(scrollPos + (e.key === "ArrowDown" ? 40 : -40));
    }
    viewport.addEventListener("wheel", onWheel, { passive: false });
    viewport.addEventListener("pointerdown", onPointerDown);
    viewport.addEventListener("pointermove", onPointerMove);
    viewport.addEventListener("pointerup", onPointerUp);
    viewport.addEventListener("keydown", onKeydown);

    let autoTimer: number | null = null, phase = 0;
    function autoTick() { phase += 1; setScroll(phase % 2 === 0 ? 0 : maxScroll); }
    function stopAutoplay() { if (autoTimer !== null) { window.clearInterval(autoTimer); autoTimer = null; } }
    if (!reduce) { autoTimer = window.setInterval(autoTick, 1500); autoTick(); }

    return () => {
      stopAutoplay();
      if (raf !== null) cancelAnimationFrame(raf);
      viewport.removeEventListener("wheel", onWheel);
      viewport.removeEventListener("pointerdown", onPointerDown);
      viewport.removeEventListener("pointermove", onPointerMove);
      viewport.removeEventListener("pointerup", onPointerUp);
      viewport.removeEventListener("keydown", onKeydown);
    };
  }, []);

  const rows = [1, 2, 3, 4, 5, 6, 7, 8];

  return (
    <div ref={rootRef} className={styles.stage}>
      <div className={styles.lst}>
        <div className={styles.viewport} role="application" aria-label="지연 스크롤바 실험판" tabIndex={0}>
          <div className={styles.track}>
            {rows.map((n) => (
              <div key={n} className={styles.row}>행 {n}</div>
            ))}
          </div>
          <div className={styles.rail}>
            <div className={styles.thumb} style={{ background: color }} />
          </div>
        </div>
        <p className={styles.hint}>스크롤하면 목록은 바로 따라가고, 막대 손잡이는 뒤처졌다 서서히 따라붙습니다</p>
      </div>
    </div>
  );
}
