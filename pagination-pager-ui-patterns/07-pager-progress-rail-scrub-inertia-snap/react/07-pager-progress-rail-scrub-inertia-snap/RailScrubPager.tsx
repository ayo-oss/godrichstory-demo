// RailScrubPager — vanilla 판(07-pager-progress-rail-scrub-inertia-snap) 의 React 포트.
// 놓는 순간의 속도로 관성 미끄러짐(FRICTION)을 계산하고, 느려지면 가장 가까운 쪽 눈금으로 지수 보간해 붙는다.
import { useEffect, useRef } from "react";
import styles from "./RailScrubPager.module.scss";

type Box<T> = { current: T };
type Mode = "idle" | "drag" | "glide" | "snap";

const TOTAL_PAGES = 24;
const RAIL_W = 240;
const FRICTION = 3.4;
const SNAP_SPEED = 150;
const SNAP_RATE = 16;
const VELOCITY_BLEND = 0.4;
const TILT_GAIN = 0.014;
const TILT_MAX = 16;
const CYCLE_MS = 2700;
const TONES = ["is-mint", "is-lilac", "is-pink", "is-sky"];

const tickX = (page: number): number => ((page - 1) / (TOTAL_PAGES - 1)) * RAIL_W;
const nearestPage = (px: number): number => Math.max(1, Math.min(TOTAL_PAGES, Math.round((px / RAIL_W) * (TOTAL_PAGES - 1)) + 1));

export default function RailScrubPager() {
  const rootRef = useRef<HTMLDivElement | null>(null) as Box<HTMLDivElement | null>;
  const railRef = useRef<HTMLDivElement | null>(null) as Box<HTMLDivElement | null>;
  const fillRef = useRef<HTMLDivElement | null>(null) as Box<HTMLDivElement | null>;
  const thumbRef = useRef<HTMLDivElement | null>(null) as Box<HTMLDivElement | null>;
  const bubbleRef = useRef<HTMLSpanElement | null>(null) as Box<HTMLSpanElement | null>;
  const cardRef = useRef<HTMLDivElement | null>(null) as Box<HTMLDivElement | null>;
  const noRef = useRef<HTMLElement | null>(null) as Box<HTMLElement | null>;
  const speedRef = useRef<HTMLElement | null>(null) as Box<HTMLElement | null>;
  const srRef = useRef<HTMLParagraphElement | null>(null) as Box<HTMLParagraphElement | null>;

  useEffect(() => {
    const root = rootRef.current;
    const rail = railRef.current;
    const fill = fillRef.current;
    const thumb = thumbRef.current;
    const bubble = bubbleRef.current;
    const card = cardRef.current;
    const noEl = noRef.current;
    const speedEl = speedRef.current;
    const sr = srRef.current;
    if (!root || !rail || !fill || !thumb || !bubble || !card || !noEl || !speedEl || !sr) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let demo = true;
    let x = 0;
    let v = 0;
    let mode: Mode = "idle";
    let lastX = 0;
    let lastMoveTs = 0;
    let page = 1;
    let snapTo = 0;
    let t0: number | null = null;
    let lastTs: number | null = null;
    let cycleBase = 0;
    let demoStage = 0;
    let dragFrom = 0;
    let raf = 0;
    const perfNow = (): number => (t0 === null ? 0 : performance.now() - t0);

    function setPage(p: number, announce: boolean): void {
      if (p === page) return;
      page = p;
      noEl!.textContent = String(p);
      bubble!.textContent = String(p);
      thumb!.setAttribute("aria-valuenow", String(p));
      card!.className = [styles.pg__card, styles[TONES[p % TONES.length]]].join(" ");
      if (announce) sr!.textContent = "현재 " + p + " / " + TOTAL_PAGES;
    }

    function pointerMove(px: number, now: number): void {
      const nx = Math.max(0, Math.min(RAIL_W, px));
      const dt = Math.max(0.004, (now - lastMoveTs) / 1000);
      const inst = (nx - lastX) / dt;
      v = v * (1 - VELOCITY_BLEND) + inst * VELOCITY_BLEND;
      lastX = nx;
      lastMoveTs = now;
      x = nx;
      mode = "drag";
    }

    function release(): void {
      if (mode !== "drag") return;
      if (reduce) { x = tickX(nearestPage(x)); v = 0; mode = "idle"; return; }
      mode = "glide";
    }

    const localX = (e: PointerEvent): number => e.clientX - rail.getBoundingClientRect().left;
    const onDown = (e: PointerEvent): void => {
      demo = false;
      try { rail.setPointerCapture(e.pointerId); } catch (err) { /* 무시 */ }
      lastX = x;
      lastMoveTs = perfNow();
      v = 0;
      pointerMove(localX(e), perfNow());
    };
    const onMove = (e: PointerEvent): void => { if (mode === "drag") pointerMove(localX(e), perfNow()); };
    const onKey = (e: KeyboardEvent): void => {
      let p = page;
      if (e.key === "ArrowRight" || e.key === "ArrowUp") p += 1;
      else if (e.key === "ArrowLeft" || e.key === "ArrowDown") p -= 1;
      else if (e.key === "PageUp") p += 5;
      else if (e.key === "PageDown") p -= 5;
      else if (e.key === "Home") p = 1;
      else if (e.key === "End") p = TOTAL_PAGES;
      else return;
      e.preventDefault();
      demo = false;
      p = Math.max(1, Math.min(TOTAL_PAGES, p));
      v = 0;
      snapTo = tickX(p);
      mode = reduce ? "idle" : "snap";
      if (reduce) x = snapTo;
      setPage(p, true);
    };
    rail.addEventListener("pointerdown", onDown);
    rail.addEventListener("pointermove", onMove);
    rail.addEventListener("pointerup", release);
    rail.addEventListener("pointercancel", release);
    thumb.addEventListener("keydown", onKey);

    function demoDrive(now: number): void {
      const t = now - cycleBase;
      if (t >= CYCLE_MS) { cycleBase = now; demoStage = 0; x = 0; v = 0; mode = "idle"; setPage(1, false); return; }
      if (t >= 100 && t < 450) {
        const p1 = (t - 100) / 350;
        if (mode !== "drag") { lastX = x; lastMoveTs = now; v = 0; }
        pointerMove(80 * p1 * p1, now);
        demoStage = 1;
      } else if (demoStage === 1 && t >= 450) {
        release();
        demoStage = 2;
      } else if (t >= 900 && t < 1240) {
        if (demoStage < 3) { demoStage = 3; lastX = x; lastMoveTs = now; v = 0; mode = "drag"; dragFrom = x; }
        const p2 = (t - 900) / 340;
        pointerMove(dragFrom - 120 * p2 * p2, now);
      } else if (demoStage === 3 && t >= 1240) {
        release();
        demoStage = 4;
      }
    }

    function paintStatic(): void {
      thumb!.style.transform = "translateX(" + x.toFixed(2) + "px)";
      fill!.style.transform = "scaleX(" + (x / RAIL_W).toFixed(4) + ")";
    }

    function tick(ts: number): void {
      if (t0 === null) t0 = ts;
      const now = ts - t0;
      const dt = lastTs === null ? 0.016 : Math.min(0.05, (ts - lastTs) / 1000);
      lastTs = ts;
      if (demo) demoDrive(now);
      if (mode === "glide") {
        x += v * dt;
        v *= Math.exp(-FRICTION * dt);
        if (x <= 0) { x = 0; v = 0; }
        if (x >= RAIL_W) { x = RAIL_W; v = 0; }
        if (Math.abs(v) < SNAP_SPEED) { snapTo = tickX(nearestPage(x)); mode = "snap"; }
      }
      if (mode === "snap") {
        v *= Math.exp(-FRICTION * 3 * dt);
        x += (snapTo - x) * (1 - Math.exp(-SNAP_RATE * dt));
        if (Math.abs(snapTo - x) < 0.25) { x = snapTo; v = 0; mode = "idle"; }
      }
      if (mode === "drag") v *= Math.exp(-6 * dt);
      setPage(nearestPage(x), mode === "idle" && !demo);
      paintStatic();
      const tilt = Math.max(-TILT_MAX, Math.min(TILT_MAX, v * TILT_GAIN));
      bubble!.style.transform = "translateX(-50%) rotate(" + tilt.toFixed(2) + "deg)";
      speedEl!.textContent = String(Math.round(Math.abs(v)));
      raf = requestAnimationFrame(tick);
    }

    let follow: (() => void) | null = null;
    if (reduce) {
      demo = false;
      x = tickX(9);
      setPage(9, false);
      paintStatic();
      bubble.style.transform = "translateX(-50%)";
      // reduce 에서도 눌러 끌면 바로 따라가고 놓으면 가장 가까운 눈금에 붙는다
      const f = (): void => { setPage(nearestPage(x), true); paintStatic(); };
      follow = f;
      rail.addEventListener("pointermove", f);
      rail.addEventListener("pointerup", f);
      rail.addEventListener("pointerdown", f);
      thumb.addEventListener("keydown", f);
    } else {
      raf = requestAnimationFrame(tick);
    }
    return () => {
      cancelAnimationFrame(raf);
      rail.removeEventListener("pointerdown", onDown);
      rail.removeEventListener("pointermove", onMove);
      rail.removeEventListener("pointerup", release);
      rail.removeEventListener("pointercancel", release);
      thumb.removeEventListener("keydown", onKey);
      if (follow) {
        rail.removeEventListener("pointermove", follow);
        rail.removeEventListener("pointerup", follow);
        rail.removeEventListener("pointerdown", follow);
        thumb.removeEventListener("keydown", follow);
      }
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.pg} ref={rootRef}>
        <div className={[styles.pg__card, styles["is-mint"]].join(" ")} ref={cardRef} aria-hidden="true">
          <b className={styles.pg__no} ref={noRef}>1</b>
          <i className={styles.pg__row}></i>
          <i className={[styles.pg__row, styles["pg__row--s"]].join(" ")}></i>
        </div>
        <div className={styles.pg__rail} ref={railRef}>
          <div className={styles.pg__ticks} aria-hidden="true">
            {Array.from({ length: TOTAL_PAGES }, (_, i) => (
              <i className={styles.pg__tick} key={i} style={{ transform: "translateX(" + tickX(i + 1).toFixed(2) + "px)" }}></i>
            ))}
          </div>
          <div className={styles.pg__fill} ref={fillRef} aria-hidden="true"></div>
          <div className={styles.pg__thumb} ref={thumbRef} role="slider" tabIndex={0} aria-label="페이지 이동" aria-valuemin={1} aria-valuemax={TOTAL_PAGES} aria-valuenow={1}>
            <span className={styles.pg__bubble} ref={bubbleRef} aria-hidden="true">1</span>
          </div>
        </div>
        <div className={styles.pg__read}><span className={styles.pg__k}>속도</span><b ref={speedRef}>0</b></div>
        <p className={styles.pg__sr} ref={srRef} aria-live="polite"></p>
      </div>
    </main>
  );
}
