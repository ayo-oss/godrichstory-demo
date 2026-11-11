// ScrollbarBoundaryElasticOvershoot — vanilla 판(run/411/demo/04-scrollbar-boundary-elastic-overshoot/index.html) 의 React 포트.
// 핵심: 트랙 끝에 닿는 순간 BOUNDARY_REBOUND_PX 만큼 더 밀려났다가 springBack() 의 SPRING_DECAY 값으로 튕겨 돌아온다.
import { useEffect, useRef } from "react";
import styles from "./ScrollbarBoundaryElasticOvershoot.module.scss";

type Box<T> = { current: T };

const THUMB_MIN_PX = 26;
const KEY_STEP_PX = 32;
const BOUNDARY_REBOUND_PX = 12;
const SPRING_DECAY = 0.7;
const OVERSHOOT_EPS = 0.3;

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export default function ScrollbarBoundaryElasticOvershoot() {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const thumbRef = useRef<HTMLDivElement | null>(null);
  const demoRef = useRef<boolean>(true) as Box<boolean>;
  const draggingRef = useRef<boolean>(false) as Box<boolean>;
  const dragStartYRef = useRef<number>(0) as Box<number>;
  const dragStartScrollRef = useRef<number>(0) as Box<number>;
  const overshootRef = useRef<number>(0) as Box<number>;

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const viewport = viewportRef.current!;
    const track = trackRef.current!;
    const thumb = thumbRef.current!;
    if (!viewport || !track || !thumb) return;

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

    function onScroll(): void { paintThumb(); }

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
      const moveRange = Math.max(1, trackLen - thumbLen);
      const scale = maxScroll() / moveRange;
      const rawTarget = dragStartScrollRef.current + (e.clientY - dragStartYRef.current) * scale;
      const ms = maxScroll();
      viewport.scrollTop = clamp(rawTarget, 0, ms);
      if (reduce) { overshootRef.current = 0; }
      else if (rawTarget < 0) { overshootRef.current = clamp(rawTarget, -BOUNDARY_REBOUND_PX, 0); }
      else if (rawTarget > ms) { overshootRef.current = clamp(rawTarget - ms, 0, BOUNDARY_REBOUND_PX); }
      else { overshootRef.current = 0; }
      paintThumb();
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

    function springBack(): boolean {
      if (Math.abs(overshootRef.current) <= OVERSHOOT_EPS) { overshootRef.current = 0; return false; }
      overshootRef.current = overshootRef.current * SPRING_DECAY;
      return true;
    }

    let startTime: number | null = null;
    let phaseAt = 0;
    let target: "top" | "bottom" = "bottom";
    let frame = 0;
    function demoTick(now: number): void {
      if (startTime === null) startTime = now;
      const t = (now - startTime) / 1000;
      if (demoRef.current && !draggingRef.current) {
        const cycle = t - phaseAt;
        if (cycle < 0.35) {
          const ms = maxScroll();
          const toward = target === "bottom" ? ms : 0;
          viewport.scrollTop = toward;
          if (cycle > 0.28) {
            overshootRef.current = target === "bottom" ? BOUNDARY_REBOUND_PX : -BOUNDARY_REBOUND_PX;
          }
        } else {
          springBack();
        }
        if (cycle >= 1.0) {
          phaseAt = t;
          target = target === "bottom" ? "top" : "bottom";
        }
      } else if (!draggingRef.current) {
        springBack();
      }
      paintThumb();
      frame = requestAnimationFrame(demoTick);
    }

    viewport.addEventListener("scroll", onScroll);
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
                <p className={styles.sb__cardLine}>트랙 끝에 닿으면 반발 거리 값만큼 밀려났다 튕겨 돌아옵니다.</p>
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
