// GridSnapGuides - vanilla 판(08-rh-grid-snap-guides) 의 React 포트. 같은 계산을 useEffect 안에서 돌린다.
import { useEffect, useRef } from "react";
import styles from "./GridSnapGuides.module.scss";

export default function GridSnapGuides() {
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
    const offs: Array<() => void> = [];

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
      demo = false;
      root.removeAttribute("data-demo");
      root.classList.remove("is-demo");
    }
    function pos(e: PointerEvent): { x: number; y: number } {
      const r = root.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    }
    function spring(x: number, v: number, to: number, k: number, c: number, dt: number): number[] {
      const n = Math.max(1, Math.ceil(dt / 0.008));
      const h = dt / n;
      for (let i = 0; i < n; i += 1) {
        v += (-k * (x - to) - c * v) * h;
        x += v * h;
      }
      return [x, v];
    }
    function sync(): void {
      if (reduce) {
        snap();
        render();
      }
    }

    // 기법: 가장자리가 격자선·이웃 가장자리에서 SNAP_DIST 안이면 거리에 비례해 끌려간다.
    // 끌림은 v = c + (raw - c) * (d / SNAP_DIST) 라서 선 위에서는 평평하고 멀어질수록 손을 따라간다.
    // 선에 거의 닿으면 안내선이 번쩍 켜지고 GUIDE_FADE 시간 상수로 사라진다.
    const GRID_STEP = 24;
    const SNAP_DIST = 12;
    const GUIDE_FADE = 0.35;
    const MIN_SIDE = 48;
    const box = q<HTMLElement>("[data-r=box]");
    const nb = q<HTMLElement>("[data-r=nb]");
    const grip = q<HTMLElement>("[data-r=grip]");
    const gv = q<HTMLElement>("[data-r=gv]");
    const gh = q<HTMLElement>("[data-r=gh]");
    const gapEl = q<HTMLElement>("[data-r=gap]");
    const stepEl = q<HTMLElement>("[data-r=step]");
    const cursor = q<HTMLElement>("[data-r=cursor]");
    let bw = 0;
    let bh = 0;
    let rawR = 0;
    let rawB = 0;
    let px = 0;
    let py = 0;
    let gx = 0;
    let gy = 0;
    let aV = 0;
    let aH = 0;
    let posV = 0;
    let posH = 0;
    let dragging = false;
    let ready = false;
    root.style.setProperty("--step", GRID_STEP + "px");

    function nbLeft(): number { return Math.floor(root.clientWidth * 0.62) + 7; }
    function nbWidth(): number { return Math.max(56, root.clientWidth * 0.22); }
    function nbTop(): number { return GRID_STEP + 5; }
    function nbHeight(): number { return Math.floor(root.clientHeight * 0.4); }

    function snapEdge(r: number, cands: number[]): number[] {
      let best = cands[0];
      for (let i = 1; i < cands.length; i += 1) {
        if (Math.abs(cands[i] - r) < Math.abs(best - r)) best = cands[i];
      }
      const d = Math.abs(r - best);
      if (d >= SNAP_DIST) return [r, 0, best];
      return [best + (r - best) * (d / SNAP_DIST), d < SNAP_DIST * 0.4 ? 1 : 0, best];
    }

    function resolve(dt: number): void {
      const gridX = Math.round(rawR / GRID_STEP) * GRID_STEP;
      const gridY = Math.round(rawB / GRID_STEP) * GRID_STEP;
      const sx = snapEdge(rawR, [gridX, nbLeft(), nbLeft() + nbWidth()]);
      const sy = snapEdge(rawB, [gridY, nbTop() + nbHeight()]);
      bw = Math.max(MIN_SIDE, sx[0] - GRID_STEP);
      bh = Math.max(MIN_SIDE, sy[0] - GRID_STEP);
      if (sx[1] === 1) { aV = 1; posV = sx[2]; } else aV *= Math.exp(-dt / GUIDE_FADE);
      if (sy[1] === 1) { aH = 1; posH = sy[2]; } else aH *= Math.exp(-dt / GUIDE_FADE);
    }

    function init(): void {
      if (ready) return;
      ready = true;
      rawR = root.clientWidth * 0.3;
      rawB = root.clientHeight * 0.42;
      resolve(0);
    }

    function userTakes(): void {
      stopDemo();
      dragging = false;
      init();
    }

    function script(now: number): void {
      const W = root.clientWidth;
      const H = root.clientHeight;
      const ph = now % 2000;
      const x0 = W * 0.3;
      const y0 = H * 0.42;
      const x1 = W * 0.88;
      const y1 = H * 0.9;
      let t = 0;
      if (ph >= 200 && ph < 1100) t = (ph - 200) / 900;
      else if (ph >= 1100) t = 1 - (ph - 1100) / 900;
      rawR = x0 + (x1 - x0) * t;
      rawB = y0 + (y1 - y0) * t;
      px = rawR - 8;
      py = rawB - 8;
      dragging = ph >= 200;
    }

    function snap(): void { init(); }

    function step(dt: number, now: number): void {
      init();
      if (demo) script(now);
      else if (dragging) {
        rawR = clamp(px + gx, GRID_STEP + MIN_SIDE, root.clientWidth);
        rawB = clamp(py + gy, GRID_STEP + MIN_SIDE, root.clientHeight);
      }
      resolve(dt);
    }

    function render(): void {
      box.style.transform = "translate(" + GRID_STEP + "px," + GRID_STEP + "px)";
      box.style.width = bw.toFixed(1) + "px";
      box.style.height = bh.toFixed(1) + "px";
      nb.style.width = nbWidth().toFixed(1) + "px";
      nb.style.height = nbHeight() + "px";
      nb.style.transform = "translate(" + nbLeft() + "px," + nbTop() + "px)";
      gv.style.opacity = aV.toFixed(2);
      gv.style.transform = "translateX(" + posV.toFixed(1) + "px)";
      gh.style.opacity = aH.toFixed(2);
      gh.style.transform = "translateY(" + posH.toFixed(1) + "px)";
      gapEl.textContent = String(Math.round(nbLeft() - (GRID_STEP + bw)));
      stepEl.textContent = String(GRID_STEP);
      cursor.style.transform = "translate(" + px.toFixed(1) + "px," + py.toFixed(1) + "px)";
    }

    on(grip, "pointerdown", (e: PointerEvent) => {
      userTakes();
      grip.setPointerCapture(e.pointerId);
      const p = pos(e);
      px = p.x;
      py = p.y;
      gx = GRID_STEP + bw - p.x;
      gy = GRID_STEP + bh - p.y;
      dragging = true;
    });
    on(grip, "pointermove", (e: PointerEvent) => {
      if (!dragging) return;
      const p = pos(e);
      px = p.x;
      py = p.y;
      rawR = clamp(px + gx, GRID_STEP + MIN_SIDE, root.clientWidth);
      rawB = clamp(py + gy, GRID_STEP + MIN_SIDE, root.clientHeight);
      if (reduce) resolve(0);
      sync();
    });
    on(grip, "pointerup", () => { dragging = false; });
    on(grip, "pointercancel", () => { dragging = false; });
    on(grip, "keydown", (e: KeyboardEvent) => {
      const k = e.key;
      if (k !== "ArrowLeft" && k !== "ArrowRight" && k !== "ArrowUp" && k !== "ArrowDown") return;
      e.preventDefault();
      userTakes();
      rawR = clamp(GRID_STEP + bw + (k === "ArrowRight" ? GRID_STEP : k === "ArrowLeft" ? -GRID_STEP : 0), GRID_STEP + MIN_SIDE, root.clientWidth);
      rawB = clamp(GRID_STEP + bh + (k === "ArrowDown" ? GRID_STEP : k === "ArrowUp" ? -GRID_STEP : 0), GRID_STEP + MIN_SIDE, root.clientHeight);
      resolve(0);
      sync();
    });

    function frame(ts: number): void {
      if (t0 < 0) {
        t0 = ts;
        last = ts;
      }
      const dt = Math.min(0.05, (ts - last) / 1000);
      last = ts;
      step(dt, ts - t0);
      render();
      raf = requestAnimationFrame(frame);
    }
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
    };

  }, []);

  return (
    <main className={styles["stage"]}>
      <div ref={rootRef} className={styles["rh"] + " is-demo"} data-demo="1">
        <i className={styles["rh__grid"]}></i>
        <i className={styles["rh__nb"]} data-r="nb"></i>
        <div className={styles["rh__box"]} data-r="box">
          <button className={styles["rh__grip"]} data-r="grip" type="button" aria-label="크기 조절 손잡이"></button>
        </div>
        <i className={styles["rh__gv"]} data-r="gv"></i>
        <i className={styles["rh__gh"]} data-r="gh"></i>
        <p className={styles["rh__meta"]}><span className={styles["rh__tag"]}>GAP</span> <b data-r="gap">0</b> <span className={styles["rh__tag"]}>STEP</span> <b data-r="step">0</b></p>
        <i className={styles["rh__cursor"]} data-r="cursor"></i>
      </div>
    </main>
  );
}
