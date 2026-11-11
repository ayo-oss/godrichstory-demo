// ArrowTracksAnchor - vanilla 판(04-pm-arrow-tracks-anchor) 의 React 포트. 같은 계산을 useEffect 안에서 돌린다.
import { useEffect, useRef } from "react";
import styles from "./ArrowTracksAnchor.module.scss";

export default function ArrowTracksAnchor() {
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

    // 기법: 몸통은 EDGE_PAD 에서 막혀 앵커보다 최대 SHIFT_MAX 만큼 덜 가고, 화살표 끝은 따로 ARROW_LERP 로 앵커 중심을 쫓는다. 꼬리와 몸통이 서로 다른 속도로 움직인다.
    const ARROW_LERP = 0.15;
    const EDGE_PAD = 8;
    const ARROW_SIZE = 8;
    const SHIFT_MAX = 72;
    const BODY_W = 168;
    const BODY_H = 56;
    const BODY_LERP = 0.35;
    const ANCHOR_R = 14;
    const GAP = 12;
    const SWEEP_MS = 2400;
    const anchor = q<HTMLElement>("[data-r=anchor]");
    const pop = q<HTMLElement>("[data-r=pop]");
    const arrow = q<HTMLElement>("[data-r=arrow]");
    const line = q<HTMLElement>("[data-r=line]");
    let nx = reduce ? 0.94 : 0.5;
    let bodyX = 0;
    let tip = 0;
    let placed = false;
    let dragging = false;
    let shift = 0;

    function axOf(w: number): number {
      return clamp(nx * w, EDGE_PAD + BODY_W / 2 - SHIFT_MAX, w - EDGE_PAD - BODY_W / 2 + SHIFT_MAX);
    }
    function bodyTarget(w: number, ax: number): number {
      const desired = ax - BODY_W / 2;
      const clamped = clamp(desired, EDGE_PAD, w - EDGE_PAD - BODY_W);
      shift = clamp(clamped - desired, -SHIFT_MAX, SHIFT_MAX);
      return desired + shift;
    }
    function tick(ms: number): void {
      if (demo) nx = 0.5 + 0.47 * Math.sin((Math.max(0, ms - 200) / SWEEP_MS) * Math.PI * 2);
      const w = root.clientWidth;
      const ax = axOf(w);
      if (!placed) snap();
      bodyX += (bodyTarget(w, ax) - bodyX) * BODY_LERP;
      tip += (ax - tip) * ARROW_LERP;
    }
    function snap(): void {
      const w = root.clientWidth;
      const ax = axOf(w);
      bodyX = bodyTarget(w, ax);
      tip = ax;
      placed = true;
    }
    function render(): void {
      const w = root.clientWidth;
      const h = root.clientHeight;
      const ax = axOf(w);
      const ay = h * 0.3;
      const by = ay + ANCHOR_R + GAP;
      anchor.style.transform = "translate3d(" + (ax - ANCHOR_R).toFixed(1) + "px," + (ay - ANCHOR_R).toFixed(1) + "px,0)";
      pop.style.transform = "translate3d(" + bodyX.toFixed(1) + "px," + by.toFixed(1) + "px,0)";
      const rel = clamp(tip - bodyX, ARROW_SIZE + 6, BODY_W - ARROW_SIZE - 6);
      arrow.style.transform = "translate3d(" + (rel - ARROW_SIZE).toFixed(1) + "px," + (-ARROW_SIZE).toFixed(1) + "px,0) rotate(45deg)";
      line.style.transform = "translate3d(" + (ax - 1).toFixed(1) + "px," + (ay + ANCHOR_R).toFixed(1) + "px,0) scale(1," + (by - ay - ANCHOR_R).toFixed(1) + ")";
      say("shift " + Math.round(shift) + "  gap " + Math.round(Math.abs(tip - ax)));
    }
    function moveTo(e: PointerEvent): void {
      nx = clamp(local(e).x / root.clientWidth, 0.04, 0.96);
      sync();
    }
    on(root, "pointerdown", (e: PointerEvent) => {
      stopDemo();
      dragging = true;
      root.setPointerCapture(e.pointerId);
      moveTo(e);
    });
    on(root, "pointermove", (e: PointerEvent) => {
      if (dragging) moveTo(e);
    });
    on(root, "pointerup", () => {
      dragging = false;
    });
    on(root, "pointercancel", () => {
      dragging = false;
    });
    on(anchor, "keydown", (e: KeyboardEvent) => {
      const dx = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
      if (dx === 0) return;
      e.preventDefault();
      stopDemo();
      nx = clamp(nx + dx * 0.06, 0.04, 0.96);
      sync();
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
        <i className={styles["pm__line"]} data-r="line"></i>
        <div className={styles["pm__pop"]} data-r="pop"><i className={styles["pm__arrow"]} data-r="arrow"></i><span className={styles["pm__txt"]}>이메일 주소를 확인하세요</span></div>
        <button className={styles["pm__anchor"]} data-r="anchor" type="button" aria-label="앵커 · 좌우 방향키로 옮기기"></button>
      </div>
    </main>
  );
}
