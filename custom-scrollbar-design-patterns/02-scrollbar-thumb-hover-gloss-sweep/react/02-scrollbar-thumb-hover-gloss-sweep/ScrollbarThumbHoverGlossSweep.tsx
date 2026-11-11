// ScrollbarThumbHoverGlossSweep — vanilla 판(run/411/demo/02-scrollbar-thumb-hover-gloss-sweep/index.html) 의 React 포트.
// 핵심: 포인터가 손잡이에 오르는 순간 광택 위치 값(span)이 GLOSS_SWEEP_MS 동안 한 번 이동한다.
import { useEffect, useRef } from "react";
import styles from "./ScrollbarThumbHoverGlossSweep.module.scss";

type Box<T> = { current: T };

const THUMB_MIN_PX = 26;
const KEY_STEP_PX = 32;
const GLOSS_SWEEP_MS = 520;

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export default function ScrollbarThumbHoverGlossSweep() {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const thumbRef = useRef<HTMLDivElement | null>(null);
  const glossRef = useRef<HTMLSpanElement | null>(null);
  const demoRef = useRef<boolean>(true) as Box<boolean>;
  const draggingRef = useRef<boolean>(false) as Box<boolean>;
  const dragStartYRef = useRef<number>(0) as Box<number>;
  const dragStartScrollRef = useRef<number>(0) as Box<number>;
  const sweepingRef = useRef<boolean>(false) as Box<boolean>;

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const viewport = viewportRef.current!;
    const track = trackRef.current!;
    const thumb = thumbRef.current!;
    const gloss = glossRef.current!;
    if (!viewport || !track || !thumb || !gloss) return;

    function maxScroll(): number {
      return Math.max(0, viewport.scrollHeight - viewport.clientHeight);
    }

    function syncThumb(): void {
      const trackLen = track.clientHeight;
      const total = viewport.scrollHeight;
      const visible = viewport.clientHeight;
      const thumbLen = clamp(trackLen * (visible / total), THUMB_MIN_PX, trackLen);
      const ms = maxScroll();
      const ratio = ms > 0 ? viewport.scrollTop / ms : 0;
      const thumbPos = (trackLen - thumbLen) * ratio;
      thumb.style.height = thumbLen.toFixed(1) + "px";
      thumb.style.transform = "translateY(" + thumbPos.toFixed(1) + "px)";
      thumb.setAttribute("aria-valuenow", String(Math.round(ratio * 100)));
    }

    function triggerGloss(): void {
      if (reduce || sweepingRef.current) return;
      sweepingRef.current = true;
      gloss.classList.add("is-sweeping");
    }
    function onGlossAnimationEnd(): void {
      gloss.classList.remove("is-sweeping");
      sweepingRef.current = false;
    }

    function onScroll(): void { syncThumb(); }
    function onThumbPointerEnter(): void { triggerGloss(); }
    function onThumbFocus(): void { triggerGloss(); }

    function onThumbPointerDown(e: PointerEvent): void {
      draggingRef.current = true;
      demoRef.current = false;
      dragStartYRef.current = e.clientY;
      dragStartScrollRef.current = viewport.scrollTop;
      thumb.setPointerCapture(e.pointerId);
    }
    function onThumbPointerMove(e: PointerEvent): void {
      if (!draggingRef.current) return;
      const trackLen = track.clientHeight;
      const thumbLen = thumb.clientHeight;
      const deltaPx = e.clientY - dragStartYRef.current;
      const moveRange = Math.max(1, trackLen - thumbLen);
      viewport.scrollTop = clamp(dragStartScrollRef.current + deltaPx * (maxScroll() / moveRange), 0, maxScroll());
    }
    function onThumbPointerUp(): void { draggingRef.current = false; }
    function onThumbPointerCancel(): void { draggingRef.current = false; }

    function onTrackPointerDown(e: PointerEvent): void {
      if (e.target !== track) return;
      demoRef.current = false;
      const rect = track.getBoundingClientRect();
      const trackLen = track.clientHeight;
      const thumbLen = thumb.clientHeight;
      const clickPos = clamp(e.clientY - rect.top - thumbLen / 2, 0, trackLen - thumbLen);
      const ratio = (trackLen - thumbLen) > 0 ? clickPos / (trackLen - thumbLen) : 0;
      viewport.scrollTop = ratio * maxScroll();
    }

    function onThumbKeyDown(e: KeyboardEvent): void {
      const ms = maxScroll();
      if (e.key === "ArrowDown") { viewport.scrollTop = clamp(viewport.scrollTop + KEY_STEP_PX, 0, ms); e.preventDefault(); }
      else if (e.key === "ArrowUp") { viewport.scrollTop = clamp(viewport.scrollTop - KEY_STEP_PX, 0, ms); e.preventDefault(); }
      else if (e.key === "PageDown") { viewport.scrollTop = clamp(viewport.scrollTop + viewport.clientHeight, 0, ms); e.preventDefault(); }
      else if (e.key === "PageUp") { viewport.scrollTop = clamp(viewport.scrollTop - viewport.clientHeight, 0, ms); e.preventDefault(); }
      else if (e.key === "Home") { viewport.scrollTop = 0; e.preventDefault(); }
      else if (e.key === "End") { viewport.scrollTop = ms; e.preventDefault(); }
      if (e.key.indexOf("Arrow") === 0 || e.key === "PageDown" || e.key === "PageUp" || e.key === "Home" || e.key === "End") {
        demoRef.current = false;
      }
    }

    let startTime: number | null = null;
    let lastSweepAt = -10;
    let frame = 0;
    function demoTick(now: number): void {
      if (startTime === null) startTime = now;
      const t = (now - startTime) / 1000;
      if (demoRef.current) {
        const phase = (Math.sin(t * Math.PI) + 1) / 2;
        viewport.scrollTop = phase * maxScroll();
        if (t - lastSweepAt >= 0.85) { triggerGloss(); lastSweepAt = t; }
      }
      frame = requestAnimationFrame(demoTick);
    }

    viewport.addEventListener("scroll", onScroll);
    thumb.addEventListener("pointerenter", onThumbPointerEnter);
    thumb.addEventListener("focus", onThumbFocus);
    gloss.addEventListener("animationend", onGlossAnimationEnd);
    thumb.addEventListener("pointerdown", onThumbPointerDown);
    thumb.addEventListener("pointermove", onThumbPointerMove);
    thumb.addEventListener("pointerup", onThumbPointerUp);
    thumb.addEventListener("pointercancel", onThumbPointerCancel);
    track.addEventListener("pointerdown", onTrackPointerDown);
    thumb.addEventListener("keydown", onThumbKeyDown);

    syncThumb();
    if (!reduce) { frame = requestAnimationFrame(demoTick); }

    return () => {
      viewport.removeEventListener("scroll", onScroll);
      thumb.removeEventListener("pointerenter", onThumbPointerEnter);
      thumb.removeEventListener("focus", onThumbFocus);
      gloss.removeEventListener("animationend", onGlossAnimationEnd);
      thumb.removeEventListener("pointerdown", onThumbPointerDown);
      thumb.removeEventListener("pointermove", onThumbPointerMove);
      thumb.removeEventListener("pointerup", onThumbPointerUp);
      thumb.removeEventListener("pointercancel", onThumbPointerCancel);
      track.removeEventListener("pointerdown", onTrackPointerDown);
      thumb.removeEventListener("keydown", onThumbKeyDown);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.sb}>
        <div className={styles.sb__viewport} ref={viewportRef}>
          <div className={styles.sb__content}>
            {Array.from({ length: 8 }, (_, idx) => idx + 1).map((i) => (
              <div className={styles.sb__card} key={i}>
                <p className={styles.sb__cardTitle}>{"메뉴 " + i}</p>
                <p className={styles.sb__cardLine}>포인터가 손잡이에 오르면 광택 위치 값이 한 번 이동합니다.</p>
              </div>
            ))}
          </div>
        </div>
        <div className={styles.sb__track} ref={trackRef}>
          <div
            className={styles.sb__thumb}
            ref={thumbRef}
            role="scrollbar"
            aria-orientation="vertical"
            aria-valuenow={0}
            aria-valuemin={0}
            aria-valuemax={100}
            tabIndex={0}
          >
            <span className={styles.sb__thumbGloss} ref={glossRef} />
          </div>
        </div>
      </div>
    </main>
  );
}
