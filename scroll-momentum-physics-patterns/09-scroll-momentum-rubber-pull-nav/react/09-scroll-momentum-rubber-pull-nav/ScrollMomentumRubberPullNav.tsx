import { useEffect, useRef } from "react";
import styles from "./ScrollMomentumRubberPullNav.module.scss";

export type ScrollMomentumRubberPullNavProps = {
  color?: string;
};

export default function ScrollMomentumRubberPullNav({
  color = "#2f6df6",
}: ScrollMomentumRubberPullNavProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const viewport = root.querySelector<HTMLDivElement>(`.${styles.viewport}`);
    const track = root.querySelector<HTMLDivElement>(`.${styles.track}`);
    const nav = root.querySelector<HTMLDivElement>(`.${styles.nav}`);
    if (!viewport || !track || !nav) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // 계산 겹 ①: 목록은 입력에 1:1 로 즉시 따라간다(scrollPos, 경계 clamp).
    const rowH = 40, rowCount = 6;
    const maxScroll = Math.max(0, rowH * rowCount - viewport.clientHeight);
    let scrollPos = 0;
    let lastVel = 0;

    // 계산 겹 ②: 스크롤 속도(vel)의 부호가 바뀌는 순간(방향 전환)에만 네비 바에 충격을 주고,
    // 그 뒤엔 스프링 적분(SPRING_K·SPRING_C)이 scale 을 1로 되돌리며 튕긴다 — 경계에 닿아서가 아니다.
    const MIN_VEL = 1.2;
    const KICK = 0.4;
    const SPRING_K = 260;
    const SPRING_C = 14;
    let navScale = 1, navVel = 0;
    let navRaf: number | null = null;

    function paintTrack() { track!.style.transform = "translateY(-" + scrollPos.toFixed(1) + "px)"; }
    function paintNav() { nav!.style.transform = "scaleY(" + navScale.toFixed(3) + ")"; }
    function navTick() {
      const force = -SPRING_K * (navScale - 1) - SPRING_C * navVel;
      navVel += force * 0.016;
      navScale += navVel * 0.016;
      if (reduce) { navScale = 1; navVel = 0; paintNav(); navRaf = null; return; }
      if (Math.abs(navScale - 1) < 0.003 && Math.abs(navVel) < 0.02) {
        navScale = 1; navVel = 0; paintNav(); navRaf = null; return;
      }
      paintNav();
      navRaf = requestAnimationFrame(navTick);
    }
    function ensureNavLoop() { if (navRaf === null) navRaf = requestAnimationFrame(navTick); }
    function kickNav(sign: number) {
      if (reduce) return;
      navVel += sign * KICK;
      ensureNavLoop();
    }
    function applyVel(vel: number) {
      if (lastVel !== 0 && vel !== 0 && (lastVel > 0) !== (vel > 0) && Math.abs(lastVel) > MIN_VEL && Math.abs(vel) > MIN_VEL) {
        kickNav(vel > 0 ? 1 : -1);
      }
      if (Math.abs(vel) > 0.1) lastVel = vel;
    }
    function setScroll(v: number, vel: number) {
      const next = Math.max(0, Math.min(maxScroll, v));
      applyVel(vel);
      scrollPos = next;
      paintTrack();
    }
    paintTrack(); paintNav();

    function onWheel(e: WheelEvent) {
      e.preventDefault();
      stopAutoplay();
      setScroll(scrollPos + e.deltaY, e.deltaY);
    }
    let dragging = false, lastY = 0;
    function onPointerDown(e: PointerEvent) {
      stopAutoplay();
      dragging = true; lastY = e.clientY;
      viewport!.setPointerCapture(e.pointerId);
    }
    function onPointerMove(e: PointerEvent) {
      if (!dragging) return;
      const dy = -(e.clientY - lastY);
      setScroll(scrollPos + dy, dy);
      lastY = e.clientY;
    }
    function onPointerUp() { dragging = false; }
    function onKeydown(e: KeyboardEvent) {
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
      stopAutoplay();
      const dy = e.key === "ArrowDown" ? 40 : -40;
      setScroll(scrollPos + dy, dy);
    }
    viewport.addEventListener("wheel", onWheel, { passive: false });
    viewport.addEventListener("pointerdown", onPointerDown);
    viewport.addEventListener("pointermove", onPointerMove);
    viewport.addEventListener("pointerup", onPointerUp);
    viewport.addEventListener("keydown", onKeydown);

    let autoTimer: number | null = null, phase = 0;
    function autoTick() {
      phase += 1;
      const dir = phase % 2 === 0 ? -1 : 1;
      setScroll(scrollPos + dir * 60, dir * 60);
    }
    function stopAutoplay() { if (autoTimer !== null) { window.clearInterval(autoTimer); autoTimer = null; } }
    if (!reduce) { autoTimer = window.setInterval(autoTick, 900); autoTick(); }

    return () => {
      stopAutoplay();
      if (navRaf !== null) cancelAnimationFrame(navRaf);
      viewport.removeEventListener("wheel", onWheel);
      viewport.removeEventListener("pointerdown", onPointerDown);
      viewport.removeEventListener("pointermove", onPointerMove);
      viewport.removeEventListener("pointerup", onPointerUp);
      viewport.removeEventListener("keydown", onKeydown);
    };
  }, []);

  const rows = [1, 2, 3, 4, 5, 6];

  return (
    <div ref={rootRef} className={styles.stage}>
      <div className={styles.rpn}>
        <div className={styles.frame}>
          <div className={styles.nav} style={{ background: color }}><span>구간 안내</span></div>
          <div className={styles.viewport} role="application" aria-label="방향 전환 러버 네비 실험판" tabIndex={0}>
            <div className={styles.track}>
              {rows.map((n) => (
                <div key={n} className={styles.row}>섹션 {n}</div>
              ))}
            </div>
          </div>
        </div>
        <p className={styles.hint}>스크롤 방향을 바꾸는 순간마다 위 네비 바가 고무줄처럼 튕깁니다</p>
      </div>
    </div>
  );
}
