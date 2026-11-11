// RubberEdgePager — vanilla 판(05-pager-edge-rubber-band-nudge-disable) 의 React 포트.
// 끝 쪽에서 누르면 페이지는 안 바뀌고 눌림이 스프링 충격량으로 들어간다. 이미 밀려 있을수록 충격이 줄어든다.
import { useEffect, useRef } from "react";
import styles from "./RubberEdgePager.module.scss";

type Box<T> = { current: T };

const TOTAL_PAGES = 6;
const PUSH_IMPULSE = 560;
const RUBBER_LIMIT = 26;
const EDGE_STIFFNESS = 260;
const EDGE_DAMPING = 15;
const LABEL_DRAG = 0.3;
const CARD_DRAG = 0.7;
const SUBSTEP = 1 / 240;
const CYCLE_MS = 2300;
const TONES = ["is-mint", "is-lilac", "is-pink", "is-sky"];
// [시각 ms, 방향] 방향 -1 이전 · +1 다음
const DEMO_PRESSES: Array<[number, number]> = [[100, -1], [290, -1], [520, 1], [660, 1], [800, 1], [940, 1], [1080, 1], [1300, 1], [1460, 1], [1700, -1]];

export default function RubberEdgePager() {
  const rootRef = useRef<HTMLDivElement | null>(null) as Box<HTMLDivElement | null>;
  const cardRef = useRef<HTMLDivElement | null>(null) as Box<HTMLDivElement | null>;
  const noRef = useRef<HTMLElement | null>(null) as Box<HTMLElement | null>;
  const prevRef = useRef<HTMLButtonElement | null>(null) as Box<HTMLButtonElement | null>;
  const nextRef = useRef<HTMLButtonElement | null>(null) as Box<HTMLButtonElement | null>;
  const countRef = useRef<HTMLSpanElement | null>(null) as Box<HTMLSpanElement | null>;
  const curRef = useRef<HTMLElement | null>(null) as Box<HTMLElement | null>;
  const forceRef = useRef<HTMLElement | null>(null) as Box<HTMLElement | null>;
  const tlRef = useRef<HTMLElement | null>(null) as Box<HTMLElement | null>;
  const trRef = useRef<HTMLElement | null>(null) as Box<HTMLElement | null>;
  const srRef = useRef<HTMLParagraphElement | null>(null) as Box<HTMLParagraphElement | null>;

  useEffect(() => {
    const root = rootRef.current;
    const card = cardRef.current;
    const noEl = noRef.current;
    const prev = prevRef.current;
    const next = nextRef.current;
    const count = countRef.current;
    const curEl = curRef.current;
    const forceEl = forceRef.current;
    const tl = tlRef.current;
    const tr = trRef.current;
    const sr = srRef.current;
    if (!root || !card || !noEl || !prev || !next || !count || !curEl || !forceEl || !tl || !tr || !sr) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let demo = true;
    let cur = 1;
    const x = [0, 0];
    const v = [0, 0];
    let lastTs: number | null = null;
    let t0: number | null = null;
    let cycleBase = 0;
    let evt = 0;
    let raf = 0;

    function syncEdges(): void {
      prev!.setAttribute("aria-disabled", cur === 1 ? "true" : "false");
      next!.setAttribute("aria-disabled", cur === TOTAL_PAGES ? "true" : "false");
      prev!.className = [styles.pg__b, cur === 1 ? styles["is-edge"] : ""].join(" ");
      next!.className = [styles.pg__b, cur === TOTAL_PAGES ? styles["is-edge"] : ""].join(" ");
      curEl!.textContent = String(cur);
      noEl!.textContent = String(cur);
      card!.className = [styles.pg__card, styles[TONES[cur % TONES.length]]].join(" ");
    }

    function press(dir: number, byUser: boolean): void {
      if (byUser) demo = false;
      const side = dir < 0 ? 0 : 1;
      const target = cur + dir;
      if (target < 1 || target > TOTAL_PAGES) {
        if (!reduce) {
          const slack = Math.max(0, 1 - Math.abs(x[side]) / RUBBER_LIMIT);
          v[side] += dir * PUSH_IMPULSE * slack;
        }
        if (byUser) sr!.textContent = "현재 " + cur + " / " + TOTAL_PAGES;
        return;
      }
      cur = target;
      syncEdges();
      if (byUser) sr!.textContent = "현재 " + cur + " / " + TOTAL_PAGES;
    }

    const onPrev = (): void => press(-1, true);
    const onNext = (): void => press(1, true);
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "ArrowLeft") { e.preventDefault(); press(-1, true); }
      else if (e.key === "ArrowRight") { e.preventDefault(); press(1, true); }
    };
    prev.addEventListener("click", onPrev);
    next.addEventListener("click", onNext);
    root.addEventListener("keydown", onKey);

    function step(side: number, dt: number): void {
      let left = dt;
      while (left > 0) {
        const h = Math.min(SUBSTEP, left);
        v[side] += (-EDGE_STIFFNESS * x[side] - EDGE_DAMPING * v[side]) * h;
        x[side] += v[side] * h;
        left -= h;
      }
    }

    function tick(ts: number): void {
      if (t0 === null) t0 = ts;
      const now = ts - t0;
      const dt = lastTs === null ? 0.016 : Math.min(0.05, (ts - lastTs) / 1000);
      lastTs = ts;
      if (demo) {
        while (evt < DEMO_PRESSES.length && now - cycleBase >= DEMO_PRESSES[evt][0]) {
          press(DEMO_PRESSES[evt][1], false);
          evt += 1;
        }
        if (now - cycleBase >= CYCLE_MS) { cycleBase = now; evt = 0; cur = 1; syncEdges(); }
      }
      step(0, dt);
      step(1, dt);
      prev!.style.transform = "translateX(" + x[0].toFixed(2) + "px)";
      next!.style.transform = "translateX(" + x[1].toFixed(2) + "px)";
      card!.style.transform = "translateX(" + ((x[0] + x[1]) * CARD_DRAG).toFixed(2) + "px)";
      count!.style.transform = "translateX(" + ((x[0] + x[1]) * LABEL_DRAG).toFixed(2) + "px)";
      tl!.style.transform = "scaleX(" + Math.min(1, Math.abs(x[0]) / RUBBER_LIMIT).toFixed(3) + ")";
      tr!.style.transform = "scaleX(" + Math.min(1, Math.abs(x[1]) / RUBBER_LIMIT).toFixed(3) + ")";
      forceEl!.textContent = String(Math.round(Math.min(1, Math.max(Math.abs(x[0]), Math.abs(x[1])) / RUBBER_LIMIT) * 100));
      raf = requestAnimationFrame(tick);
    }

    syncEdges();
    if (reduce) demo = false; else raf = requestAnimationFrame(tick);
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
          <span className={styles.pg__count} ref={countRef}><b ref={curRef}>1</b><span className={styles.pg__sep}>/</span><span>{TOTAL_PAGES}</span></span>
          <button type="button" className={styles.pg__b} ref={nextRef} aria-label="다음 쪽">›</button>
        </nav>
        <div className={styles.pg__tension} aria-hidden="true"><i className={styles.pg__tl} ref={tlRef}></i><i className={styles.pg__tr} ref={trRef}></i></div>
        <div className={styles.pg__read}><span className={styles.pg__k}>장력</span><b ref={forceRef}>0</b><span className={styles.pg__u}>%</span></div>
        <p className={styles.pg__sr} ref={srRef} aria-live="polite"></p>
      </div>
    </main>
  );
}
