// CollisionFlipPopover - vanilla 판(01-pm-anchor-collision-flip) 의 React 포트. 같은 계산을 useEffect 안에서 돌린다.
import { useEffect, useRef } from "react";
import styles from "./CollisionFlipPopover.module.scss";

export default function CollisionFlipPopover() {
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

    // 기법: 앵커 사방의 여유 공간을 재서 팝오버가 들어갈 자리가 있는 쪽 중 가장 넉넉한 쪽을 고른다. 지금 쪽이 FLIP_BIAS 이내로 버티면 그대로 둬 경계에서 깜박이지 않는다.
    const GAP = 12;
    const EDGE_PAD = 8;
    const ARROW_SIZE = 8;
    const FLIP_BIAS = 24;
    const POP_W = 116;
    const POP_H = 52;
    const ANCHOR_R = 14;
    const SEG_MS = 520;
    const NAMES = ["TOP", "RIGHT", "BOTTOM", "LEFT"];
    const PATH = [[0.5, 0.3], [0.9, 0.28], [0.86, 0.82], [0.14, 0.84], [0.1, 0.22], [0.5, 0.3]];
    const anchor = q<HTMLElement>("[data-r=anchor]");
    const pop = q<HTMLElement>("[data-r=pop]");
    const arrow = q<HTMLElement>("[data-r=arrow]");
    const sideEl = q<HTMLElement>("[data-r=side]");
    const guides = [0, 1, 2, 3].map((i) => q<HTMLElement>("[data-r=g" + i + "]"));
    const free: number[] = [0, 0, 0, 0];
    let nx = reduce ? PATH[2][0] : PATH[0][0];
    let ny = reduce ? PATH[2][1] : PATH[0][1];
    let side = 2;
    let px = 0;
    let py = 0;
    let placed = false;
    let dragging = false;

    function choose(w: number, h: number, ax: number, ay: number): void {
      free[0] = ay - ANCHOR_R - EDGE_PAD;
      free[1] = w - ax - ANCHOR_R - EDGE_PAD;
      free[2] = h - ay - ANCHOR_R - EDGE_PAD;
      free[3] = ax - ANCHOR_R - EDGE_PAD;
      const score = [0, 1, 2, 3].map((s) => free[s] - ((s % 2 === 0 ? POP_H : POP_W) + GAP));
      let best = 0;
      for (let s = 1; s < 4; s += 1) {
        if (score[s] > score[best]) best = s;
      }
      if (score[side] < 0 || score[side] < score[best] - FLIP_BIAS) side = best;
    }
    function target(w: number, h: number, ax: number, ay: number): number[] {
      if (side === 0 || side === 2) {
        const x = clamp(ax - POP_W / 2, EDGE_PAD, w - EDGE_PAD - POP_W);
        return [x, side === 2 ? ay + ANCHOR_R + GAP : ay - ANCHOR_R - GAP - POP_H];
      }
      const y = clamp(ay - POP_H / 2, EDGE_PAD, h - EDGE_PAD - POP_H);
      return [side === 1 ? ax + ANCHOR_R + GAP : ax - ANCHOR_R - GAP - POP_W, y];
    }
    function pathAt(ms: number): number[] {
      const u = Math.max(0, ms - 200) / SEG_MS;
      const n = PATH.length - 1;
      const i = Math.floor(u) % n;
      const f = seg(u - Math.floor(u), 0, 1);
      return [PATH[i][0] + (PATH[i + 1][0] - PATH[i][0]) * f, PATH[i][1] + (PATH[i + 1][1] - PATH[i][1]) * f];
    }
    function solve(instant: boolean): void {
      const w = root.clientWidth;
      const h = root.clientHeight;
      choose(w, h, nx * w, ny * h);
      const t2 = target(w, h, nx * w, ny * h);
      if (!placed || instant) {
        px = t2[0];
        py = t2[1];
        placed = true;
      } else {
        px += (t2[0] - px) * 0.28;
        py += (t2[1] - py) * 0.28;
      }
    }
    function tick(ms: number): void {
      if (demo) {
        const p = pathAt(ms);
        nx = p[0];
        ny = p[1];
      }
      solve(false);
    }
    function snap(): void {
      placed = false;
      solve(true);
    }
    function render(): void {
      const w = root.clientWidth;
      const h = root.clientHeight;
      const ax = nx * w;
      const ay = ny * h;
      anchor.style.transform = "translate3d(" + (ax - ANCHOR_R).toFixed(1) + "px," + (ay - ANCHOR_R).toFixed(1) + "px,0)";
      pop.style.transform = "translate3d(" + px.toFixed(1) + "px," + py.toFixed(1) + "px,0)";
      let cx = 0;
      let cy = 0;
      if (side === 0 || side === 2) {
        cx = clamp(ax - px, 14, POP_W - 14);
        cy = side === 2 ? 0 : POP_H;
      } else {
        cx = side === 1 ? 0 : POP_W;
        cy = clamp(ay - py, 14, POP_H - 14);
      }
      arrow.style.transform = "translate3d(" + (cx - ARROW_SIZE).toFixed(1) + "px," + (cy - ARROW_SIZE).toFixed(1) + "px,0) rotate(45deg)";
      sideEl.textContent = NAMES[side];
      guides[0].style.transform = "translate3d(" + (ax - 1).toFixed(1) + "px,0,0) scale(1," + Math.max(0, ay).toFixed(1) + ")";
      guides[2].style.transform = "translate3d(" + (ax - 1).toFixed(1) + "px," + ay.toFixed(1) + "px,0) scale(1," + Math.max(0, h - ay).toFixed(1) + ")";
      guides[3].style.transform = "translate3d(0," + (ay - 1).toFixed(1) + "px,0) scale(" + Math.max(0, ax).toFixed(1) + ",1)";
      guides[1].style.transform = "translate3d(" + ax.toFixed(1) + "px," + (ay - 1).toFixed(1) + "px,0) scale(" + Math.max(0, w - ax).toFixed(1) + ",1)";
      for (let s = 0; s < 4; s += 1) {
        if (s === side) guides[s].setAttribute("data-hot", "1");
        else guides[s].removeAttribute("data-hot");
      }
      say("T " + Math.round(free[0]) + "  R " + Math.round(free[1]) + "  B " + Math.round(free[2]) + "  L " + Math.round(free[3]));
    }
    function moveTo(e: PointerEvent): void {
      const p = local(e);
      nx = clamp(p.x / root.clientWidth, 0.05, 0.95);
      ny = clamp(p.y / root.clientHeight, 0.08, 0.92);
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
      nx = clamp(nx + dx * 0.06, 0.05, 0.95);
      ny = clamp(ny + dy * 0.08, 0.08, 0.92);
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
        <i className={styles["pm__g"]} data-r="g0"></i><i className={styles["pm__g"]} data-r="g1"></i><i className={styles["pm__g"]} data-r="g2"></i><i className={styles["pm__g"]} data-r="g3"></i>
        <div className={styles["pm__pop"]} data-r="pop"><i className={styles["pm__arrow"]} data-r="arrow"></i><b className={styles["pm__side"]} data-r="side">BOTTOM</b><span className={styles["pm__sub"]}>도움말 말풍선</span></div>
        <button className={styles["pm__anchor"]} data-r="anchor" type="button" aria-label="앵커 · 방향키로 옮기기"></button>
      </div>
    </main>
  );
}
