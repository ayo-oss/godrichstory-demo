// DirectionSlidePager — vanilla 판(03-pager-direction-aware-content-slide) 의 React 포트.
// 이동 방향(부호)과 건너뛴 쪽수(거리)로 슬라이드 폭·흐림·시간을 계산한다.
import { useEffect, useRef } from "react";
import styles from "./DirectionSlidePager.module.scss";

type Box<T> = { current: T };
type Anim = { t: number; dir: number; slide: number; blur: number; ms: number };

const TOTAL_PAGES = 12;
const BASE_SLIDE = 28;
const SLIDE_PER_PAGE = 14;
const SLIDE_MAX = 120;
const BLUR_PER_PAGE = 0.9;
const BLUR_MAX = 6;
const BASE_MS = 260;
const MS_PER_PAGE = 30;
const MS_MAX = 560;
const STEP_MS = 440;
const START_MS = 150;
const DEMO_MOVES = [1, 1, 6, -1, -7, 1, 8, -4];
const TONES = ["is-mint", "is-lilac", "is-pink", "is-sky"];

export default function DirectionSlidePager() {
  const rootRef = useRef<HTMLDivElement | null>(null) as Box<HTMLDivElement | null>;
  const cardARef = useRef<HTMLDivElement | null>(null) as Box<HTMLDivElement | null>;
  const cardBRef = useRef<HTMLDivElement | null>(null) as Box<HTMLDivElement | null>;
  const curRef = useRef<HTMLElement | null>(null) as Box<HTMLElement | null>;
  const srRef = useRef<HTMLParagraphElement | null>(null) as Box<HTMLParagraphElement | null>;
  const prevRef = useRef<HTMLButtonElement | null>(null) as Box<HTMLButtonElement | null>;
  const nextRef = useRef<HTMLButtonElement | null>(null) as Box<HTMLButtonElement | null>;
  const m5Ref = useRef<HTMLButtonElement | null>(null) as Box<HTMLButtonElement | null>;
  const p5Ref = useRef<HTMLButtonElement | null>(null) as Box<HTMLButtonElement | null>;

  useEffect(() => {
    const root = rootRef.current;
    const cardA = cardARef.current;
    const cardB = cardBRef.current;
    const curEl = curRef.current;
    const sr = srRef.current;
    const prevBtn = prevRef.current;
    const nextBtn = nextRef.current;
    const m5 = m5Ref.current;
    const p5 = p5Ref.current;
    if (!root || !cardA || !cardB || !curEl || !sr || !prevBtn || !nextBtn || !m5 || !p5) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function fillCard(el: HTMLElement, page: number): void {
      el.className = [styles.pg__card, styles[TONES[page % TONES.length]]].join(" ");
      let rows = "";
      for (let r = 0; r < 3; r += 1) {
        const w = 44 + ((page * 37 + r * 53) % 50);
        rows += '<i class="' + styles.pg__row + '" style="width:' + w + '%"></i>';
      }
      el.innerHTML = '<b class="' + styles.pg__no + '">' + page + "</b>" + rows;
    }

    let demo = true;
    let cur = 1;
    let anim: Anim | null = null;
    let lastStep = -1;
    let t0: number | null = null;
    let raf = 0;
    fillCard(cardB, 1);
    cardA.style.opacity = "0";
    const perfNow = (): number => (t0 === null ? 0 : performance.now() - t0);
    const easeOut = (p: number): number => 1 - Math.pow(1 - p, 3);

    function move(delta: number, byUser: boolean, now: number): void {
      if (byUser) demo = false;
      const next = Math.max(1, Math.min(TOTAL_PAGES, cur + delta));
      if (next === cur) return;
      const dir = next > cur ? 1 : -1;
      const dist = Math.abs(next - cur);
      const prevPage = cur;
      cur = next;
      curEl!.textContent = String(cur);
      if (byUser) sr!.textContent = "현재 " + cur + " / " + TOTAL_PAGES;
      if (reduce) {
        fillCard(cardB!, cur);
        cardB!.style.transform = "";
        cardB!.style.opacity = "1";
        cardB!.style.filter = "";
        cardA!.style.opacity = "0";
        return;
      }
      fillCard(cardA!, prevPage);
      fillCard(cardB!, cur);
      anim = {
        t: now,
        dir,
        slide: Math.min(SLIDE_MAX, BASE_SLIDE + dist * SLIDE_PER_PAGE),
        blur: Math.min(BLUR_MAX, dist * BLUR_PER_PAGE),
        ms: Math.min(MS_MAX, BASE_MS + dist * MS_PER_PAGE),
      };
    }

    function paintAnim(now: number): void {
      if (!anim) return;
      const p = Math.min(1, (now - anim.t) / anim.ms);
      const e = easeOut(p);
      cardB!.style.transform = "translateX(" + (anim.dir * anim.slide * (1 - e)).toFixed(1) + "px)";
      cardB!.style.opacity = e.toFixed(3);
      cardB!.style.filter = anim.blur * (1 - e) > 0.05 ? "blur(" + (anim.blur * (1 - e)).toFixed(2) + "px)" : "";
      cardA!.style.transform = "translateX(" + (-anim.dir * anim.slide * 0.5 * e).toFixed(1) + "px)";
      cardA!.style.opacity = (1 - e).toFixed(3);
      cardA!.style.filter = anim.blur * e > 0.05 ? "blur(" + (anim.blur * e).toFixed(2) + "px)" : "";
      if (p >= 1) {
        anim = null;
        cardA!.style.opacity = "0";
        cardB!.style.transform = "";
        cardB!.style.filter = "";
      }
    }

    const onPrev = (): void => move(-1, true, perfNow());
    const onNext = (): void => move(1, true, perfNow());
    const onM5 = (): void => move(-5, true, perfNow());
    const onP5 = (): void => move(5, true, perfNow());
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "ArrowRight") { e.preventDefault(); move(1, true, perfNow()); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); move(-1, true, perfNow()); }
    };
    prevBtn.addEventListener("click", onPrev);
    nextBtn.addEventListener("click", onNext);
    m5.addEventListener("click", onM5);
    p5.addEventListener("click", onP5);
    root.addEventListener("keydown", onKey);

    function tick(ts: number): void {
      if (t0 === null) t0 = ts;
      const now = ts - t0;
      if (demo) {
        const step = now < START_MS ? -1 : Math.floor((now - START_MS) / STEP_MS);
        if (step !== lastStep && step >= 0) {
          lastStep = step;
          let mv = DEMO_MOVES[step % DEMO_MOVES.length];
          const dest = cur + mv;
          if (dest < 1 || dest > TOTAL_PAGES) mv = -mv;
          move(mv, false, now);
        }
      }
      paintAnim(now);
      raf = requestAnimationFrame(tick);
    }

    if (reduce) demo = false; else raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      prevBtn.removeEventListener("click", onPrev);
      nextBtn.removeEventListener("click", onNext);
      m5.removeEventListener("click", onM5);
      p5.removeEventListener("click", onP5);
      root.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.pg} ref={rootRef}>
        <div className={styles.pg__view}>
          <div className={styles.pg__card} ref={cardARef} aria-hidden="true"></div>
          <div className={styles.pg__card} ref={cardBRef}></div>
        </div>
        <nav className={styles.pg__nav} aria-label="페이지 이동">
          <button type="button" className={[styles.pg__b, styles["pg__b--jump"]].join(" ")} ref={m5Ref} aria-label="−5">−5</button>
          <button type="button" className={styles.pg__b} ref={prevRef} aria-label="이전 쪽">‹</button>
          <span className={styles.pg__count}><b ref={curRef}>1</b><span className={styles.pg__sep}>/</span><span>{TOTAL_PAGES}</span></span>
          <button type="button" className={styles.pg__b} ref={nextRef} aria-label="다음 쪽">›</button>
          <button type="button" className={[styles.pg__b, styles["pg__b--jump"]].join(" ")} ref={p5Ref} aria-label="+5">+5</button>
        </nav>
        <p className={styles.pg__sr} ref={srRef} aria-live="polite"></p>
      </div>
    </main>
  );
}
