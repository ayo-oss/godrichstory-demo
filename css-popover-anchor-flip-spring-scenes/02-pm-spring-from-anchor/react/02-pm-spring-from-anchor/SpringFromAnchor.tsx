// SpringFromAnchor - vanilla 판(02-pm-spring-from-anchor) 의 React 포트. 같은 계산을 useEffect 안에서 돌린다.
import { useEffect, useRef } from "react";
import styles from "./SpringFromAnchor.module.scss";

export default function SpringFromAnchor() {
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

    // 기법: transform-origin 을 앵커 중심(ORIGIN_X, ORIGIN_Y)으로 계산해 두고, scale 을 스프링으로 풀면 목표 1 을 넘었다 돌아오며 앵커에서 자란 것처럼 보인다.
    const STIFFNESS = 0.14;
    const DAMPING = 0.66;
    const PANEL_W = 156;
    const PANEL_H = 92;
    const ANCHOR_R = 14;
    const SLOTS = [0.16, 0.5, 0.84];
    const ANCHOR_NY = 0.22;
    const PAD = 8;
    const CYCLE_MS = 2400;
    const anchor = q<HTMLElement>("[data-r=anchor]");
    const pop = q<HTMLElement>("[data-r=pop]");
    const origin = q<HTMLElement>("[data-r=origin]");
    const moveBtn = q<HTMLElement>("[data-r=move]");
    let ORIGIN_X = 0;
    let ORIGIN_Y = 0;
    let size = 0;
    let vel = 0;
    let want = reduce;
    let slot = 1;
    let nx = SLOTS[1];
    let expanded = false;
    let peak = 0;

    function place(): number[] {
      const w = root.clientWidth;
      const h = root.clientHeight;
      const ax = nx * w;
      const ay = ANCHOR_NY * h;
      const x = clamp(ax - PANEL_W / 2, PAD, w - PAD - PANEL_W);
      const y = ay + ANCHOR_R + 10;
      ORIGIN_X = ax - x;
      ORIGIN_Y = ay - y;
      return [ax, ay, x, y];
    }
    function tick(ms: number): void {
      if (demo) {
        const cycle = Math.floor(ms / CYCLE_MS);
        const phase = ms - cycle * CYCLE_MS;
        want = phase >= 250 && phase < 1350;
        slot = (cycle + (phase >= 1900 ? 1 : 0)) % SLOTS.length;
      }
      nx += (SLOTS[slot] - nx) * 0.2;
      vel = (vel + ((want ? 1 : 0) - size) * STIFFNESS) * DAMPING;
      size += vel;
      if (size < 0) {
        size = 0;
        vel = 0;
      }
      if (want) peak = Math.max(peak, size);
      else if (size < 0.02) peak = 0;
    }
    function snap(): void {
      nx = SLOTS[slot];
      size = want ? 1 : 0;
      vel = 0;
      peak = size;
    }
    function render(): void {
      const p = place();
      anchor.style.transform = "translate3d(" + (p[0] - ANCHOR_R).toFixed(1) + "px," + (p[1] - ANCHOR_R).toFixed(1) + "px,0)";
      origin.style.transform = "translate3d(" + (p[0] - 3).toFixed(1) + "px," + (p[1] - 3).toFixed(1) + "px,0)";
      pop.style.transformOrigin = ORIGIN_X.toFixed(1) + "px " + ORIGIN_Y.toFixed(1) + "px";
      pop.style.transform = "translate3d(" + p[2].toFixed(1) + "px," + p[3].toFixed(1) + "px,0) scale(" + size.toFixed(3) + ")";
      pop.style.opacity = String(clamp(size * 1.8, 0, 1));
      pop.style.visibility = size > 0.01 ? "visible" : "hidden";
      if (want !== expanded) {
        expanded = want;
        anchor.setAttribute("aria-expanded", want ? "true" : "false");
      }
      say("scale " + size.toFixed(2) + "  peak " + peak.toFixed(2));
    }
    function toggle(): void {
      stopDemo();
      want = !want;
      sync();
    }
    on(anchor, "click", toggle);
    on(moveBtn, "click", () => {
      stopDemo();
      slot = (slot + 1) % SLOTS.length;
      sync();
    });
    on(root, "keydown", (e: KeyboardEvent) => {
      if (e.key !== "Escape" || !want) return;
      e.preventDefault();
      stopDemo();
      want = false;
      anchor.focus({ preventScroll: true });
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
        <button className={styles["pm__move"]} data-r="move" type="button">자리 옮기기</button>
        <i className={styles["pm__origin"]} data-r="origin"></i>
        <button className={styles["pm__anchor"]} data-r="anchor" type="button" aria-expanded="false" aria-controls="pm-panel" aria-label="빠른 설정 열기"></button>
        <div className={styles["pm__pop"]} id="pm-panel" data-r="pop"><b className={styles["pm__ttl"]}>빠른 설정</b><span className={styles["pm__row"]}><i className={styles["pm__sw"]}></i>알림</span><span className={styles["pm__row"]}><i className={styles["pm__sw"] + " " + styles["pm__sw--on"]}></i>소리</span><span className={styles["pm__row"]}><i className={styles["pm__sw"]}></i>진동</span></div>
      </div>
    </main>
  );
}
