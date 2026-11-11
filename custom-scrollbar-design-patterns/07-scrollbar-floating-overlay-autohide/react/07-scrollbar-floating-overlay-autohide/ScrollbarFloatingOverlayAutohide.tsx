// ScrollbarFloatingOverlayAutohide — vanilla 판(run/411/demo/07-scrollbar-floating-overlay-autohide/index.html) 의 React 포트.
// 핵심: 스크롤이 멈춘 뒤 경과한 시간 값이 OVERLAY_HIDE_DELAY_MS 를 넘으면 오버레이 트랙의 투명도 값이 OVERLAY_FADE_MS 동안 줄어든다.
import { useEffect, useRef } from "react";
import styles from "./ScrollbarFloatingOverlayAutohide.module.scss";

type Box<T> = { current: T };

const THUMB_MIN_PX = 26;
const KEY_STEP_PX = 32;
const OVERLAY_HIDE_DELAY_MS = 600;
const OVERLAY_FADE_MS = 380;

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export default function ScrollbarFloatingOverlayAutohide() {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const thumbRef = useRef<HTMLDivElement | null>(null);
  const demoRef = useRef<boolean>(true) as Box<boolean>;
  const draggingRef = useRef<boolean>(false) as Box<boolean>;
  const dragStartYRef = useRef<number>(0) as Box<number>;
  const dragStartScrollRef = useRef<number>(0) as Box<number>;
  const scrolledFlagRef = useRef<boolean>(true) as Box<boolean>;

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const viewport = viewportRef.current!;
    const track = trackRef.current!;
    const thumb = thumbRef.current!;
    if (!viewport || !track || !thumb) return;

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

    function onScroll(): void { scrolledFlagRef.current = true; syncThumb(); }

    function onThumbPointerDown(e: PointerEvent): void {
      draggingRef.current = true;
      scrolledFlagRef.current = true;
      demoRef.current = false;
      dragStartYRef.current = e.clientY;
      dragStartScrollRef.current = viewport.scrollTop;
      thumb.setPointerCapture(e.pointerId);
    }
    function onThumbPointerMove(e: PointerEvent): void {
      if (!draggingRef.current) return;
      scrolledFlagRef.current = true;
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
      scrolledFlagRef.current = true;
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
        scrolledFlagRef.current = true;
        demoRef.current = false;
      }
    }

    let startTime: number | null = null;
    let lastActiveT = 0;
    let cycleAt = 0;
    let frame = 0;
    function demoTick(now: number): void {
      if (startTime === null) { startTime = now; lastActiveT = 0; }
      const t = (now - startTime) / 1000;

      if (demoRef.current && !reduce) {
        let cycle = t - cycleAt;
        if (cycle >= 1.0) { cycleAt = t; cycle = 0; }
        if (cycle < 0.15) {
          const phase = cycle / 0.15;
          const cycleIndex = Math.round(cycleAt);
          const goingDown = cycleIndex % 2 === 0;
          const from = goingDown ? 0 : maxScroll();
          const to = goingDown ? maxScroll() : 0;
          viewport.scrollTop = from + (to - from) * phase;
          scrolledFlagRef.current = true;
        }
      }

      if (scrolledFlagRef.current) { lastActiveT = t; scrolledFlagRef.current = false; }
      const elapsedMs = (t - lastActiveT) * 1000;
      let opacity: number;
      if (elapsedMs <= OVERLAY_HIDE_DELAY_MS) {
        opacity = 1;
      } else if (reduce) {
        opacity = 0;
      } else {
        opacity = clamp(1 - (elapsedMs - OVERLAY_HIDE_DELAY_MS) / OVERLAY_FADE_MS, 0, 1);
      }
      track.style.opacity = opacity.toFixed(3);

      frame = requestAnimationFrame(demoTick);
    }

    viewport.addEventListener("scroll", onScroll);
    thumb.addEventListener("pointerdown", onThumbPointerDown);
    thumb.addEventListener("pointermove", onThumbPointerMove);
    thumb.addEventListener("pointerup", onThumbPointerUp);
    thumb.addEventListener("pointercancel", onThumbPointerCancel);
    track.addEventListener("pointerdown", onTrackPointerDown);
    thumb.addEventListener("keydown", onThumbKeyDown);

    syncThumb();
    frame = requestAnimationFrame(demoTick);

    return () => {
      viewport.removeEventListener("scroll", onScroll);
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
                <p className={styles.sb__cardTitle}>{"섹션 " + i}</p>
                <p className={styles.sb__cardLine}>스크롤을 멈춘 뒤 경과한 시간 값이 늘수록 투명도 값이 줄어듭니다.</p>
              </div>
            ))}
          </div>
        </div>
        <div className={styles["sb__track--overlay"]} ref={trackRef}>
          <div
            className={styles.sb__thumb}
            ref={thumbRef}
            role="scrollbar"
            aria-orientation="vertical"
            aria-valuenow={0}
            aria-valuemin={0}
            aria-valuemax={100}
            tabIndex={0}
          />
        </div>
      </div>
    </main>
  );
}
