// ContainerReflowReadout - vanilla 판(07-rh-container-reflow-readout) 의 React 포트. 같은 계산을 useEffect 안에서 돌린다.
import { useEffect, useRef } from "react";
import styles from "./ContainerReflowReadout.module.scss";

export default function ContainerReflowReadout() {
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

    // 기법: 상자 너비 하나(cw)를 JS 가 끌고, 안쪽 배치는 CSS @container 가 너비 구간으로 바꾼다.
    // 구간 이름은 JS 가 같은 경계값(BREAK_A, BREAK_B)으로 읽어 화면 밑에 적는다.
    const BREAK_A = 150;
    const BREAK_B = 250;
    const RANGE_LABEL = ["STACK", "ROW", "GRID"];
    const MIN_W = 96;
    const FOLLOW = 16;
    const box = q<HTMLElement>("[data-r=box]");
    const grip = q<HTMLElement>("[data-r=grip]");
    const wEl = q<HTMLElement>("[data-r=w]");
    const rangeEl = q<HTMLElement>("[data-r=range]");
    const cursor = q<HTMLElement>("[data-r=cursor]");
    let cw = 0;
    let tw = 0;
    let px = 0;
    let py = 0;
    let gx = 0;
    let dragging = false;
    let ready = false;

    function maxW(): number { return root.clientWidth - 8; }

    function init(): void {
      if (ready) return;
      ready = true;
      tw = cw = root.clientWidth * 0.34;
    }

    function rangeOf(width: number): number { return width < BREAK_A ? 0 : width < BREAK_B ? 1 : 2; }

    function userTakes(): void {
      stopDemo();
      dragging = false;
      init();
    }

    function script(now: number): void {
      const W = root.clientWidth;
      const ph = now % 2000;
      const a = W * 0.34;
      const b = maxW();
      let x = a;
      if (ph >= 200 && ph < 760) x = a + (b - a) * seg(ph, 200, 760);
      else if (ph >= 760 && ph < 1100) x = b;
      else if (ph >= 1100 && ph < 1800) x = b + (a - b) * seg(ph, 1100, 1800);
      dragging = true;
      px = x - 4;
      py = root.clientHeight * 0.45;
      gx = 4;
    }

    function snap(): void {
      init();
      cw = tw;
    }

    function step(dt: number, now: number): void {
      init();
      if (demo) script(now);
      if (dragging) tw = clamp(px + gx, MIN_W, maxW());
      cw += (tw - cw) * (1 - Math.exp(-FOLLOW * dt));
    }

    function render(): void {
      box.style.width = cw.toFixed(1) + "px";
      wEl.textContent = String(Math.round(cw));
      rangeEl.textContent = RANGE_LABEL[rangeOf(cw)];
      cursor.style.transform = "translate(" + px.toFixed(1) + "px," + py.toFixed(1) + "px)";
    }

    on(grip, "pointerdown", (e: PointerEvent) => {
      userTakes();
      grip.setPointerCapture(e.pointerId);
      const p = pos(e);
      px = p.x;
      py = p.y;
      gx = cw - p.x;
      dragging = true;
    });
    on(grip, "pointermove", (e: PointerEvent) => {
      if (!dragging) return;
      px = pos(e).x;
      tw = clamp(px + gx, MIN_W, maxW());
      sync();
    });
    on(grip, "pointerup", () => { dragging = false; });
    on(grip, "pointercancel", () => { dragging = false; });
    on(grip, "keydown", (e: KeyboardEvent) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      e.preventDefault();
      userTakes();
      tw = clamp(tw + (e.key === "ArrowRight" ? 16 : -16), MIN_W, maxW());
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
          <div className={styles["rh__cards"]}>
            <div className={styles["rh__card"]}><i></i><span><b></b><b></b></span></div>
            <div className={styles["rh__card"]}><i></i><span><b></b><b></b></span></div>
            <div className={styles["rh__card"]}><i></i><span><b></b><b></b></span></div>
          </div>
          <button className={styles["rh__grip"]} data-r="grip" type="button" aria-label="크기 조절 손잡이"></button>
        </div>
        <p className={styles["rh__meta"]}><span className={styles["rh__tag"]}>W</span> <b data-r="w">0</b> <span className={styles["rh__tag"]}>RANGE</span> <b data-r="range">STACK</b></p>
        <i className={styles["rh__cursor"]} data-r="cursor"></i>
      </div>
    </main>
  );
}
