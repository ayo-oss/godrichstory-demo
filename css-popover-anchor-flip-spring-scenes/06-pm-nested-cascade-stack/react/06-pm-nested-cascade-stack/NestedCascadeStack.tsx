// NestedCascadeStack - vanilla 판(06-pm-nested-cascade-stack) 의 React 포트. 같은 계산을 useEffect 안에서 돌린다.
import { useEffect, useRef } from "react";
import styles from "./NestedCascadeStack.module.scss";

export default function NestedCascadeStack() {
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

    // 기법: 팝오버 안에서 또 열리는 팝오버의 깊이 d 를 세어, 그림자 높이는 d 에 비례해 키우고 크기·밝기는 d 가 늘 때마다 한 단계씩 줄인다.
    const DEPTH_STEP = 0.1;
    const SHADOW_LIFT = 7;
    const SCALE_STEP = 0.07;
    const STAGGER = 260;
    const POP_W = 128;
    const POP_H = 70;
    const X0 = 84;
    const Y0 = 34;
    const STEP_Y = 28;
    const CYCLE_MS = 3000;
    const ops = Array.from(root.querySelectorAll("[data-r=op]")) as HTMLElement[];
    const lv = Array.from(root.querySelectorAll("[data-r=lv]")) as HTMLElement[];
    const openAmt = [0, 0, 0];
    let depth = reduce ? 3 : 0;
    let lastDepth = -1;

    function script(ms: number): void {
      const t = ms % CYCLE_MS;
      const base = 300;
      depth = t < base ? 0 : t < base + STAGGER ? 1 : t < base + 2 * STAGGER ? 2 : t < 1900 ? 3 : t < 1900 + STAGGER ? 2 : t < 1900 + 2 * STAGGER ? 1 : 0;
    }
    function tick(ms: number): void {
      if (demo) script(ms);
      for (let i = 0; i < 3; i += 1) openAmt[i] += ((depth > i ? 1 : 0) - openAmt[i]) * 0.22;
    }
    function snap(): void {
      for (let i = 0; i < 3; i += 1) openAmt[i] = depth > i ? 1 : 0;
    }
    function render(): void {
      const w = root.clientWidth;
      const stepX = clamp((w - X0 - POP_W - 8) / 2, 28, 84);
      for (let i = 0; i < 3; i += 1) {
        const d = i + 1;
        const o = openAmt[i];
        const sc = (1 - (d - 1) * SCALE_STEP) * (0.92 + 0.08 * o);
        const lift = d * SHADOW_LIFT * o;
        const x = X0 + i * stepX - (1 - o) * 14;
        const y = Y0 + i * STEP_Y - (1 - o) * 8;
        lv[i].style.transform = "translate3d(" + x.toFixed(1) + "px," + y.toFixed(1) + "px,0) scale(" + sc.toFixed(3) + ")";
        lv[i].style.opacity = o.toFixed(2);
        lv[i].style.visibility = o > 0.02 ? "visible" : "hidden";
        lv[i].style.filter = "brightness(" + (1 - (d - 1) * DEPTH_STEP).toFixed(2) + ")";
        lv[i].style.boxShadow = "0 " + lift.toFixed(1) + "px " + (lift * 2).toFixed(1) + "px rgba(23, 20, 26, .34)";
      }
      if (depth !== lastDepth) {
        lastDepth = depth;
        for (let i = 0; i < 3; i += 1) ops[i].setAttribute("aria-expanded", depth > i ? "true" : "false");
      }
      const dd = Math.max(1, depth);
      say("depth " + depth + "  lift " + (dd * SHADOW_LIFT) + "  scale " + (1 - (dd - 1) * SCALE_STEP).toFixed(2));
    }
    ops.forEach((el, i) => {
      on(el, "click", () => {
        stopDemo();
        depth = depth > i ? i : i + 1;
        sync();
      });
    });
    on(root, "keydown", (e: KeyboardEvent) => {
      if (e.key !== "Escape" || depth === 0) return;
      e.preventDefault();
      stopDemo();
      depth -= 1;
      ops[depth].focus({ preventScroll: true });
      sync();
    });

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
        <button className={styles["pm__open"] + " " + styles["pm__open--a"]} data-r="op" type="button" aria-expanded="false">설정</button>
        <div className={styles["pm__pop"]} data-r="lv"><b className={styles["pm__ttl"]}>설정</b><button className={styles["pm__open"]} data-r="op" type="button" aria-expanded="false">알림</button></div>
        <div className={styles["pm__pop"]} data-r="lv"><b className={styles["pm__ttl"]}>알림</b><button className={styles["pm__open"]} data-r="op" type="button" aria-expanded="false">소리</button></div>
        <div className={styles["pm__pop"]} data-r="lv"><b className={styles["pm__ttl"]}>소리</b><span className={styles["pm__txt"]}>볼륨 · 진동</span></div>
      </div>
    </main>
  );
}
