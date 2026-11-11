// RubberBandLimit - vanilla 판(06-rh-rubber-band-limit) 의 React 포트. 같은 계산을 useEffect 안에서 돌린다.
import { useEffect, useRef } from "react";
import styles from "./RubberBandLimit.module.scss";

export default function RubberBandLimit() {
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

    // 기법: 한계(MAX_RATIO) 넘은 만큼을 제곱근으로 눌러 저항을 만든다 - 더 끌수록 같은 거리에서 덜 늘어난다.
    // 놓으면 목표는 한계선이고, 감쇠비 0.35 의 스프링이 한계선을 지나쳤다 돌아오며 진동한다.
    const MAX_RATIO = 0.64;
    const RESIST = 5;
    const SPRING_BACK = 16;
    const MIN_W = 56;
    const panel = q<HTMLElement>("[data-r=panel]");
    const grip = q<HTMLElement>("[data-r=grip]");
    const limit = q<HTMLElement>("[data-r=limit]");
    const maxEl = q<HTMLElement>("[data-r=max]");
    const overEl = q<HTMLElement>("[data-r=over]");
    const cursor = q<HTMLElement>("[data-r=cursor]");
    let w = 0;
    let vw = 0;
    let target = 0;
    let raw = 0;
    let px = 0;
    let py = 0;
    let gx = 0;
    let grabW = 0;
    let dragging = false;
    let ready = false;

    function maxW(): number { return root.clientWidth * MAX_RATIO; }

    function stretch(r: number): number {
      const m = maxW();
      return r <= m ? r : m + RESIST * Math.sqrt(r - m);
    }

    function init(): void {
      if (ready) return;
      ready = true;
      target = raw = w = root.clientWidth * 0.4;
    }

    function release(): void {
      if (!dragging) return;
      dragging = false;
      target = Math.min(raw, maxW());
    }

    function userTakes(): void {
      stopDemo();
      dragging = false;
      init();
    }

    function script(now: number): void {
      const W = root.clientWidth;
      const ph = now % 2000;
      const was = dragging;
      const r0 = W * 0.4;
      dragging = false;
      if (ph >= 200 && ph < 1000) {
        dragging = true;
        raw = r0 + (W - r0) * seg(ph, 200, 700);
      } else if (ph >= 1400 && ph < 1960) {
        dragging = true;
        if (!was) grabW = w;
        raw = grabW + (r0 - grabW) * seg(ph, 1400, 1960);
      }
      if (was && !dragging) { dragging = true; release(); }
      px = (dragging ? raw : w) - 8;
      py = root.clientHeight * 0.5;
      gx = 8;
    }

    function snap(): void {
      init();
      w = target;
      vw = 0;
    }

    function step(dt: number, now: number): void {
      init();
      if (demo) script(now);
      if (dragging) {
        if (!demo) raw = clamp(px + gx, MIN_W, root.clientWidth);
        target = clamp(stretch(raw), MIN_W, root.clientWidth);
        const a = spring(w, vw, target, 1600, 80, dt);
        w = a[0];
        vw = a[1];
      } else {
        const a = spring(w, vw, target, SPRING_BACK * SPRING_BACK, 2 * 0.35 * SPRING_BACK, dt);
        w = a[0];
        vw = a[1];
      }
    }

    function render(): void {
      const m = maxW();
      const over = Math.max(0, w - m);
      const span = Math.max(1, RESIST * Math.sqrt(Math.max(1, root.clientWidth - m)));
      panel.style.width = w.toFixed(1) + "px";
      panel.style.setProperty("--over", clamp(over / span, 0, 1).toFixed(3));
      limit.style.transform = "translateX(" + m.toFixed(1) + "px)";
      maxEl.textContent = String(Math.round(m));
      overEl.textContent = String(Math.round(over));
      cursor.style.transform = "translate(" + px.toFixed(1) + "px," + py.toFixed(1) + "px)";
    }

    on(grip, "pointerdown", (e: PointerEvent) => {
      userTakes();
      grip.setPointerCapture(e.pointerId);
      const p = pos(e);
      px = p.x;
      py = p.y;
      gx = w - p.x;
      raw = w;
      dragging = true;
    });
    on(grip, "pointermove", (e: PointerEvent) => {
      if (!dragging) return;
      px = pos(e).x;
      raw = clamp(px + gx, MIN_W, root.clientWidth);
      if (reduce) { target = clamp(Math.min(stretch(raw), maxW()), MIN_W, root.clientWidth); sync(); }
    });
    on(grip, "pointerup", release);
    on(grip, "pointercancel", release);
    on(grip, "keydown", (e: KeyboardEvent) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      e.preventDefault();
      userTakes();
      target = clamp(target + (e.key === "ArrowRight" ? 16 : -16), MIN_W, maxW());
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
        <div className={styles["rh__panel"]} data-r="panel">
          <i className={styles["rh__stripe"]}></i>
          <button className={styles["rh__grip"]} data-r="grip" type="button" aria-label="크기 조절 손잡이"></button>
        </div>
        <i className={styles["rh__limit"]} data-r="limit"></i>
        <p className={styles["rh__meta"]}><span className={styles["rh__tag"]}>MAX</span> <b data-r="max">0</b> <span className={styles["rh__tag"]}>OVER</span> <b data-r="over">0</b></p>
        <i className={styles["rh__cursor"]} data-r="cursor"></i>
      </div>
    </main>
  );
}
