// ScrollbarThumbRatioProgressBadge — vanilla 판(run/411/demo/08-scrollbar-thumb-ratio-progress-badge/index.html) 의 React 포트.
// 핵심: lengthRatio(visible/total) 값이 손잡이 길이 값에, scrollRatio 값이 배지의 "남은 분량" 문구로 같은 비율의 두 표현이 된다.
import { useEffect, useRef } from "react";
import styles from "./ScrollbarThumbRatioProgressBadge.module.scss";

type Box<T> = { current: T };

const THUMB_MIN_PX = 26;
const KEY_STEP_PX = 32;

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export default function ScrollbarThumbRatioProgressBadge() {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const thumbRef = useRef<HTMLDivElement | null>(null);
  const badgeRef = useRef<HTMLParagraphElement | null>(null);
  const demoRef = useRef<boolean>(true) as Box<boolean>;
  const draggingRef = useRef<boolean>(false) as Box<boolean>;
  const dragStartYRef = useRef<number>(0) as Box<number>;
  const dragStartScrollRef = useRef<number>(0) as Box<number>;

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const viewport = viewportRef.current!;
    const track = trackRef.current!;
    const thumb = thumbRef.current!;
    const badge = badgeRef.current!;
    if (!viewport || !track || !thumb || !badge) return;

    function maxScroll(): number {
      return Math.max(0, viewport.scrollHeight - viewport.clientHeight);
    }

    function syncThumb(): void {
      const trackLen = track.clientHeight;
      const total = viewport.scrollHeight;
      const visible = viewport.clientHeight;
      const lengthRatio = clamp(visible / total, 0, 1);
      const thumbLen = clamp(trackLen * lengthRatio, THUMB_MIN_PX, trackLen);
      const ms = maxScroll();
      const scrollRatio = ms > 0 ? viewport.scrollTop / ms : 0;
      const thumbPos = (trackLen - thumbLen) * scrollRatio;
      thumb.style.height = thumbLen.toFixed(1) + "px";
      thumb.style.transform = "translateY(" + thumbPos.toFixed(1) + "px)";
      thumb.setAttribute("aria-valuenow", String(Math.round(scrollRatio * 100)));
      const remaining = Math.round((1 - scrollRatio) * 100);
      badge.textContent = "남은 분량 " + clamp(remaining, 0, 100) + "%";
    }

    function onScroll(): void { syncThumb(); }

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
    let frame = 0;
    function demoTick(now: number): void {
      if (startTime === null) startTime = now;
      const t = (now - startTime) / 1000;
      if (demoRef.current) {
        const phase = (Math.sin(t * Math.PI) + 1) / 2;
        viewport.scrollTop = phase * maxScroll();
      }
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
    if (!reduce) { frame = requestAnimationFrame(demoTick); }

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
        <p className={styles.sb__badge} ref={badgeRef}>남은 분량 100%</p>
        <div className={styles.sb__row}>
          <div className={styles.sb__viewport} ref={viewportRef}>
            <div className={styles.sb__content}>
              {Array.from({ length: 8 }, (_, idx) => idx + 1).map((i) => (
                <div className={styles.sb__card} key={i}>
                  <p className={styles.sb__cardTitle}>{"설정 " + i}</p>
                  <p className={styles.sb__cardLine}>전체 높이와 보이는 영역의 비율 값이 손잡이 길이 값 그대로다.</p>
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
            />
          </div>
        </div>
      </div>
    </main>
  );
}
