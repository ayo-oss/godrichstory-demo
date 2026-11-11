// RubberEdgeDrag - vanilla 판(05-pm-rubber-edge-drag) 의 React 포트. 같은 계산을 useEffect 안에서 돌린다.
import { useEffect, useRef } from "react";
import styles from "./RubberEdgeDrag.module.scss";

export default function RubberEdgeDrag() {
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

    // 기법: 팝오버 목표 위치가 허용 범위를 넘으면 넘은 거리에 저항(RUBBER)을 곱하고 LAG 에서 포화시킨 뒤, FOLLOW_LERP 관성으로 쫓아간다.
    const FOLLOW_LERP = 0.14;
    const RUBBER = 0.55;
    const EDGE_PAD = 20;
    const LAG = 28;
    const POP_W = 116;
    const POP_H = 56;
    const ANCHOR_R = 14;
    const LIFT = 10;
    const SWEEP_MS = 2600;
    const anchor = q<HTMLElement>("[data-r=anchor]");
    const pop = q<HTMLElement>("[data-r=pop]");
    const tether = q<HTMLElement>("[data-r=tether]");
    const bound = q<HTMLElement>("[data-r=bound]");
    let nx = reduce ? 0.94 : 0.5;
    let ny = reduce ? 0.2 : 0.55;
    let px = 0;
    let py = 0;
    let placed = false;
    let dragging = false;
    let overX = 0;
    let overY = 0;

    function rubber(over: number): number {
      const o = Math.abs(over);
      const r = LAG * (1 - 1 / (1 + (o * RUBBER) / LAG));
      return over < 0 ? -r : r;
    }
    function resist(v: number, lo: number, hi: number): number {
      if (v < lo) return lo + rubber(v - lo);
      if (v > hi) return hi + rubber(v - hi);
      return v;
    }
    function goal(): number[] {
      const w = root.clientWidth;
      const h = root.clientHeight;
      const tx = nx * w - POP_W / 2;
      const ty = ny * h - ANCHOR_R - LIFT - POP_H;
      const lx = EDGE_PAD;
      const hx = w - EDGE_PAD - POP_W;
      const ly = EDGE_PAD;
      const hy = h - EDGE_PAD - POP_H;
      overX = tx < lx ? tx - lx : tx > hx ? tx - hx : 0;
      overY = ty < ly ? ty - ly : ty > hy ? ty - hy : 0;
      return [resist(tx, lx, hx), resist(ty, ly, hy)];
    }
    function tick(ms: number): void {
      if (demo) {
        const t = Math.max(0, ms - 200);
        nx = clamp(0.5 + 0.58 * Math.sin((t / SWEEP_MS) * Math.PI * 2), 0.06, 0.94);
        ny = clamp(0.5 + 0.5 * Math.sin((t / 1700) * Math.PI * 2 + 1), 0.08, 0.94);
      }
      const g = goal();
      if (!placed) snap();
      px += (g[0] - px) * FOLLOW_LERP;
      py += (g[1] - py) * FOLLOW_LERP;
    }
    function snap(): void {
      const g = goal();
      px = g[0];
      py = g[1];
      placed = true;
    }
    function render(): void {
      const w = root.clientWidth;
      const h = root.clientHeight;
      const ax = nx * w;
      const ay = ny * h;
      anchor.style.transform = "translate3d(" + (ax - ANCHOR_R).toFixed(1) + "px," + (ay - ANCHOR_R).toFixed(1) + "px,0)";
      pop.style.transform = "translate3d(" + px.toFixed(1) + "px," + py.toFixed(1) + "px,0)";
      const cx = px + POP_W / 2;
      const cy = py + POP_H / 2;
      const len = Math.hypot(cx - ax, cy - ay);
      tether.style.transform = "translate3d(" + ax.toFixed(1) + "px," + (ay - 1).toFixed(1) + "px,0) rotate(" + Math.atan2(cy - ay, cx - ax).toFixed(4) + "rad) scale(" + len.toFixed(1) + ",1)";
      bound.style.transform = "translate3d(" + EDGE_PAD + "px," + EDGE_PAD + "px,0)";
      bound.style.width = Math.max(0, w - 2 * EDGE_PAD) + "px";
      bound.style.height = Math.max(0, h - 2 * EDGE_PAD) + "px";
      say("over " + Math.round(Math.hypot(overX, overY)) + "  stretch " + Math.round(Math.hypot(rubber(overX), rubber(overY))));
    }
    function moveTo(e: PointerEvent): void {
      const p = local(e);
      nx = clamp(p.x / root.clientWidth, 0.04, 0.96);
      ny = clamp(p.y / root.clientHeight, 0.06, 0.96);
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
      const dy = e.key === "ArrowDown" ? 1 : e.key === "ArrowUp" ? -1 : 0;
      if (dx === 0 && dy === 0) return;
      e.preventDefault();
      stopDemo();
      nx = clamp(nx + dx * 0.06, 0.04, 0.96);
      ny = clamp(ny + dy * 0.08, 0.06, 0.96);
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
        <i className={styles["pm__bound"]} data-r="bound"></i>
        <i className={styles["pm__tether"]} data-r="tether"></i>
        <div className={styles["pm__pop"]} data-r="pop"><b className={styles["pm__ttl"]}>메모</b><span className={styles["pm__txt"]}>끌어서 옮기세요</span></div>
        <button className={styles["pm__anchor"]} data-r="anchor" type="button" aria-label="핀 · 방향키로 옮기기"></button>
      </div>
    </main>
  );
}
