// DotBarPager — vanilla 판(06-pager-dots-to-bar-morph-compact) 의 React 포트.
// 점마다 현재 쪽과의 거리로 목표 폭·투명도를 계산하고 지수 보간으로 따라간다. 보이는 점은 항상 7개다.
import { useEffect, useRef } from "react";
import styles from "./DotBarPager.module.scss";

type Box<T> = { current: T };

const TOTAL_PAGES = 40;
const DOT_REACH = 3;
const BAR_W = 24;
const DOT_W = [BAR_W, 10, 8, 6];
const DOT_ALPHA = [1, 0.9, 0.7, 0.5];
const DOT_GAP = 6;
const VIEW_W = 120;
const MORPH_RATE = 14;
const SLIDE_RATE = 10;
const STEP_MS = 170;
const START_MS = 100;
const DEMO_PAGES = [1, 2, 3, 4, 9, 10, 11, 20, 21, 22, 23, 24];
const TONES = ["is-mint", "is-lilac", "is-pink", "is-sky"];

export default function DotBarPager() {
  const rootRef = useRef<HTMLDivElement | null>(null) as Box<HTMLDivElement | null>;
  const dotsRef = useRef<HTMLDivElement | null>(null) as Box<HTMLDivElement | null>;
  const cardRef = useRef<HTMLDivElement | null>(null) as Box<HTMLDivElement | null>;
  const noRef = useRef<HTMLElement | null>(null) as Box<HTMLElement | null>;
  const curRef = useRef<HTMLElement | null>(null) as Box<HTMLElement | null>;
  const prevRef = useRef<HTMLButtonElement | null>(null) as Box<HTMLButtonElement | null>;
  const nextRef = useRef<HTMLButtonElement | null>(null) as Box<HTMLButtonElement | null>;
  const srRef = useRef<HTMLParagraphElement | null>(null) as Box<HTMLParagraphElement | null>;
  const dotRefs = useRef<Array<HTMLElement | null>>([]) as Box<Array<HTMLElement | null>>;

  useEffect(() => {
    const root = rootRef.current;
    const dotsEl = dotsRef.current;
    const card = cardRef.current;
    const noEl = noRef.current;
    const curEl = curRef.current;
    const prev = prevRef.current;
    const next = nextRef.current;
    const sr = srRef.current;
    if (!root || !dotsEl || !card || !noEl || !curEl || !prev || !next || !sr) return;
    const dots = dotRefs.current;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const w: number[] = [];
    const a: number[] = [];
    for (let i = 0; i < TOTAL_PAGES; i += 1) { w.push(DOT_W[3]); a.push(0); }

    let demo = true;
    let cur = 1;
    let offset = 0;
    let t0: number | null = null;
    let lastTs: number | null = null;
    let lastStep = -1;
    let raf = 0;

    const targetW = (dist: number): number => (dist < DOT_W.length ? DOT_W[dist] : DOT_W[DOT_W.length - 1]);
    const targetA = (dist: number): number => (dist < DOT_ALPHA.length ? DOT_ALPHA[dist] : 0);

    function layout(k: number): number {
      let x = 0;
      let centerX = 0;
      for (let s = 0; s < TOTAL_PAGES; s += 1) {
        const dist = Math.abs(s + 1 - cur);
        if (k >= 1) { w[s] = targetW(dist); a[s] = targetA(dist); } else {
          w[s] += (targetW(dist) - w[s]) * k;
          a[s] += (targetA(dist) - a[s]) * k;
        }
        const el = dots[s];
        if (el) {
          el.style.width = w[s].toFixed(2) + "px";
          el.style.opacity = a[s].toFixed(3);
          el.className = [styles.pg__dot, s + 1 === cur ? styles["is-cur"] : ""].join(" ");
          el.style.transform = "translateX(" + x.toFixed(2) + "px)";
        }
        if (s + 1 === cur) centerX = x;
        x += w[s] + DOT_GAP;
      }
      return centerX;
    }

    function place(): void {
      dotsEl!.style.transform = "translateX(" + (VIEW_W / 2 - offset - BAR_W / 2).toFixed(2) + "px)";
    }

    function setCur(n: number, byUser: boolean): void {
      if (byUser) demo = false;
      const nxt = Math.max(1, Math.min(TOTAL_PAGES, n));
      if (nxt === cur) return;
      cur = nxt;
      curEl!.textContent = String(cur);
      noEl!.textContent = String(cur);
      card!.className = [styles.pg__card, styles[TONES[cur % TONES.length]]].join(" ");
      if (byUser) sr!.textContent = "현재 " + cur + " / " + TOTAL_PAGES;
      if (reduce) { offset = layout(1); place(); }
    }

    const onPrev = (): void => setCur(cur - 1, true);
    const onNext = (): void => setCur(cur + 1, true);
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "ArrowLeft") { e.preventDefault(); setCur(cur - 1, true); }
      else if (e.key === "ArrowRight") { e.preventDefault(); setCur(cur + 1, true); }
    };
    prev.addEventListener("click", onPrev);
    next.addEventListener("click", onNext);
    root.addEventListener("keydown", onKey);

    function tick(ts: number): void {
      if (t0 === null) t0 = ts;
      const now = ts - t0;
      const dt = lastTs === null ? 0.016 : Math.min(0.05, (ts - lastTs) / 1000);
      lastTs = ts;
      if (demo) {
        const step = now < START_MS ? 0 : Math.floor((now - START_MS) / STEP_MS) % DEMO_PAGES.length;
        if (step !== lastStep) { lastStep = step; setCur(DEMO_PAGES[step], false); }
      }
      const cx = layout(1 - Math.exp(-dt * MORPH_RATE));
      offset += (cx - offset) * (1 - Math.exp(-dt * SLIDE_RATE));
      place();
      raf = requestAnimationFrame(tick);
    }

    curEl.textContent = "1";
    if (reduce) {
      demo = false;
      cur = 17;
      curEl.textContent = "17";
      noEl.textContent = "17";
      card.className = [styles.pg__card, styles[TONES[cur % TONES.length]]].join(" ");
      offset = layout(1);
      place();
    } else {
      layout(1);
      raf = requestAnimationFrame(tick);
    }
    return () => {
      cancelAnimationFrame(raf);
      prev.removeEventListener("click", onPrev);
      next.removeEventListener("click", onNext);
      root.removeEventListener("keydown", onKey);
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
        <nav className={styles.pg__nav} aria-label="페이지 이동">
          <button type="button" className={styles.pg__b} ref={prevRef} aria-label="이전 쪽">‹</button>
          <div className={styles.pg__dots} aria-hidden="true"><div className={styles.pg__strip} ref={dotsRef}>
            {Array.from({ length: TOTAL_PAGES }, (_, i) => (
              <i className={styles.pg__dot} key={i} ref={(el: HTMLElement | null) => { dotRefs.current[i] = el; }}></i>
            ))}
          </div></div>
          <button type="button" className={styles.pg__b} ref={nextRef} aria-label="다음 쪽">›</button>
        </nav>
        <div className={styles.pg__read}><b ref={curRef}>1</b><span className={styles.pg__sep}>/</span><span>{TOTAL_PAGES}</span><span className={styles.pg__k}>점</span><b>{DOT_REACH * 2 + 1}</b></div>
        <p className={styles.pg__sr} ref={srRef} aria-live="polite"></p>
      </div>
    </main>
  );
}
