// RatioLockHandles - vanilla 판(05-rh-ratio-lock-eight-handles) 의 React 포트. 같은 계산을 useEffect 안에서 돌린다.
import { useEffect, useRef } from "react";
import styles from "./RatioLockHandles.module.scss";

export default function RatioLockHandles() {
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

    // 기법: 잡은 손잡이의 반대쪽(앵커)을 고정하고, 모서리는 앵커에서 포인터까지의 벡터를
    // 비율 대각선 (ASPECT, 1) 위로 투영해 한 변 길이 s 하나로 가로·세로를 같이 정한다.
    const ASPECT = 4 / 3;
    const MIN_SIDE = 48;
    const img = q<HTMLElement>("[data-r=img]");
    const proj = q<HTMLElement>("[data-r=proj]");
    const cursor = q<HTMLElement>("[data-r=cursor]");
    const wEl = q<HTMLElement>("[data-r=w]");
    const hEl = q<HTMLElement>("[data-r=h]");
    const handles = Array.prototype.slice.call(root.querySelectorAll("[data-hx]")) as HTMLElement[];
    let x = 0;
    let y = 0;
    let w = 0;
    let h = 0;
    let px = 0;
    let py = 0;
    let active = -1;
    let gx = 0;
    let gy = 0;
    let ready = false;

    function reset(): void {
      const s = root.clientHeight * 0.4;
      w = s * ASPECT;
      h = s;
      x = root.clientWidth * 0.1;
      y = root.clientHeight * 0.14;
    }

    function init(): void {
      if (ready) return;
      ready = true;
      reset();
    }

    function hx(i: number): number { return Number(handles[i].getAttribute("data-hx")); }
    function hy(i: number): number { return Number(handles[i].getAttribute("data-hy")); }

    function resizeTo(i: number, qx: number, qy: number): void {
      const W = root.clientWidth;
      const H = root.clientHeight;
      const sx = hx(i);
      const sy = hy(i);
      const ax = sx > 0 ? x : sx < 0 ? x + w : x + w / 2;
      const ay = sy > 0 ? y : sy < 0 ? y + h : y + h / 2;
      if (sx !== 0 && sy !== 0) {
        const dx = (qx - ax) * sx;
        const dy = (qy - ay) * sy;
        const maxS = Math.min((sx > 0 ? W - ax : ax) / ASPECT, sy > 0 ? H - ay : ay);
        const s = clamp((dx * ASPECT + dy) / (ASPECT * ASPECT + 1), MIN_SIDE, maxS);
        w = s * ASPECT;
        h = s;
        x = sx > 0 ? ax : ax - w;
        y = sy > 0 ? ay : ay - h;
      } else if (sx !== 0) {
        const maxW = Math.min(sx > 0 ? W - ax : ax, 2 * Math.min(ay, H - ay) * ASPECT);
        w = clamp((qx - ax) * sx, MIN_SIDE * ASPECT, maxW);
        h = w / ASPECT;
        x = sx > 0 ? ax : ax - w;
        y = ay - h / 2;
      } else {
        const maxH = Math.min(sy > 0 ? H - ay : ay, (2 * Math.min(ax, W - ax)) / ASPECT);
        h = clamp((qy - ay) * sy, MIN_SIDE, maxH);
        w = h * ASPECT;
        x = ax - w / 2;
        y = sy > 0 ? ay : ay - h;
      }
    }

    function userTakes(): void {
      stopDemo();
      active = -1;
      init();
    }

    function handlePoint(i: number): number[] {
      return [x + ((hx(i) + 1) / 2) * w, y + ((hy(i) + 1) / 2) * h];
    }

    function leg(l: number, a: number, b: number, from: number[], to: number[]): number[] {
      const t = seg(l, a, b);
      return [from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t];
    }

    function script(now: number): void {
      const W = root.clientWidth;
      const H = root.clientHeight;
      const ph = now % 2000;
      const corner = ph < 1000;
      const l = ph % 1000;
      const i = corner ? 7 : 4;
      const s0 = H * 0.4;
      const p0 = [W * 0.1 + s0 * ASPECT, corner ? H * 0.14 + s0 : H * 0.14 + s0 / 2];
      const p1 = corner ? [W * 0.88, H * 0.62] : [W * 0.95, p0[1]];
      const p2 = corner ? [W * 0.46, H * 0.95] : [W * 0.5, p0[1]];
      let q = p0;
      if (l < 200) { reset(); active = -1; px = p0[0]; py = p0[1]; return; }
      if (l < 520) q = leg(l, 200, 520, p0, p1);
      else if (l < 640) q = p1;
      else if (l < 860) q = leg(l, 640, 860, p1, p2);
      else q = leg(l, 860, 1000, p2, p0);
      active = i;
      resizeTo(i, q[0], q[1]);
      px = q[0];
      py = q[1];
    }

    function snap(): void { init(); }

    function step(_dt: number, now: number): void {
      init();
      if (demo) script(now);
    }

    function render(): void {
      img.style.transform = "translate(" + x.toFixed(1) + "px," + y.toFixed(1) + "px)";
      img.style.width = w.toFixed(1) + "px";
      img.style.height = h.toFixed(1) + "px";
      for (let i = 0; i < handles.length; i += 1) {
        const p = handlePoint(i);
        handles[i].style.transform = "translate(" + (p[0] - 14).toFixed(1) + "px," + (p[1] - 14).toFixed(1) + "px)";
      }
      if (active >= 0 && hx(active) !== 0 && hy(active) !== 0) {
        const c = handlePoint(active);
        const dx = px - c[0];
        const dy = py - c[1];
        proj.style.opacity = "1";
        proj.style.width = Math.hypot(dx, dy).toFixed(1) + "px";
        proj.style.transform = "translate(" + c[0].toFixed(1) + "px," + c[1].toFixed(1) + "px) rotate(" + Math.atan2(dy, dx).toFixed(3) + "rad)";
      } else {
        proj.style.opacity = "0";
      }
      wEl.textContent = String(Math.round(w));
      hEl.textContent = String(Math.round(h));
      cursor.style.transform = "translate(" + px.toFixed(1) + "px," + py.toFixed(1) + "px)";
    }

    handles.forEach((el, i) => {
      on(el, "pointerdown", (e: PointerEvent) => {
        userTakes();
        el.setPointerCapture(e.pointerId);
        const p = pos(e);
        const c = handlePoint(i);
        gx = c[0] - p.x;
        gy = c[1] - p.y;
        px = p.x;
        py = p.y;
        active = i;
      });
      on(el, "pointermove", (e: PointerEvent) => {
        if (active !== i) return;
        const p = pos(e);
        px = p.x;
        py = p.y;
        resizeTo(i, px + gx, py + gy);
        sync();
      });
      on(el, "pointerup", () => { active = -1; sync(); });
      on(el, "pointercancel", () => { active = -1; sync(); });
      on(el, "keydown", (e: KeyboardEvent) => {
        const k = e.key;
        if (k !== "ArrowLeft" && k !== "ArrowRight" && k !== "ArrowUp" && k !== "ArrowDown") return;
        e.preventDefault();
        userTakes();
        const c = handlePoint(i);
        px = c[0] + (k === "ArrowRight" ? 8 : k === "ArrowLeft" ? -8 : 0);
        py = c[1] + (k === "ArrowDown" ? 8 : k === "ArrowUp" ? -8 : 0);
        resizeTo(i, px, py);
        sync();
      });
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
        <div className={styles["rh__img"]} data-r="img"><i className={styles["rh__sun"]}></i><i className={styles["rh__hill"]}></i></div>
        <i className={styles["rh__proj"]} data-r="proj"></i>
        <button className={styles["rh__h"]} data-hx="-1" data-hy="-1" type="button" aria-label="크기 조절 손잡이"></button>
        <button className={styles["rh__h"]} data-hx="0" data-hy="-1" type="button" aria-label="크기 조절 손잡이"></button>
        <button className={styles["rh__h"]} data-hx="1" data-hy="-1" type="button" aria-label="크기 조절 손잡이"></button>
        <button className={styles["rh__h"]} data-hx="-1" data-hy="0" type="button" aria-label="크기 조절 손잡이"></button>
        <button className={styles["rh__h"]} data-hx="1" data-hy="0" type="button" aria-label="크기 조절 손잡이"></button>
        <button className={styles["rh__h"]} data-hx="-1" data-hy="1" type="button" aria-label="크기 조절 손잡이"></button>
        <button className={styles["rh__h"]} data-hx="0" data-hy="1" type="button" aria-label="크기 조절 손잡이"></button>
        <button className={styles["rh__h"]} data-hx="1" data-hy="1" type="button" aria-label="크기 조절 손잡이"></button>
        <p className={styles["rh__meta"]}><span className={styles["rh__tag"]}>4:3</span> <span className={styles["rh__tag"]}>W</span> <b data-r="w">0</b> <span className={styles["rh__tag"]}>H</span> <b data-r="h">0</b></p>
        <i className={styles["rh__cursor"]} data-r="cursor"></i>
      </div>
    </main>
  );
}
