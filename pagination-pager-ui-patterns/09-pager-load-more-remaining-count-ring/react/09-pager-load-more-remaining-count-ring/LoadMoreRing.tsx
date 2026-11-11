// LoadMoreRing — vanilla 판(09-pager-load-more-remaining-count-ring) 의 React 포트.
// 링은 stroke-dashoffset 을 스프링으로 채우고, 남은 개수는 지수 보간으로 굴러 내려간다.
import { useEffect, useRef } from "react";
import styles from "./LoadMoreRing.module.scss";

type Box<T> = { current: T };

const TOTAL_ITEMS = 48;
const PAGE_SIZE = 12;
const START_LOADED = 12;
const RING_R = 42;
const RING_STIFFNESS = 220;
const RING_DAMPING = 15;
const NUM_RATE = 12;
const LOAD_MS = 240;
const CELL_STAGGER = 24;
const POP_MS = 380;
const SUBSTEP = 1 / 240;
const CYCLE_MS = 1800;
const PRESS_AT = [100, 420, 740, 1060];
const TONES = ["is-sky", "is-mint", "is-lilac", "is-pink"];
const CIRC = 2 * Math.PI * RING_R;

export default function LoadMoreRing() {
  const rootRef = useRef<HTMLDivElement | null>(null) as Box<HTMLDivElement | null>;
  const moreRef = useRef<HTMLButtonElement | null>(null) as Box<HTMLButtonElement | null>;
  const arcRef = useRef<SVGCircleElement | null>(null) as Box<SVGCircleElement | null>;
  const sweepRef = useRef<SVGCircleElement | null>(null) as Box<SVGCircleElement | null>;
  const numRef = useRef<HTMLSpanElement | null>(null) as Box<HTMLSpanElement | null>;
  const labelRef = useRef<HTMLSpanElement | null>(null) as Box<HTMLSpanElement | null>;
  const srRef = useRef<HTMLParagraphElement | null>(null) as Box<HTMLParagraphElement | null>;
  const cellRefs = useRef<Array<HTMLElement | null>>([]) as Box<Array<HTMLElement | null>>;

  useEffect(() => {
    const more = moreRef.current;
    const arc = arcRef.current;
    const sweep = sweepRef.current;
    const numEl = numRef.current;
    const labelEl = labelRef.current;
    const sr = srRef.current;
    if (!more || !arc || !sweep || !numEl || !labelEl || !sr) return;
    const cells = cellRefs.current;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    arc.style.strokeDasharray = CIRC.toFixed(2);
    sweep.style.strokeDasharray = (CIRC * 0.16).toFixed(2) + " " + CIRC.toFixed(2);
    const born: number[] = [];
    for (let i = 0; i < TOTAL_ITEMS; i += 1) born.push(-1);

    let demo = true;
    let loaded = START_LOADED;
    let pending: number | null = null;
    let frac = START_LOADED / TOTAL_ITEMS;
    let fv = 0;
    let numShown = TOTAL_ITEMS - START_LOADED;
    let t0: number | null = null;
    let lastTs: number | null = null;
    let cycleBase = 0;
    let pi = 0;
    let raf = 0;
    const perfNow = (): number => (t0 === null ? 0 : performance.now() - t0);

    function paintCells(): void {
      for (let s = 0; s < TOTAL_ITEMS; s += 1) {
        const el = cells[s];
        if (!el) continue;
        el.className = s < loaded
          ? [styles.pg__cell, styles["is-on"], styles[TONES[Math.floor(s / PAGE_SIZE) % TONES.length]]].join(" ")
          : styles.pg__cell;
      }
    }

    function paintStatic(): void {
      arc!.style.strokeDashoffset = (CIRC * (1 - Math.min(1, frac))).toFixed(2);
      numEl!.textContent = loaded >= TOTAL_ITEMS ? "✓" : String(Math.round(numShown));
    }

    function finishLoad(now: number): void {
      const from = loaded;
      loaded = Math.min(TOTAL_ITEMS, loaded + PAGE_SIZE);
      for (let s = from; s < loaded; s += 1) born[s] = reduce ? -1 : now + (s - from) * CELL_STAGGER;
      pending = null;
      sweep!.style.opacity = "0";
      paintCells();
      const remain = TOTAL_ITEMS - loaded;
      const done = remain === 0;
      labelEl!.textContent = done ? "완료" : "더 보기";
      more!.setAttribute("aria-disabled", done ? "true" : "false");
      more!.className = [styles.pg__more, done ? styles["is-done"] : ""].join(" ");
      sr!.textContent = done ? "완료" : "남은 " + remain + "개";
      if (reduce) { frac = loaded / TOTAL_ITEMS; numShown = remain; paintStatic(); }
    }

    function press(byUser: boolean, now: number): void {
      if (byUser) demo = false;
      if (pending !== null || loaded >= TOTAL_ITEMS) return;
      if (reduce) { finishLoad(now); return; }
      pending = now;
      sweep!.style.opacity = "1";
    }

    const onClick = (): void => press(true, perfNow());
    more.addEventListener("click", onClick);

    function tick(ts: number): void {
      if (t0 === null) t0 = ts;
      const now = ts - t0;
      const dt = lastTs === null ? 0.016 : Math.min(0.05, (ts - lastTs) / 1000);
      lastTs = ts;
      if (demo) {
        const t = now - cycleBase;
        while (pi < PRESS_AT.length && t >= PRESS_AT[pi]) { press(false, now); pi += 1; }
        if (t >= CYCLE_MS) {
          cycleBase = now; pi = 0; loaded = START_LOADED; frac = START_LOADED / TOTAL_ITEMS; fv = 0;
          numShown = TOTAL_ITEMS - START_LOADED;
          for (let q = 0; q < TOTAL_ITEMS; q += 1) born[q] = -1;
          paintCells();
          labelEl!.textContent = "더 보기";
          more!.setAttribute("aria-disabled", "false");
          more!.className = styles.pg__more;
        }
      }
      if (pending !== null) {
        const ang = ((now - pending) / LOAD_MS) * 360;
        sweep!.style.transform = "rotate(" + (ang - 90).toFixed(1) + "deg)";
        if (now - pending >= LOAD_MS) finishLoad(now);
      }
      const target = loaded / TOTAL_ITEMS;
      let left = dt;
      while (left > 0) {
        const h = Math.min(SUBSTEP, left);
        fv += (-RING_STIFFNESS * (frac - target) - RING_DAMPING * fv) * h;
        frac += fv * h;
        left -= h;
      }
      numShown += (TOTAL_ITEMS - loaded - numShown) * (1 - Math.exp(-dt * NUM_RATE));
      paintStatic();
      for (let s = 0; s < TOTAL_ITEMS; s += 1) {
        if (born[s] < 0) continue;
        const age = now - born[s];
        const sc = age < 0 ? 0 : age >= POP_MS ? 1 : 1 - Math.exp(-age / 70) * Math.cos(age / 55);
        const el = cells[s];
        if (el) el.style.transform = sc === 1 ? "" : "scale(" + sc.toFixed(3) + ")";
        if (sc === 1) born[s] = -1;
      }
      raf = requestAnimationFrame(tick);
    }

    sweep.style.opacity = "0";
    paintCells();
    paintStatic();
    if (reduce) demo = false; else raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      more.removeEventListener("click", onClick);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.pg} ref={rootRef}>
        <button type="button" className={styles.pg__more} ref={moreRef}>
          <svg className={styles.pg__ring} viewBox="0 0 96 96" aria-hidden="true" focusable="false">
            <circle className={styles.pg__track} cx="48" cy="48" r="42"></circle>
            <circle className={styles.pg__arc} cx="48" cy="48" r="42" ref={arcRef}></circle>
            <circle className={styles.pg__sweep} cx="48" cy="48" r="42" ref={sweepRef}></circle>
          </svg>
          <span className={styles.pg__num} ref={numRef}>36</span>
          <span className={styles.pg__label} ref={labelRef}>더 보기</span>
        </button>
        <div className={styles.pg__grid} aria-hidden="true">
          {Array.from({ length: TOTAL_ITEMS }, (_, i) => (
            <i className={styles.pg__cell} key={i} ref={(el: HTMLElement | null) => { cellRefs.current[i] = el; }}></i>
          ))}
        </div>
        <p className={styles.pg__sr} ref={srRef} aria-live="polite"></p>
      </div>
    </main>
  );
}
