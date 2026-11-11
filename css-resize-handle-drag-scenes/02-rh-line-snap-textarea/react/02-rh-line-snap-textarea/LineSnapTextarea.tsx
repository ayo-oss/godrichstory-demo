// LineSnapTextarea - vanilla 판(02-rh-line-snap-textarea) 의 React 포트. 같은 계산을 useEffect 안에서 돌린다.
import { useEffect, useRef } from "react";
import styles from "./LineSnapTextarea.module.scss";

export default function LineSnapTextarea() {
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

    // 기법: 끄는 높이(raw)를 줄 높이로 나눠 가장 가까운 줄 수로 반올림하고, 상자는 그 높이까지 지수 감쇠로 끌려간다.
    // 점선은 손이 실제로 있는 높이, 상자는 줄에 맞춘 높이 - 둘의 차이가 계산이다.
    const LINE_H = 28;
    const PAD = 8;
    const ROUND_ROWS = 1;
    const EASE_TO = 14;
    const box = q<HTMLElement>("[data-r=box]");
    const grip = q<HTMLElement>("[data-r=grip]");
    const raw = q<HTMLElement>("[data-r=raw]");
    const rowsEl = q<HTMLElement>("[data-r=rows]");
    const cursor = q<HTMLElement>("[data-r=cursor]");
    let h = 0;
    let rawH = 0;
    let rows = 3;
    let px = 0;
    let py = 0;
    let gy = 0;
    let dragging = false;
    let ready = false;
    root.style.setProperty("--lh", LINE_H + "px");

    function maxRows(): number {
      return Math.max(2, Math.floor((root.clientHeight - 2 * PAD - 12) / LINE_H));
    }

    function rowsFor(height: number): number {
      const r = Math.round((height - 2 * PAD) / LINE_H / ROUND_ROWS) * ROUND_ROWS;
      return clamp(r, 1, maxRows());
    }

    function init(): void {
      if (ready) return;
      ready = true;
      rows = Math.max(2, Math.round(maxRows() * 0.3));
      h = rawH = rows * LINE_H + 2 * PAD;
    }

    function userTakes(): void {
      stopDemo();
      dragging = false;
      init();
    }

    function script(now: number): void {
      const ph = now % 2000;
      const lo = rows0() * LINE_H + 2 * PAD - 0.4 * LINE_H;
      const hi = maxRows() * LINE_H + 2 * PAD;
      const mid = Math.round(maxRows() * 0.5) * LINE_H + 2 * PAD + 0.45 * LINE_H;
      let y = lo;
      if (ph >= 200 && ph < 900) y = lo + (hi - lo) * seg(ph, 200, 900);
      else if (ph >= 900 && ph < 1100) y = hi;
      else if (ph >= 1100 && ph < 1800) y = hi + (mid - hi) * seg(ph, 1100, 1800);
      else if (ph >= 1800) y = mid + (lo - mid) * seg(ph, 1800, 2000);
      py = y - 4;
      gy = 4;
      dragging = ph >= 200;
    }

    function rows0(): number {
      return Math.max(2, Math.round(maxRows() * 0.3));
    }

    function snap(): void {
      init();
      h = rows * LINE_H + 2 * PAD;
    }

    function step(dt: number, now: number): void {
      init();
      if (demo) script(now);
      if (dragging) {
        rawH = clamp(py + gy, LINE_H + 2 * PAD, root.clientHeight - 12);
        rows = rowsFor(rawH);
      }
      h += (rows * LINE_H + 2 * PAD - h) * (1 - Math.exp(-EASE_TO * dt));
    }

    function render(): void {
      box.style.height = h.toFixed(1) + "px";
      raw.style.transform = "translateY(" + rawH.toFixed(1) + "px)";
      rowsEl.textContent = String(rows);
      cursor.style.transform = "translate(" + (root.clientWidth * 0.5 - 32).toFixed(1) + "px," + py.toFixed(1) + "px)";
    }

    on(grip, "pointerdown", (e: PointerEvent) => {
      userTakes();
      grip.setPointerCapture(e.pointerId);
      const p = pos(e);
      py = p.y;
      gy = h - p.y;
      dragging = true;
    });
    on(grip, "pointermove", (e: PointerEvent) => {
      if (!dragging) return;
      py = pos(e).y;
      rawH = clamp(py + gy, LINE_H + 2 * PAD, root.clientHeight - 12);
      rows = rowsFor(rawH);
      sync();
    });
    on(grip, "pointerup", () => { dragging = false; });
    on(grip, "pointercancel", () => { dragging = false; });
    on(grip, "keydown", (e: KeyboardEvent) => {
      if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
      e.preventDefault();
      userTakes();
      rows = clamp(rows + (e.key === "ArrowDown" ? 1 : -1), 1, maxRows());
      rawH = rows * LINE_H + 2 * PAD;
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
        <div className={styles["rh__box"]} data-r="box">
          <div className={styles["rh__lines"]}>
            <i className={styles["rh__ln"]}></i><i className={styles["rh__ln"]}></i><i className={styles["rh__ln"]}></i><i className={styles["rh__ln"]}></i><i className={styles["rh__ln"]}></i><i className={styles["rh__ln"]}></i><i className={styles["rh__ln"]}></i><i className={styles["rh__ln"]}></i>
          </div>
          <button className={styles["rh__grip"]} data-r="grip" type="button" aria-label="크기 조절 손잡이"></button>
        </div>
        <i className={styles["rh__raw"]} data-r="raw"></i>
        <p className={styles["rh__rows"]}><b data-r="rows">0</b><span className={styles["rh__tag"]}>ROWS</span></p>
        <i className={styles["rh__cursor"]} data-r="cursor"></i>
      </div>
    </main>
  );
}
