// CursorTrailPager — vanilla 판(08-pager-cursor-next-only-breadcrumb-trail) 의 React 포트.
// 전체 쪽수를 모르는 목록은 다음 커서만 받는다. 지나온 쪽은 점으로 남고, 점이 늘면 간격이 줄어 길이가 일정하다.
import { useEffect, useRef } from "react";
import styles from "./CursorTrailPager.module.scss";

type Box<T> = { current: T };

const END_AT = 9;
const TRAIL_W = 232;
const MAX_GAP = 36;
const GAP_RATE = 12;
const POP_MS = 420;
const CYCLE_MS = 2700;
const PRESS_START = 140;
const PRESS_EVERY = 180;
const BACK_AT = 1980;
const BACK_TO = 3;
const TONES = ["is-mint", "is-lilac", "is-pink", "is-sky"];

const cursorOf = (n: number): string => (Math.imul(n, 2654435761) >>> 0).toString(16).slice(-4);

export default function CursorTrailPager() {
  const rootRef = useRef<HTMLDivElement | null>(null) as Box<HTMLDivElement | null>;
  const trailRef = useRef<HTMLDivElement | null>(null) as Box<HTMLDivElement | null>;
  const lineRef = useRef<HTMLElement | null>(null) as Box<HTMLElement | null>;
  const nextRef = useRef<HTMLButtonElement | null>(null) as Box<HTMLButtonElement | null>;
  const cardRef = useRef<HTMLDivElement | null>(null) as Box<HTMLDivElement | null>;
  const noRef = useRef<HTMLElement | null>(null) as Box<HTMLElement | null>;
  const cursorRef = useRef<HTMLSpanElement | null>(null) as Box<HTMLSpanElement | null>;
  const srRef = useRef<HTMLParagraphElement | null>(null) as Box<HTMLParagraphElement | null>;
  const dotRefs = useRef<Array<HTMLButtonElement | null>>([]) as Box<Array<HTMLButtonElement | null>>;

  useEffect(() => {
    const root = rootRef.current;
    const trail = trailRef.current;
    const line = lineRef.current;
    const nextBtn = nextRef.current;
    const card = cardRef.current;
    const noEl = noRef.current;
    const cursorEl = cursorRef.current;
    const sr = srRef.current;
    if (!root || !trail || !line || !nextBtn || !card || !noEl || !cursorEl || !sr) return;
    const dots = dotRefs.current;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const born: number[] = [];
    for (let i = 0; i < END_AT; i += 1) born.push(-1);

    let demo = true;
    let cur = 1;
    let reached = 1;
    let gapShown = 0;
    let t0: number | null = null;
    let lastTs: number | null = null;
    let cycleBase = 0;
    let pressed = 0;
    let wentBack = false;
    let raf = 0;
    const perfNow = (): number => (t0 === null ? 0 : performance.now() - t0);

    function sync(announce: boolean): void {
      noEl!.textContent = String(cur);
      cursorEl!.textContent = cursorOf(cur);
      card!.className = [styles.pg__card, styles[TONES[cur % TONES.length]]].join(" ");
      const atEnd = cur === END_AT;
      nextBtn!.setAttribute("aria-disabled", atEnd ? "true" : "false");
      nextBtn!.textContent = atEnd ? "끝" : "다음";
      nextBtn!.className = [styles.pg__next, atEnd ? styles["is-end"] : ""].join(" ");
      for (let s = 0; s < END_AT; s += 1) {
        const el = dots[s];
        if (!el) continue;
        const seen = s + 1 <= reached;
        el.className = [styles.pg__dot, seen ? styles["is-seen"] : "", s + 1 === cur ? styles["is-cur"] : ""].join(" ");
        el.tabIndex = seen ? 0 : -1;
        el.setAttribute("aria-hidden", seen ? "false" : "true");
        if (s + 1 === cur) el.setAttribute("aria-current", "page"); else el.removeAttribute("aria-current");
      }
      if (announce) sr!.textContent = "현재 " + cur;
    }

    function goNext(byUser: boolean, now: number): void {
      if (byUser) demo = false;
      if (cur >= END_AT) return;
      cur += 1;
      if (cur > reached) { reached = cur; if (!reduce) born[cur - 1] = now; }
      sync(byUser);
    }

    function goBack(p: number, byUser: boolean): void {
      if (byUser) demo = false;
      if (p < 1 || p > reached || p === cur) return;
      cur = p;
      sync(byUser);
    }

    const popScale = (age: number): number => (age < 0 || age >= POP_MS ? 1 : 1 - Math.exp(-age / 65) * Math.cos(age / 50));

    function paint(now: number, dt: number): void {
      const n = Math.max(2, reached);
      const targetGap = Math.min(MAX_GAP, TRAIL_W / (n - 1));
      gapShown = reduce ? targetGap : gapShown + (targetGap - gapShown) * (1 - Math.exp(-dt * GAP_RATE));
      for (let s = 0; s < END_AT; s += 1) {
        const el = dots[s];
        if (!el) continue;
        const seen = s + 1 <= reached;
        const sc = seen ? popScale(now - born[s]) : 0;
        if (seen && sc === 1) born[s] = -1;
        el.style.opacity = seen ? "1" : "0";
        el.style.transform = "translateX(" + (s * gapShown).toFixed(2) + "px) scale(" + sc.toFixed(3) + ")";
      }
      line!.style.transform = "scaleX(" + (((reached - 1) * gapShown) / TRAIL_W).toFixed(4) + ")";
    }

    const onNext = (): void => goNext(true, perfNow());
    const onTrail = (e: MouseEvent): void => {
      const idx = dots.indexOf(e.target as HTMLButtonElement);
      if (idx >= 0) goBack(idx + 1, true);
    };
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "ArrowRight") { e.preventDefault(); goNext(true, perfNow()); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); goBack(cur - 1, true); }
    };
    const onReduceClick = (): void => paint(0, 1);
    nextBtn.addEventListener("click", onNext);
    trail.addEventListener("click", onTrail);
    root.addEventListener("keydown", onKey);

    function tick(ts: number): void {
      if (t0 === null) t0 = ts;
      const now = ts - t0;
      const dt = lastTs === null ? 0.016 : Math.min(0.05, (ts - lastTs) / 1000);
      lastTs = ts;
      if (demo) {
        const t = now - cycleBase;
        while (pressed < END_AT - 1 && t >= PRESS_START + pressed * PRESS_EVERY) { goNext(false, now); pressed += 1; }
        if (!wentBack && t >= BACK_AT) { wentBack = true; goBack(BACK_TO, false); }
        if (t >= CYCLE_MS) {
          cycleBase = now; pressed = 0; wentBack = false;
          cur = 1; reached = 1; gapShown = 0;
          for (let q = 0; q < END_AT; q += 1) born[q] = -1;
          sync(false);
        }
      }
      paint(now, dt);
      raf = requestAnimationFrame(tick);
    }

    sync(false);
    if (reduce) {
      demo = false;
      paint(0, 1);
      nextBtn.addEventListener("click", onReduceClick);
      trail.addEventListener("click", onReduceClick);
    } else {
      raf = requestAnimationFrame(tick);
    }
    return () => {
      cancelAnimationFrame(raf);
      nextBtn.removeEventListener("click", onNext);
      trail.removeEventListener("click", onTrail);
      root.removeEventListener("keydown", onKey);
      nextBtn.removeEventListener("click", onReduceClick);
      trail.removeEventListener("click", onReduceClick);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.pg} ref={rootRef}>
        <div className={[styles.pg__card, styles["is-mint"]].join(" ")} ref={cardRef} aria-hidden="true">
          <b className={styles.pg__no} ref={noRef}>1</b>
          <span className={styles.pg__cursor} ref={cursorRef}>0000</span>
        </div>
        <nav className={styles.pg__nav} aria-label="페이지 이동">
          <button type="button" className={styles.pg__next} ref={nextRef}>다음</button>
        </nav>
        <div className={styles.pg__trail} ref={trailRef} aria-label="지나온 쪽">
          <i className={styles.pg__line} ref={lineRef} aria-hidden="true"></i>
          {Array.from({ length: END_AT }, (_, i) => (
            <button type="button" className={styles.pg__dot} key={i} tabIndex={-1} aria-label={String(i + 1)} ref={(el: HTMLButtonElement | null) => { dotRefs.current[i] = el; }}></button>
          ))}
        </div>
        <p className={styles.pg__sr} ref={srRef} aria-live="polite"></p>
      </div>
    </main>
  );
}
