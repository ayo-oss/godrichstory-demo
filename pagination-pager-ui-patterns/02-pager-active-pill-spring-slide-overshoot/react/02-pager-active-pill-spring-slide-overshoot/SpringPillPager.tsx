// SpringPillPager — vanilla 판(02-pager-active-pill-spring-slide-overshoot) 의 React 포트.
// 알약의 x 위치를 CSS 전환이 아니라 스프링 방정식(강성·감쇠)으로 직접 적분하고, 속도에 비례해 늘어나게 한다.
import { useEffect, useRef } from "react";
import styles from "./SpringPillPager.module.scss";

type Box<T> = { current: T };

const PAGE_COUNT = 7;
const SLOT_W = 36;
const SLOT_GAP = 4;
const PILL_STIFFNESS = 320;
const PILL_DAMPING = 17;
const STRETCH_GAIN = 0.0011;
const STRETCH_MAX = 0.7;
const SUBSTEP = 1 / 240;
const STEP_MS = 400;
const START_MS = 150;
const DEMO_PAGES = [1, 7, 3, 6, 1, 4, 7];

export default function SpringPillPager() {
  const navRef = useRef<HTMLElement | null>(null) as Box<HTMLElement | null>;
  const pillRef = useRef<HTMLSpanElement | null>(null) as Box<HTMLSpanElement | null>;
  const overRef = useRef<HTMLElement | null>(null) as Box<HTMLElement | null>;
  const srRef = useRef<HTMLParagraphElement | null>(null) as Box<HTMLParagraphElement | null>;
  const btnRefs = useRef<Array<HTMLButtonElement | null>>([]) as Box<Array<HTMLButtonElement | null>>;

  useEffect(() => {
    const nav = navRef.current;
    const pill = pillRef.current;
    const overEl = overRef.current;
    const sr = srRef.current;
    if (!nav || !pill || !overEl || !sr) return;
    const btns = btnRefs.current;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const slotX = (page: number): number => (page - 1) * (SLOT_W + SLOT_GAP);

    let demo = true;
    let cur = 1;
    let x = 0;
    let v = 0;
    let fromX = 0;
    let peak = 0;
    let lastTs: number | null = null;
    let t0: number | null = null;
    let lastStep = -1;
    let raf = 0;

    function mark(): void {
      for (let s = 0; s < PAGE_COUNT; s += 1) {
        const el = btns[s];
        if (!el) continue;
        if (s + 1 === cur) el.setAttribute("aria-current", "page"); else el.removeAttribute("aria-current");
      }
    }

    function paint(): void {
      const sx = 1 + Math.min(STRETCH_MAX, Math.abs(v) * STRETCH_GAIN);
      const sy = 1 / Math.sqrt(sx);
      pill!.style.transform = "translateX(" + x.toFixed(2) + "px) scale(" + sx.toFixed(3) + "," + sy.toFixed(3) + ")";
      const near = Math.max(0, Math.min(PAGE_COUNT - 1, Math.round(x / (SLOT_W + SLOT_GAP))));
      for (let s = 0; s < PAGE_COUNT; s += 1) {
        const el = btns[s];
        if (el) el.className = [styles.pg__b, s === near ? styles["is-under"] : ""].join(" ");
      }
    }

    function setCur(n: number, byUser: boolean): void {
      const next = Math.max(1, Math.min(PAGE_COUNT, n));
      if (byUser) demo = false;
      if (next === cur) return;
      cur = next;
      fromX = x;
      peak = 0;
      mark();
      if (reduce) { x = slotX(cur); v = 0; paint(); }
      if (byUser) sr!.textContent = "현재 " + cur + " / " + PAGE_COUNT;
    }

    const onClick = (e: MouseEvent): void => {
      const idx = btns.indexOf(e.target as HTMLButtonElement);
      if (idx >= 0) setCur(idx + 1, true);
    };
    const onKey = (e: KeyboardEvent): void => {
      let to: number | null = null;
      if (e.key === "ArrowRight") to = cur + 1;
      else if (e.key === "ArrowLeft") to = cur - 1;
      else if (e.key === "Home") to = 1;
      else if (e.key === "End") to = PAGE_COUNT;
      if (to === null) return;
      e.preventDefault();
      setCur(to, true);
      const target = btns[Math.max(1, Math.min(PAGE_COUNT, to)) - 1];
      if (target) target.focus({ preventScroll: true });
    };
    nav.addEventListener("click", onClick);
    nav.addEventListener("keydown", onKey);

    function tick(ts: number): void {
      if (t0 === null) t0 = ts;
      const now = ts - t0;
      const dt = lastTs === null ? 0.016 : Math.min(0.05, (ts - lastTs) / 1000);
      lastTs = ts;
      if (demo) {
        const step = now < START_MS ? 0 : Math.floor((now - START_MS) / STEP_MS) % DEMO_PAGES.length;
        if (step !== lastStep) { lastStep = step; setCur(DEMO_PAGES[step], false); }
      }
      const target = slotX(cur);
      let left = dt;
      while (left > 0) {
        const h = Math.min(SUBSTEP, left);
        v += (-PILL_STIFFNESS * (x - target) - PILL_DAMPING * v) * h;
        x += v * h;
        left -= h;
      }
      const span = target - fromX;
      if (span !== 0) {
        const over = ((x - target) * Math.sign(span)) / Math.abs(span);
        if (over > peak) peak = over;
        overEl!.textContent = String(Math.round(peak * 100));
      }
      paint();
      raf = requestAnimationFrame(tick);
    }

    if (reduce) {
      demo = false;
      cur = 4;
      x = slotX(cur);
      mark();
      paint();
    } else {
      mark();
      paint();
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
      <div className={styles.pg}>
        <nav className={styles.pg__nav} ref={navRef} aria-label="페이지 이동">
          <span className={styles.pg__pill} ref={pillRef} aria-hidden="true"></span>
          {Array.from({ length: PAGE_COUNT }, (_, i) => (
            <button type="button" className={styles.pg__b} key={i} ref={(el: HTMLButtonElement | null) => { btnRefs.current[i] = el; }}>{i + 1}</button>
          ))}
        </nav>
        <div className={styles.pg__read}>
          <span className={styles.pg__k}>오버슛</span><b ref={overRef}>0</b><span className={styles.pg__u}>%</span>
        </div>
        <p className={styles.pg__sr} ref={srRef} aria-live="polite"></p>
      </div>
    </main>
  );
}
