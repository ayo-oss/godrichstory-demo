// ScrollbarHeroScene — vanilla 판(run/411/demo/09-scrollbar-hero-scene/index.html) 의 React 포트.
// 핵심: 02 의 광택 위치 값 · 03 의 관성 감쇠 값(SCROLLBAR_INERTIA_DECAY) · 04 의 경계 반발 값(BOUNDARY_REBOUND_PX) 을 손잡이 하나에 겹친다.
import { useEffect, useRef } from "react";
import styles from "./ScrollbarHeroScene.module.scss";

type Box<T> = { current: T };

const THUMB_MIN_PX = 26;
const KEY_STEP_PX = 32;
const SCROLLBAR_INERTIA_DECAY = 0.92;
const VEL_EPS = 0.4;
const SIM_KICK_PX = 34;
const BOUNDARY_REBOUND_PX = 12;
const SPRING_DECAY = 0.7;
const OVERSHOOT_EPS = 0.3;
const GLOSS_SWEEP_MS = 520;

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export default function ScrollbarHeroScene() {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const thumbRef = useRef<HTMLDivElement | null>(null);
  const glossRef = useRef<HTMLSpanElement | null>(null);
  const demoRef = useRef<boolean>(true) as Box<boolean>;
  const draggingRef = useRef<boolean>(false) as Box<boolean>;
  const dragStartYRef = useRef<number>(0) as Box<number>;
  const dragStartScrollRef = useRef<number>(0) as Box<number>;
  const lastMoveYRef = useRef<number>(0) as Box<number>;
  const velRef = useRef<number>(0) as Box<number>;
  const overshootRef = useRef<number>(0) as Box<number>;
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

    function paintThumb(): void {
      const trackLen = track.clientHeight;
      const total = viewport.scrollHeight;
      const visible = viewport.clientHeight;
      const thumbLen = clamp(trackLen * (visible / total), THUMB_MIN_PX, trackLen);
      const ms = maxScroll();
      const ratio = ms > 0 ? viewport.scrollTop / ms : 0;
      const thumbPos = (trackLen - thumbLen) * ratio + overshootRef.current;
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

    function onScroll(): void { paintThumb(); }
    function onThumbPointerEnter(): void { triggerGloss(); }
    function onThumbFocus(): void { triggerGloss(); }

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
      const rawTarget = dragStartScrollRef.current + (e.clientY - dragStartYRef.current) * scale;
      const ms = maxScroll();
      viewport.scrollTop = clamp(rawTarget, 0, ms);
      if (reduce) { overshootRef.current = 0; }
      else if (rawTarget < 0) { overshootRef.current = clamp(rawTarget, -BOUNDARY_REBOUND_PX, 0); }
      else if (rawTarget > ms) { overshootRef.current = clamp(rawTarget - ms, 0, BOUNDARY_REBOUND_PX); }
      else { overshootRef.current = 0; }
      paintThumb();
    }
    function coastStep(): void {
      if (Math.abs(velRef.current) <= VEL_EPS) { velRef.current = 0; return; }
      velRef.current = velRef.current * SCROLLBAR_INERTIA_DECAY;
      const ms = maxScroll();
      const next = viewport.scrollTop + velRef.current;
      if (!reduce && (next < 0 || next > ms)) {
        overshootRef.current = next < 0 ? clamp(next, -BOUNDARY_REBOUND_PX, 0) : clamp(next - ms, 0, BOUNDARY_REBOUND_PX);
      }
      viewport.scrollTop = clamp(next, 0, ms);
    }
    function springBack(): void {
      if (Math.abs(overshootRef.current) <= OVERSHOOT_EPS) { overshootRef.current = 0; return; }
      overshootRef.current = overshootRef.current * SPRING_DECAY;
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
    let lastSweepAt = -10;
    let frame = 0;
    function demoTick(now: number): void {
      if (startTime === null) { startTime = now; }
      const t = (now - startTime) / 1000;
      if (demoRef.current && !draggingRef.current) {
        if (t >= nextKickAt) {
          velRef.current = SIM_KICK_PX * kickSign;
          kickSign = -kickSign;
          nextKickAt = t + 0.85;
          triggerGloss();
        }
        if (t - lastSweepAt >= 0.85) { lastSweepAt = t; }
      }
      if (!draggingRef.current) {
        if (velRef.current !== 0) { coastStep(); }
        else if (overshootRef.current !== 0) { springBack(); }
      }
      paintThumb();
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

    paintThumb();
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
                <p className={styles.sb__cardTitle}>{"장면 " + i}</p>
                <p className={styles.sb__cardLine}>광택 값·관성 값·반발 값이 손잡이 하나 위에서 함께 반응합니다.</p>
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
