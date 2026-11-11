// SpringCornerGrip - vanilla 판(01-rh-spring-corner-grip) 의 React 포트. 같은 계산을 useEffect 안에서 돌린다.
import { useEffect, useRef } from "react";
import styles from "./SpringCornerGrip.module.scss";

export default function SpringCornerGrip() {
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

    // 기법: 포인터는 목표 크기(tw, th)만 정한다. 실제 크기는 속도를 가진 채 스프링 방정식으로 목표를 쫓는다.
    // 감쇠를 비율(DAMPING 0.5)로 두면 강성을 바꿔도 넘침 비율이 같고 쫓는 속도만 달라진다.
    const STIFFNESS = 170;
    const DAMPING = 0.5;
    const MIN_W = 96;
    const MIN_H = 72;
    const panel = q<HTMLElement>("[data-r=panel]");
    const grip = q<HTMLElement>("[data-r=grip]");
    const cursor = q<HTMLElement>("[data-r=cursor]");
    const wEl = q<HTMLElement>("[data-r=w]");
    const hEl = q<HTMLElement>("[data-r=h]");
    let w = 0;
    let h = 0;
    let vw = 0;
    let vh = 0;
    let tw = 0;
    let th = 0;
    let px = 0;
    let py = 0;
    let gx = 0;
    let gy = 0;
    let dragging = false;
    let ready = false;

    function init(): void {
      if (ready) return;
      ready = true;
      tw = w = root.clientWidth * 0.42;
      th = h = root.clientHeight * 0.45;
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
      const ax = W * 0.42 - 10;
      const ay = H * 0.45 - 10;
      const bx = W * 0.96 - 10;
      const by = H * 0.94 - 10;
      const cx = W * 0.62 - 10;
      const cy = H * 0.62 - 10;
      let t = 0;
      let fx = ax;
      let fy = ay;
      let tx = ax;
      let ty = ay;
      if (ph >= 200 && ph < 760) { t = seg(ph, 200, 760); tx = bx; ty = by; }
      else if (ph >= 760 && ph < 1000) { fx = bx; fy = by; tx = bx; ty = by; }
      else if (ph >= 1000 && ph < 1500) { t = seg(ph, 1000, 1500); fx = bx; fy = by; tx = cx; ty = cy; }
      else if (ph >= 1500) { t = seg(ph, 1500, 1960); fx = cx; fy = cy; tx = ax; ty = ay; }
      px = fx + (tx - fx) * t;
      py = fy + (ty - fy) * t;
      gx = 10;
      gy = 10;
      dragging = ph >= 200 && ph < 1960;
    }

    function snap(): void {
      init();
      w = tw;
      h = th;
      vw = 0;
      vh = 0;
    }

    function step(dt: number, now: number): void {
      init();
      if (demo) script(now);
      if (dragging) {
        tw = clamp(px + gx, MIN_W, root.clientWidth);
        th = clamp(py + gy, MIN_H, root.clientHeight);
      }
      const c = 2 * DAMPING * Math.sqrt(STIFFNESS);
      const a = spring(w, vw, tw, STIFFNESS, c, dt);
      const b = spring(h, vh, th, STIFFNESS, c, dt);
      w = a[0];
      vw = a[1];
      h = b[0];
      vh = b[1];
    }

    function render(): void {
      const lift = clamp(Math.hypot(vw, vh) / 700, 0, 1);
      panel.style.width = w.toFixed(1) + "px";
      panel.style.height = h.toFixed(1) + "px";
      panel.style.setProperty("--lift", lift.toFixed(3));
      wEl.textContent = String(Math.round(w));
      hEl.textContent = String(Math.round(h));
      cursor.style.transform = "translate(" + px.toFixed(1) + "px," + py.toFixed(1) + "px)";
    }

    on(grip, "pointerdown", (e: PointerEvent) => {
      userTakes();
      grip.setPointerCapture(e.pointerId);
      const p = pos(e);
      px = p.x;
      py = p.y;
      gx = w - p.x;
      gy = h - p.y;
      dragging = true;
    });
    on(grip, "pointermove", (e: PointerEvent) => {
      if (!dragging) return;
      const p = pos(e);
      px = p.x;
      py = p.y;
      tw = clamp(px + gx, MIN_W, root.clientWidth);
      th = clamp(py + gy, MIN_H, root.clientHeight);
      sync();
    });
    on(grip, "pointerup", () => { dragging = false; });
    on(grip, "pointercancel", () => { dragging = false; });
    on(grip, "keydown", (e: KeyboardEvent) => {
      const k = e.key;
      if (k !== "ArrowLeft" && k !== "ArrowRight" && k !== "ArrowUp" && k !== "ArrowDown") return;
      e.preventDefault();
      userTakes();
      tw = clamp(tw + (k === "ArrowRight" ? 16 : k === "ArrowLeft" ? -16 : 0), MIN_W, root.clientWidth);
      th = clamp(th + (k === "ArrowDown" ? 16 : k === "ArrowUp" ? -16 : 0), MIN_H, root.clientHeight);
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
          <p className={styles["rh__meta"]}><span className={styles["rh__tag"]}>W</span> <b data-r="w">0</b> <span className={styles["rh__tag"]}>H</span> <b data-r="h">0</b></p>
          <button className={styles["rh__grip"]} data-r="grip" type="button" aria-label="크기 조절 손잡이"></button>
        </div>
        <i className={styles["rh__cursor"]} data-r="cursor"></i>
      </div>
    </main>
  );
}
