// RovingSpotlightMenu - vanilla 판(07-pm-menu-roving-spotlight) 의 React 포트. 같은 계산을 useEffect 안에서 돌린다.
import { useEffect, useRef } from "react";
import styles from "./RovingSpotlightMenu.module.scss";

export default function RovingSpotlightMenu() {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const rootEl = rootRef.current;
    if (!rootEl) return;
    const root: HTMLElement = rootEl;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let demo = !reduce;
    let raf = 0;
    let t0 = -1;
    let last = -1;
    let acc = 0;
    let clock = 0;
    const offs: Array<() => void> = [];
    const live = root.querySelector("[data-r=live]") as HTMLElement;

    function q<T extends Element>(sel: string): T {
      return root.querySelector(sel) as T;
    }
    function clamp(v: number, lo: number, hi: number): number {
      return Math.max(lo, Math.min(hi, v));
    }
    function seg(t: number, a: number, b: number): number {
      const c = clamp((t - a) / (b - a), 0, 1);
      return c * c * (3 - 2 * c);
    }
    function on(el: EventTarget, type: string, fn: (e: any) => void): void {
      el.addEventListener(type, fn);
      offs.push(() => el.removeEventListener(type, fn));
    }
    function stopDemo(): void {
      if (!demo) return;
      demo = false;
      root.removeAttribute("data-demo");
      root.classList.remove("is-demo");
      live.setAttribute("aria-live", "polite");
    }
    if (reduce) live.setAttribute("aria-live", "polite");
    let shown = "";
    function say(s: string): void {
      if (s === shown) return;
      shown = s;
      live.textContent = s;
    }
    function makeRng(seed: number): () => number {
      let s = seed >>> 0;
      return () => {
        s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
        return s / 4294967296;
      };
    }
    function local(e: PointerEvent): { x: number; y: number } {
      const r = root.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    }
    function sync(): void {
      if (reduce) {
        snap();
        render();
      }
    }

    // 기법: 강조 알약의 위치와 높이를 각각 스프링(PILL_STIFF, PILL_DAMP)으로 풀어 가리킨 항목을 쫓게 하고, 항목이 바뀔 때마다 SHEEN_W 폭의 빛줄기를 한 번 훑는다.
    const PILL_STIFF = 0.18;
    const PILL_DAMP = 0.72;
    const SHEEN_W = 48;
    const ITEM_H = 32;
    const SHEEN_MS = 420;
    const STEP_MS = 420;
    const SEQ = [0, 2, 3, 1, 0];
    const menu = q<HTMLElement>("[data-r=menu]");
    const pill = q<HTMLElement>("[data-r=pill]");
    const sheen = q<HTMLElement>("[data-r=sheen]");
    const its = Array.from(root.querySelectorAll("[data-r=it]")) as HTMLElement[];
    let want = 0;
    let prevWant = -1;
    let py = 0;
    let ph = ITEM_H;
    let vy = 0;
    let vh = 0;
    let sheenT = SHEEN_MS;
    let placed = false;

    function goalY(): number {
      return its[want].offsetTop;
    }
    function goalH(): number {
      return its[want].offsetHeight || ITEM_H;
    }
    function tick(ms: number): void {
      if (demo) want = SEQ[Math.floor(Math.max(0, ms - 200) / STEP_MS) % SEQ.length];
      if (!placed) snap();
      if (want !== prevWant) {
        prevWant = want;
        sheenT = 0;
      }
      vy = (vy + (goalY() - py) * PILL_STIFF) * PILL_DAMP;
      py += vy;
      vh = (vh + (goalH() - ph) * PILL_STIFF) * PILL_DAMP;
      ph += vh;
      sheenT = Math.min(SHEEN_MS, sheenT + 1000 / 60);
    }
    function snap(): void {
      py = goalY();
      ph = goalH();
      vy = 0;
      vh = 0;
      prevWant = want;
      sheenT = SHEEN_MS;
      placed = true;
    }
    function render(): void {
      pill.style.height = ph.toFixed(1) + "px";
      pill.style.transform = "translate3d(0," + py.toFixed(1) + "px,0)";
      const wide = pill.clientWidth;
      const p = sheenT / SHEEN_MS;
      sheen.style.width = SHEEN_W + "px";
      sheen.style.transform = "translate3d(" + (-SHEEN_W + p * (wide + SHEEN_W)).toFixed(1) + "px,0,0) skewX(-18deg)";
      sheen.style.opacity = p >= 1 ? "0" : "1";
      for (let i = 0; i < its.length; i += 1) {
        if (i === want) its[i].setAttribute("data-on", "1");
        else its[i].removeAttribute("data-on");
      }
      say("item " + (want + 1) + "  y " + Math.round(py) + "  h " + Math.round(ph));
    }
    function pick(i: number): void {
      stopDemo();
      want = i;
      sync();
    }
    its.forEach((el, i) => {
      on(el, "pointerenter", () => pick(i));
      on(el, "focus", () => pick(i));
      on(el, "keydown", (e: KeyboardEvent) => {
        const d = e.key === "ArrowDown" ? 1 : e.key === "ArrowUp" ? -1 : 0;
        if (d === 0) return;
        e.preventDefault();
        const n = (i + d + its.length) % its.length;
        its[n].focus({ preventScroll: true });
      });
    });

    snap();

    const FRAME_MS = 1000 / 60;
    function frame(ts: number): void {
      if (t0 < 0) {
        t0 = ts;
        last = ts;
      }
      acc += Math.min(100, ts - last);
      last = ts;
      let n = 0;
      while (acc >= FRAME_MS && n < 6) {
        clock += FRAME_MS;
        tick(clock);
        acc -= FRAME_MS;
        n += 1;
      }
      if (n === 6) acc = 0;
      render();
      raf = requestAnimationFrame(frame);
    }
    const ro = new ResizeObserver(() => sync());
    ro.observe(root);
    if (reduce) {
      stopDemo();
      snap();
      render();
    } else {
      raf = requestAnimationFrame(frame);
    }
    return () => {
      cancelAnimationFrame(raf);
      offs.forEach((f) => f());
      ro.disconnect();
    };

  }, []);

  return (
    <main className={styles["stage"]}>
      <div ref={rootRef} className={styles["pm"] + " is-demo"} data-demo="1">
        <p className={styles["pm__live"]} data-r="live" aria-live="off" aria-atomic="true"></p>
        <div className={styles["pm__menu"]} data-r="menu">
          <i className={styles["pm__pill"]} data-r="pill"><i className={styles["pm__sheen"]} data-r="sheen"></i></i>
          <button className={styles["pm__it"]} data-r="it" type="button">프로필</button>
          <button className={styles["pm__it"]} data-r="it" type="button">알림</button>
          <button className={styles["pm__it"]} data-r="it" type="button">요금</button>
          <button className={styles["pm__it"] + " " + styles["pm__it--tall"]} data-r="it" type="button">로그아웃</button>
        </div>
      </div>
    </main>
  );
}
