// ScrollbarHorizontalTrackGallery — vanilla 판(run/411/demo/06-scrollbar-horizontal-track-gallery/index.html) 의 React 포트.
// 핵심: 가로로 나열된 카드 개수 값(CARD_COUNT)에서 나온 scrollWidth 로 트랙 대비 손잡이 길이 비율이 계산된다.
import { useEffect, useRef } from "react";
import styles from "./ScrollbarHorizontalTrackGallery.module.scss";

type Box<T> = { current: T };

const THUMB_MIN_PX = 30;
const KEY_STEP_PX = 60;
const CARD_COUNT = 6;

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export default function ScrollbarHorizontalTrackGallery() {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const thumbRef = useRef<HTMLDivElement | null>(null);
  const demoRef = useRef<boolean>(true) as Box<boolean>;
  const draggingRef = useRef<boolean>(false) as Box<boolean>;
  const dragStartXRef = useRef<number>(0) as Box<number>;
  const dragStartScrollRef = useRef<number>(0) as Box<number>;

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const viewport = viewportRef.current!;
    const track = trackRef.current!;
    const thumb = thumbRef.current!;
    if (!viewport || !track || !thumb) return;

    function maxScrollX(): number {
      return Math.max(0, viewport.scrollWidth - viewport.clientWidth);
    }

    function syncThumbX(): void {
      const trackLen = track.clientWidth;
      const total = viewport.scrollWidth;
      const visible = viewport.clientWidth;
      const thumbLen = clamp(trackLen * (visible / total), THUMB_MIN_PX, trackLen);
      const ms = maxScrollX();
      const ratio = ms > 0 ? viewport.scrollLeft / ms : 0;
      const thumbPos = (trackLen - thumbLen) * ratio;
      thumb.style.width = thumbLen.toFixed(1) + "px";
      thumb.style.transform = "translateX(" + thumbPos.toFixed(1) + "px)";
      thumb.setAttribute("aria-valuenow", String(Math.round(ratio * 100)));
    }

    function onScroll(): void { syncThumbX(); }

    function onThumbPointerDown(e: PointerEvent): void {
      draggingRef.current = true;
      demoRef.current = false;
      dragStartXRef.current = e.clientX;
      dragStartScrollRef.current = viewport.scrollLeft;
      thumb.setPointerCapture(e.pointerId);
    }
    function onThumbPointerMove(e: PointerEvent): void {
      if (!draggingRef.current) return;
      const trackLen = track.clientWidth;
      const thumbLen = thumb.clientWidth;
      const deltaPx = e.clientX - dragStartXRef.current;
      const moveRange = Math.max(1, trackLen - thumbLen);
      viewport.scrollLeft = clamp(dragStartScrollRef.current + deltaPx * (maxScrollX() / moveRange), 0, maxScrollX());
    }
    function onThumbPointerUp(): void { draggingRef.current = false; }
    function onThumbPointerCancel(): void { draggingRef.current = false; }

    function onTrackPointerDown(e: PointerEvent): void {
      if (e.target !== track) return;
      demoRef.current = false;
      const rect = track.getBoundingClientRect();
      const trackLen = track.clientWidth;
      const thumbLen = thumb.clientWidth;
      const clickPos = clamp(e.clientX - rect.left - thumbLen / 2, 0, trackLen - thumbLen);
      const ratio = (trackLen - thumbLen) > 0 ? clickPos / (trackLen - thumbLen) : 0;
      viewport.scrollLeft = ratio * maxScrollX();
    }

    function onThumbKeyDown(e: KeyboardEvent): void {
      const ms = maxScrollX();
      if (e.key === "ArrowRight") { viewport.scrollLeft = clamp(viewport.scrollLeft + KEY_STEP_PX, 0, ms); e.preventDefault(); }
      else if (e.key === "ArrowLeft") { viewport.scrollLeft = clamp(viewport.scrollLeft - KEY_STEP_PX, 0, ms); e.preventDefault(); }
      else if (e.key === "PageDown") { viewport.scrollLeft = clamp(viewport.scrollLeft + viewport.clientWidth, 0, ms); e.preventDefault(); }
      else if (e.key === "PageUp") { viewport.scrollLeft = clamp(viewport.scrollLeft - viewport.clientWidth, 0, ms); e.preventDefault(); }
      else if (e.key === "Home") { viewport.scrollLeft = 0; e.preventDefault(); }
      else if (e.key === "End") { viewport.scrollLeft = ms; e.preventDefault(); }
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
        viewport.scrollLeft = phase * maxScrollX();
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

    syncThumbX();
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
        <div className={styles.sb__viewport} ref={viewportRef}>
          <div className={styles.sb__content}>
            {Array.from({ length: CARD_COUNT }, (_, idx) => idx + 1).map((i) => (
              <div className={styles.sb__card} key={i}>
                <p className={styles.sb__cardTitle}>{"상품 " + i}</p>
                <p className={styles.sb__cardLine}>카드 개수 값</p>
              </div>
            ))}
          </div>
        </div>
        <div className={styles.sb__track} ref={trackRef}>
          <div
            className={styles.sb__thumb}
            ref={thumbRef}
            role="scrollbar"
            aria-orientation="horizontal"
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
