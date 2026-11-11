// FixedSlotPager — vanilla 판(01-pager-fixed-slot-window-ellipsis-collapse) 의 React 포트.
// 어느 쪽에서도 버튼 칸 수(SLOT_COUNT)가 같도록 보이는 번호를 계산한다. 숫자가 바뀐 칸만 transform 으로 튕긴다.
import { useEffect, useRef } from "react";
import styles from "./FixedSlotPager.module.scss";

type Box<T> = { current: T };

const SLOT_COUNT = 7;
const TOTAL_PAGES = 40;
const GAP = -1;
const STEP_MS = 230;
const START_MS = 120;
const DEMO_PAGES = [1, 2, 4, 5, 9, 17, 26, 35, 37, 40, 36, 21, 3];

function windowSlots(cur: number, total: number, slots: number): number[] {
  const out: number[] = [];
  if (total <= slots) {
    for (let i = 1; i <= total; i += 1) out.push(i);
    return out;
  }
  const inner = slots - 4;
  if (cur <= slots - 3) {
    for (let i = 1; i <= slots - 2; i += 1) out.push(i);
    out.push(GAP, total);
    return out;
  }
  if (cur >= total - slots + 4) {
    out.push(1, GAP);
    for (let i = total - slots + 3; i <= total; i += 1) out.push(i);
    return out;
  }
  const lo = cur - Math.floor((inner - 1) / 2);
  out.push(1, GAP);
  for (let i = 0; i < inner; i += 1) out.push(lo + i);
  out.push(GAP, total);
  return out;
}

export default function FixedSlotPager() {
  const navRef = useRef<HTMLElement | null>(null) as Box<HTMLElement | null>;
  const curRef = useRef<HTMLElement | null>(null) as Box<HTMLElement | null>;
  const srRef = useRef<HTMLParagraphElement | null>(null) as Box<HTMLParagraphElement | null>;
  const btnRefs = useRef<Array<HTMLButtonElement | null>>([]) as Box<Array<HTMLButtonElement | null>>;
  const kindRefs = useRef<Array<HTMLSpanElement | null>>([]) as Box<Array<HTMLSpanElement | null>>;

  useEffect(() => {
    const nav = navRef.current;
    const curEl = curRef.current;
    const sr = srRef.current;
    if (!nav || !curEl || !sr) return;
    const btns = btnRefs.current;
    const kinds = kindRefs.current;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const pulse: number[] = [];
    const jump: number[] = [];
    for (let i = 0; i < SLOT_COUNT; i += 1) { pulse.push(-1); jump.push(1); }

    let demo = true;
    let cur = 1;
    let t0: number | null = null;
    let lastStep = -1;
    let wantFocus = false;
    let raf = 0;
    const perfNow = (): number => (t0 === null ? 0 : performance.now() - t0);

    function render(now: number): void {
      const arr = windowSlots(cur, TOTAL_PAGES, SLOT_COUNT);
      for (let s = 0; s < SLOT_COUNT; s += 1) {
        const v = arr[s];
        const el = btns[s];
        const kind = kinds[s];
        if (!el || !kind) continue;
        const isGap = v === GAP;
        const txt = isGap ? "…" : String(v);
        if (el.textContent !== txt) {
          el.textContent = txt;
          if (!reduce) pulse[s] = now;
        }
        el.className = [styles.pg__b, isGap ? styles["is-gap"] : "", v === cur ? styles["is-cur"] : ""].join(" ");
        if (v === cur) el.setAttribute("aria-current", "page"); else el.removeAttribute("aria-current");
        el.setAttribute("aria-hidden", isGap ? "true" : "false");
        el.tabIndex = isGap ? -1 : 0;
        jump[s] = isGap ? Math.round((arr[s - 1] + arr[s + 1]) / 2) : v;
        const kindClass = isGap ? styles["is-gap"] : v === 1 || v === TOTAL_PAGES ? styles["is-edge"] : styles["is-win"];
        kind.className = [styles.pg__kind, kindClass].join(" ");
        if (v === cur && wantFocus) { el.focus({ preventScroll: true }); wantFocus = false; }
      }
      curEl!.textContent = String(cur);
    }

    function go(n: number, byUser: boolean): void {
      const next = Math.max(1, Math.min(TOTAL_PAGES, n));
      if (byUser) demo = false;
      if (next === cur) return;
      cur = next;
      render(perfNow());
      if (byUser) sr!.textContent = "현재 " + cur + " / " + TOTAL_PAGES;
    }

    const onClick = (e: MouseEvent): void => {
      const idx = btns.indexOf(e.target as HTMLButtonElement);
      if (idx >= 0) go(jump[idx], true);
    };
    const onKey = (e: KeyboardEvent): void => {
      let to: number | null = null;
      if (e.key === "ArrowRight") to = cur + 1;
      else if (e.key === "ArrowLeft") to = cur - 1;
      else if (e.key === "Home") to = 1;
      else if (e.key === "End") to = TOTAL_PAGES;
      if (to === null) return;
      e.preventDefault();
      wantFocus = true;
      go(to, true);
      wantFocus = false;
    };
    nav.addEventListener("click", onClick);
    nav.addEventListener("keydown", onKey);

    function tick(ts: number): void {
      if (t0 === null) t0 = ts;
      const now = ts - t0;
      if (demo) {
        const step = now < START_MS ? 0 : Math.floor((now - START_MS) / STEP_MS) % DEMO_PAGES.length;
        if (step !== lastStep) {
          lastStep = step;
          cur = DEMO_PAGES[step];
          render(now);
        }
      }
      for (let s = 0; s < SLOT_COUNT; s += 1) {
        if (pulse[s] < 0) continue;
        const age = now - pulse[s];
        const sc = age >= 420 ? 1 : 1 - 0.5 * Math.exp(-age / 80) * Math.cos(age / 60);
        const el = btns[s];
        if (el) el.style.transform = sc === 1 ? "" : "scale(" + sc.toFixed(3) + ")";
        if (sc === 1) pulse[s] = -1;
      }
      raf = requestAnimationFrame(tick);
    }

    if (reduce) {
      demo = false;
      cur = 17;
      render(0);
    } else {
      cur = DEMO_PAGES[0];
      render(0);
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
          {Array.from({ length: SLOT_COUNT }, (_, i) => (
            <button type="button" className={styles.pg__b} key={i} ref={(el: HTMLButtonElement | null) => { btnRefs.current[i] = el; }}></button>
          ))}
        </nav>
        <div className={styles.pg__kinds} aria-hidden="true">
          {Array.from({ length: SLOT_COUNT }, (_, i) => (
            <span className={styles.pg__kind} key={i} ref={(el: HTMLSpanElement | null) => { kindRefs.current[i] = el; }}></span>
          ))}
        </div>
        <div className={styles.pg__read}>
          <span className={styles.pg__k}>현재</span><b ref={curRef}>1</b>
          <span className={styles.pg__k}>전체</span><b>{TOTAL_PAGES}</b>
          <span className={styles.pg__k}>칸</span><b>{SLOT_COUNT}</b>
        </div>
        <p className={styles.pg__sr} ref={srRef} aria-live="polite"></p>
      </div>
    </main>
  );
}
