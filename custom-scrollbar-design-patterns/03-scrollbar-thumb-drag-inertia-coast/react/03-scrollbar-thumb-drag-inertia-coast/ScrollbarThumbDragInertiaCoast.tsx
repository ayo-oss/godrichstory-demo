// ScrollbarThumbDragInertiaCoast — vanilla 판(run/411/demo/03-scrollbar-thumb-drag-inertia-coast/index.html) 의 React 포트.
// 핵심: 드래그를 놓는 순간의 속도 값이 SCROLLBAR_INERTIA_DECAY 만큼 매 프레임 줄며 coastStep() 이 더 미끄러뜨린다.
import { useEffect, useRef } from "react";
import styles from "./ScrollbarThumbDragInertiaCoast.module.scss";

type Box<T> = { current: T };

const THUMB_MIN_PX = 26;
const KEY_STEP_PX = 32;
const SCROLLBAR_INERTIA_DECAY = 0.92;
const VEL_EPS = 0.4;
const SIM_KICK_PX = 30;

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export default function ScrollbarThumbDragInertiaCoast() {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const thumbRef = useRef<HTMLDivElement | null>(null);
  const demoRef = useRef<boolean>(true) as Box<boolean>;
  const draggingRef = useRef<boolean>(false) as Box<boolean>;
  const dragStartYRef = useRef<number>(0) as Box<number>;
  const dragStartScrollRef = useRef<number>(0) as Box<number>;
  const lastMoveYRef = useRef<number>(0) as Box<number>;
  const velRef = useRef<number>(0) as Box<number>;

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

    function onScroll(): void { syncThumb(); }

    function onThumbPointerDown(e: PointerEvent): void {
      draggingRef.current = true;
      velRef.current = 0;
      demoRef.current = false;
      dragStartYRef.current = e.clientY;
      lastMoveYRef.current = e.clientY;
      dragStartScrollRef.current = viewport.scrollTop;
      thumb.setPointerCapture(e.pointerId);
    }
    function onThumbPointerMove(e: PointerEvent): void {
      if (!draggingRef.current) return;
      const trackLen = track.clientHeight;
      const thumbLen = thumb.clientHeight;
      const moveRange = Math.max(1, trackLen - thumbLen);
      const scale = maxScroll() / moveRange;
      const frameDeltaPx = (e.clientY - lastMoveYRef.current) * scale;
      velRef.current = frameDeltaPx;
      lastMoveYRef.current = e.clientY;
      const totalDeltaPx = (e.clientY - dragStartYRef.current) * scale;
      viewport.scrollTop = clamp(dragStartScrollRef.current + totalDeltaPx, 0, maxScroll());
    }
    function coastStep(): void {
      if (Math.abs(velRef.current) <= VEL_EPS) { velRef.current = 0; return; }
      velRef.current = velRef.current * SCROLLBAR_INERTIA_DECAY;
      viewport.scrollTop = clamp(viewport.scrollTop + velRef.current, 0, maxScroll());
    }
    function onThumbPointerUp(): void { draggingRef.current = false; }
    function onThumbPointerCancel(): void { draggingRef.current = false; velRef.current = 0; }

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
        velRef.current = 0;
      }
    }

    let startTime: number | null = null;
    let nextKickAt = 0;
    let kickSign = 1;
    let frame = 0;
    function demoTick(now: number): void {
      if (startTime === null) startTime = now;
      const t = (now - startTime) / 1000;
      if (demoRef.current && !draggingRef.current) {
        if (t >= nextKickAt) {
          velRef.current = SIM_KICK_PX * kickSign;
          kickSign = -kickSign;
          nextKickAt = t + 0.9;
        }
      }
      if (!draggingRef.current && velRef.current !== 0) { coastStep(); }
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
        <div className={styles.sb__viewport} ref={viewportRef}>
          <div className={styles.sb__content}>
            {Array.from({ length: 8 }, (_, idx) => idx + 1).map((i) => (
              <div className={styles.sb__card} key={i}>
                <p className={styles.sb__cardTitle}>{"카드 " + i}</p>
                <p className={styles.sb__cardLine}>놓는 순간의 속도 값이 감쇠 계수만큼 매 프레임 줄어듭니다.</p>
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
    </main>
  );
}
