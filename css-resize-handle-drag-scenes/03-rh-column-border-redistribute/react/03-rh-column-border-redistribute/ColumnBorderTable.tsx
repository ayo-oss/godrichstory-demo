// ColumnBorderTable - vanilla 판(03-rh-column-border-redistribute) 의 React 포트. 같은 계산을 useEffect 안에서 돌린다.
import { useEffect, useRef } from "react";
import styles from "./ColumnBorderTable.module.scss";

export default function ColumnBorderTable() {
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

    // 기법: 경계를 옮긴 만큼 이웃 열이 같은 양을 잃고, 이웃이 최소 폭(COL_MIN)에 닿으면 경계가 거기서 멈춘다.
    // 세 열의 합은 항상 표 너비와 같고, 잘린 글자는 CSS text-overflow 가 말줄임으로 처리한다.
    const COL_MIN = 56;
    const FOLLOW = 18;
    const tbl = q<HTMLElement>("[data-r=tbl]");
    const bar0 = q<HTMLElement>("[data-r=bar0]");
    const bar1 = q<HTMLElement>("[data-r=bar1]");
    const cursor = q<HTMLElement>("[data-r=cursor]");
    const aEl = q<HTMLElement>("[data-r=a]");
    const bEl = q<HTMLElement>("[data-r=b]");
    const cEl = q<HTMLElement>("[data-r=c]");
    let ready = false;
    let t0w = 0;
    let t1w = 0;
    let d0 = 0;
    let d1 = 0;
    let px = 0;
    let py = 0;
    let gx = 0;
    let drag = -1;

    function total(): number { return root.clientWidth; }

    function init(): void {
      if (ready) return;
      ready = true;
      t0w = d0 = total() * 0.34;
      t1w = d1 = total() * 0.67;
    }

    function userTakes(): void {
      stopDemo();
      drag = -1;
      init();
    }

    function moveBorder(i: number, want: number): void {
      const T = total();
      if (i === 0) t0w = clamp(want, COL_MIN, t1w - COL_MIN);
      else t1w = clamp(want, t0w + COL_MIN, T - COL_MIN);
    }

    function script(now: number): void {
      const T = total();
      const ph = now % 2000;
      const s0 = T * 0.34;
      const s1 = T * 0.67;
      px = s0;
      drag = -1;
      if (ph >= 200 && ph < 700) { px = s0 + (T * 0.76 - s0) * seg(ph, 200, 700); drag = 0; }
      else if (ph >= 700 && ph < 800) { px = T * 0.76; drag = 0; }
      else if (ph >= 800 && ph < 1250) { px = s1 + (T * 0.94 - s1) * seg(ph, 800, 1250); drag = 1; }
      else if (ph >= 1250 && ph < 1350) { px = T * 0.94; drag = 1; }
      else if (ph >= 1350) { px = T * 0.94 + (s1 - T * 0.94) * seg(ph, 1350, 1700); drag = 1; }
      if (ph >= 1700) { px = s1; drag = ph < 1760 ? 1 : -1; }
      gx = 0;
      py = root.clientHeight * 0.55;
      if (ph >= 1760) { t0w = s0; t1w = s1; }
      if (drag >= 0) moveBorder(drag, px);
    }

    function snap(): void {
      init();
      d0 = t0w;
      d1 = t1w;
    }

    function step(dt: number, now: number): void {
      init();
      if (demo) script(now);
      else if (drag >= 0) moveBorder(drag, px + gx);
      const k = 1 - Math.exp(-FOLLOW * dt);
      d0 += (t0w - d0) * k;
      d1 += (t1w - d1) * k;
    }

    function render(): void {
      const T = total();
      tbl.style.gridTemplateColumns = d0.toFixed(1) + "px " + (d1 - d0).toFixed(1) + "px " + (T - d1).toFixed(1) + "px";
      bar0.style.transform = "translateX(" + (d0 - 8).toFixed(1) + "px)";
      bar1.style.transform = "translateX(" + (d1 - 8).toFixed(1) + "px)";
      aEl.textContent = String(Math.round(d0));
      bEl.textContent = String(Math.round(d1 - d0));
      cEl.textContent = String(Math.round(T - d1));
      cursor.style.transform = "translate(" + px.toFixed(1) + "px," + py.toFixed(1) + "px)";
    }

    function bind(el: HTMLElement, i: number): void {
      on(el, "pointerdown", (e: PointerEvent) => {
        userTakes();
        el.setPointerCapture(e.pointerId);
        const p = pos(e);
        px = p.x;
        py = p.y;
        gx = (i === 0 ? d0 : d1) - p.x;
        drag = i;
      });
      on(el, "pointermove", (e: PointerEvent) => {
        if (drag !== i) return;
        px = pos(e).x;
        moveBorder(i, px + gx);
        sync();
      });
      on(el, "pointerup", () => { drag = -1; });
      on(el, "pointercancel", () => { drag = -1; });
      on(el, "keydown", (e: KeyboardEvent) => {
        if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
        e.preventDefault();
        userTakes();
        moveBorder(i, (i === 0 ? t0w : t1w) + (e.key === "ArrowRight" ? 12 : -12));
        sync();
      });
    }
    bind(bar0, 0);
    bind(bar1, 1);

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
        <div className={styles["rh__tbl"]} data-r="tbl">
          <span className={styles["rh__th"]}>NAME</span><span className={styles["rh__th"]}>SIZE</span><span className={styles["rh__th"]}>MODIFIED</span>
          <span className={styles["rh__td"]}>quarterly-report-final.pdf</span><span className={styles["rh__td"]}>2.4 MB</span><span className={styles["rh__td"]}>2026-09-30 18:22</span>
          <span className={styles["rh__td"]}>invoice-0412-signed.png</span><span className={styles["rh__td"]}>812 KB</span><span className={styles["rh__td"]}>2026-09-28 09:05</span>
          <span className={styles["rh__td"]}>team-photo-offsite.jpg</span><span className={styles["rh__td"]}>5.1 MB</span><span className={styles["rh__td"]}>2026-09-21 14:40</span>
          <span className={styles["rh__td"]}>roadmap-draft-v3.md</span><span className={styles["rh__td"]}>18 KB</span><span className={styles["rh__td"]}>2026-09-19 11:12</span>
        </div>
        <button className={styles["rh__bar"]} data-r="bar0" type="button" aria-label="크기 조절 손잡이"></button>
        <button className={styles["rh__bar"]} data-r="bar1" type="button" aria-label="크기 조절 손잡이"></button>
        <p className={styles["rh__meta"]}><span className={styles["rh__tag"]}>A</span> <b data-r="a">0</b> <span className={styles["rh__tag"]}>B</span> <b data-r="b">0</b> <span className={styles["rh__tag"]}>C</span> <b data-r="c">0</b></p>
        <i className={styles["rh__cursor"]} data-r="cursor"></i>
      </div>
    </main>
  );
}
