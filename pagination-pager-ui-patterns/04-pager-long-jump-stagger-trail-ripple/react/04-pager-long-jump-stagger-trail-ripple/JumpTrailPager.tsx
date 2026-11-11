// JumpTrailPager — vanilla 판(04-pager-long-jump-stagger-trail-ripple) 의 React 포트.
// 출발·도착 사이를 칩 아홉 개로 나누고, 칩마다 (출발과의 쪽수 차 x STAGGER_STEP) ms 늦게 번쩍인다.
import { useEffect, useRef } from "react";
import styles from "./JumpTrailPager.module.scss";

type Box<T> = { current: T };

const CHIP_COUNT = 9;
const TOTAL_PAGES = 40;
const STAGGER_STEP = 11;
const ATTACK_MS = 50;
const DECAY_MS = 220;
const SETTLE_MS = 160;
const START_MS = 100;
const CHIP_W = 28;
const CHIP_GAP = 4;
const DEMO_PAGES = [1, 40, 12, 33, 2, 25, 40];

export default function JumpTrailPager() {
  const rootRef = useRef<HTMLDivElement | null>(null) as Box<HTMLDivElement | null>;
  const navRef = useRef<HTMLElement | null>(null) as Box<HTMLElement | null>;
  const dotRef = useRef<HTMLElement | null>(null) as Box<HTMLElement | null>;
  const fromRef = useRef<HTMLElement | null>(null) as Box<HTMLElement | null>;
  const toRef = useRef<HTMLElement | null>(null) as Box<HTMLElement | null>;
  const spanRef = useRef<HTMLElement | null>(null) as Box<HTMLElement | null>;
  const srRef = useRef<HTMLParagraphElement | null>(null) as Box<HTMLParagraphElement | null>;
  const chipRefs = useRef<Array<HTMLButtonElement | null>>([]) as Box<Array<HTMLButtonElement | null>>;

  useEffect(() => {
    const nav = navRef.current;
    const dot = dotRef.current;
    const fromEl = fromRef.current;
    const toEl = toRef.current;
    const spanEl = spanRef.current;
    const sr = srRef.current;
    if (!nav || !dot || !fromEl || !toEl || !spanEl || !sr) return;
    const chips = chipRefs.current;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let demo = true;
    let cur = 1;
    let from = 1;
    let to = 1;
    let labels: number[] = [];
    let delays: number[] = [];
    let tStart = 0;
    let totalMs = 0;
    let running = false;
    let t0: number | null = null;
    let demoIdx = 0;
    let nextAt = START_MS;
    let raf = 0;
    const perfNow = (): number => (t0 === null ? 0 : performance.now() - t0);

    function setLabels(a: number, b: number): void {
      labels = [];
      delays = [];
      for (let s = 0; s < CHIP_COUNT; s += 1) {
        const page = Math.round(a + ((b - a) * s) / (CHIP_COUNT - 1));
        labels.push(page);
        delays.push(Math.abs(page - a) * STAGGER_STEP);
        const chip = chips[s];
        if (chip) chip.textContent = String(page);
      }
      totalMs = Math.abs(b - a) * STAGGER_STEP + ATTACK_MS + DECAY_MS;
    }

    function paintRest(): void {
      for (let s = 0; s < CHIP_COUNT; s += 1) {
        const chip = chips[s];
        if (!chip) continue;
        const on = labels[s] === cur && (s === CHIP_COUNT - 1 || s === 0);
        chip.className = [styles.pg__b, on ? styles["is-cur"] : ""].join(" ");
        chip.style.transform = "";
        if (on) chip.setAttribute("aria-current", "page"); else chip.removeAttribute("aria-current");
      }
      fromEl!.textContent = String(from);
      toEl!.textContent = String(to);
      spanEl!.textContent = String(Math.abs(to - from));
    }

    function jumpTo(page: number, byUser: boolean, now: number): void {
      if (byUser) demo = false;
      if (page === cur || page < 1 || page > TOTAL_PAGES) return;
      from = cur;
      to = page;
      setLabels(from, to);
      cur = page;
      fromEl!.textContent = String(from);
      toEl!.textContent = String(to);
      spanEl!.textContent = String(Math.abs(to - from));
      if (byUser) sr!.textContent = "현재 " + cur + " / " + TOTAL_PAGES;
      if (reduce) { setLabels(cur, cur); paintRest(); return; }
      tStart = now;
      running = true;
    }

    function pulseAt(age: number): number {
      if (age < 0) return 0;
      if (age < ATTACK_MS) return age / ATTACK_MS;
      return Math.exp(-(age - ATTACK_MS) / (DECAY_MS * 0.45));
    }

    function tick(ts: number): void {
      if (t0 === null) t0 = ts;
      const now = ts - t0;
      if (demo && now >= nextAt && !running) {
        demoIdx = (demoIdx + 1) % DEMO_PAGES.length;
        jumpTo(DEMO_PAGES[demoIdx], false, now);
        nextAt = now + 1e9;
      }
      if (running) {
        const elapsed = now - tStart;
        for (let s = 0; s < CHIP_COUNT; s += 1) {
          const chip = chips[s];
          if (!chip) continue;
          const p = pulseAt(elapsed - delays[s]);
          const on = elapsed - delays[s] >= 0;
          chip.className = [styles.pg__b, p > 0.02 ? styles["is-lit"] : "", on && s === CHIP_COUNT - 1 ? styles["is-cur"] : ""].join(" ");
          chip.style.transform = p > 0.02 ? "translateY(" + (-8 * p).toFixed(2) + "px) scale(" + (1 + 0.22 * p).toFixed(3) + ")" : "";
          chip.style.opacity = p > 0.02 ? "1" : on ? "0.9" : "0.72";
        }
        const head = Math.min(1, elapsed / Math.max(1, totalMs - DECAY_MS));
        dot!.style.transform = "translateX(" + (head * (CHIP_COUNT - 1) * (CHIP_W + CHIP_GAP)).toFixed(1) + "px)";
        if (elapsed >= totalMs + SETTLE_MS) {
          running = false;
          setLabels(cur, cur);
          for (let q = 0; q < CHIP_COUNT; q += 1) {
            const chip = chips[q];
            if (chip) chip.style.opacity = "";
          }
          dot!.style.transform = "translateX(0)";
          paintRest();
          if (demo) nextAt = now + SETTLE_MS;
        }
      }
      raf = requestAnimationFrame(tick);
    }

    const onClick = (e: MouseEvent): void => {
      const idx = chips.indexOf(e.target as HTMLButtonElement);
      if (idx >= 0 && !running) jumpTo(labels[idx], true, perfNow());
    };
    const onKey = (e: KeyboardEvent): void => {
      let step = 0;
      if (e.key === "ArrowRight") step = 1;
      else if (e.key === "ArrowLeft") step = -1;
      else if (e.key === "PageDown") step = 10;
      else if (e.key === "PageUp") step = -10;
      if (!step || running) return;
      e.preventDefault();
      jumpTo(Math.max(1, Math.min(TOTAL_PAGES, cur + step)), true, perfNow());
    };
    nav.addEventListener("click", onClick);
    nav.addEventListener("keydown", onKey);

    setLabels(1, 1);
    paintRest();
    if (reduce) {
      demo = false;
      from = 1;
      jumpTo(40, true, 0);
    } else {
      raf = requestAnimationFrame(tick);
    }
    return () => {
      cancelAnimationFrame(raf);
      nav.removeEventListener("click", onClick);
      nav.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.pg} ref={rootRef}>
        <nav className={styles.pg__nav} ref={navRef} aria-label="페이지 이동">
          {Array.from({ length: CHIP_COUNT }, (_, i) => (
            <button type="button" className={styles.pg__b} key={i} ref={(el: HTMLButtonElement | null) => { chipRefs.current[i] = el; }}></button>
          ))}
        </nav>
        <div className={styles.pg__track} aria-hidden="true"><i className={styles.pg__dot} ref={dotRef}></i></div>
        <div className={styles.pg__read}>
          <b ref={fromRef}>1</b><span className={styles.pg__arrow}>→</span><b ref={toRef}>1</b>
          <span className={styles.pg__k}>간격</span><b ref={spanRef}>0</b>
        </div>
        <p className={styles.pg__sr} ref={srRef} aria-live="polite"></p>
      </div>
    </main>
  );
}
